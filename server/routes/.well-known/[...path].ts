// Handle OAuth discovery requests from mcp-remote
// We don't use OAuth, so return 404 cleanly without hitting Vue Router
export default defineEventHandler(() => {
  throw createError({ statusCode: 404, message: 'Not found' })
})
