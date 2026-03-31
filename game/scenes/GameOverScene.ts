import Phaser from 'phaser'
import type { Fighter } from '~/game/entities/Fighter'

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOver' })
  }

  init(data: { winner: Fighter; loser: Fighter }) {
    this.data.set('winner', data.winner)
    this.data.set('loser', data.loser)
  }

  create() {
    const winner = this.data.get('winner') as Fighter
    const loser = this.data.get('loser') as Fighter
    const w = this.cameras.main.width
    const h = this.cameras.main.height

    // Dark overlay
    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7)

    // Title
    const titleText = this.add.text(w / 2, h / 2 - 80, 'VICTORIA', {
      fontFamily: '"Press Start 2P"',
      fontSize: '32px',
      color: '#00ff88',
    }).setOrigin(0.5).setAlpha(0)

    // Winner name
    const winnerText = this.add.text(w / 2, h / 2 - 20, winner.name.toUpperCase(), {
      fontFamily: '"Press Start 2P"',
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0)

    // VS result
    const resultText = this.add.text(w / 2, h / 2 + 20, `derrotó a ${loser.name}`, {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#888',
    }).setOrigin(0.5).setAlpha(0)

    // Buttons
    const replayBtn = this.add.text(w / 2 - 100, h / 2 + 80, '[ REVANCHA ]', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#00ff88',
    }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true })

    const lobbyBtn = this.add.text(w / 2 + 100, h / 2 + 80, '[ LOBBY ]', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#4488ff',
    }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true })

    // Animations
    this.tweens.add({ targets: titleText, alpha: 1, y: h / 2 - 90, duration: 500, ease: 'Back.easeOut' })
    this.tweens.add({ targets: winnerText, alpha: 1, delay: 300, duration: 400 })
    this.tweens.add({ targets: resultText, alpha: 1, delay: 500, duration: 400 })
    this.tweens.add({ targets: [replayBtn, lobbyBtn], alpha: 1, delay: 800, duration: 400 })

    // Events
    replayBtn.on('pointerdown', () => {
      this.scene.start('Arena')
    })

    replayBtn.on('pointerover', () => replayBtn.setColor('#ffffff'))
    replayBtn.on('pointerout', () => replayBtn.setColor('#00ff88'))

    lobbyBtn.on('pointerdown', () => {
      this.game.destroy(true)
      window.location.href = '/lobby'
    })

    lobbyBtn.on('pointerover', () => lobbyBtn.setColor('#ffffff'))
    lobbyBtn.on('pointerout', () => lobbyBtn.setColor('#4488ff'))
  }
}
