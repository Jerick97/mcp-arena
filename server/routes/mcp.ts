import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createMcpServer, setBaseUrl } from '~/server/mcp/mcpServer'
import { randomUUID } from 'crypto'

// Store transports by session ID
const sessions = new Map<string, { transport: StreamableHTTPServerTransport; server: ReturnType<typeof createMcpServer> }>()

export default defineEventHandler(async (event) => {
  const req = event.node.req
  const res = event.node.res

  // Capture base URL
  const proto = req.headers['x-forwarded-proto'] || 'http'
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000'
  setBaseUrl(`${proto}://${host}`)

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id')
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const sessionId = req.headers['mcp-session-id'] as string | undefined

  if (req.method === 'GET') {
    if (sessionId && sessions.has(sessionId)) {
      await sessions.get(sessionId)!.transport.handleRequest(req, res)
    } else {
      // 404 tells the client the session is gone and it should re-initialize
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Session not found' }))
    }
    return
  }

  if (req.method === 'DELETE') {
    if (sessionId && sessions.has(sessionId)) {
      const entry = sessions.get(sessionId)!
      await entry.transport.close()
      await entry.server.close()
      sessions.delete(sessionId)
    }
    res.writeHead(200)
    res.end()
    return
  }

  if (req.method === 'POST') {
    const rawBody = await readRawBody(event, 'utf8')
    let body: any
    try {
      body = rawBody ? JSON.parse(rawBody) : undefined
    } catch {
      body = undefined
    }

    // Existing valid session - forward request
    if (sessionId && sessions.has(sessionId)) {
      await sessions.get(sessionId)!.transport.handleRequest(req, res, body)
      return
    }

    // Check if this is an initialize request
    const isInit = Array.isArray(body)
      ? body.some((m: any) => m.method === 'initialize')
      : body?.method === 'initialize'

    if (isInit) {
      // Create new session
      const newId = randomUUID()
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newId,
      })

      const mcpServer = createMcpServer()
      sessions.set(newId, { transport, server: mcpServer })

      transport.onclose = () => {
        sessions.delete(newId)
      }

      await mcpServer.connect(transport)
      await transport.handleRequest(req, res, body)
      return
    }

    // Non-initialize request with invalid/missing session
    // Create a fresh session transparently instead of returning error
    const newId = randomUUID()
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => newId,
    })

    const mcpServer = createMcpServer()
    sessions.set(newId, { transport, server: mcpServer })

    transport.onclose = () => {
      sessions.delete(newId)
    }

    await mcpServer.connect(transport)

    // We need to initialize first, then handle the actual request
    // Return 404 to tell the client to re-initialize properly
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Session expired. Please re-initialize.' },
      id: Array.isArray(body) ? body[0]?.id : body?.id || null,
    }))
    // Clean up the unused session
    sessions.delete(newId)
    await transport.close()
    await mcpServer.close()
    return
  }

  res.writeHead(405)
  res.end()
})
