import Phaser from 'phaser';
import { TILE_SIZE } from '../map/campusLayout';

const T = TILE_SIZE;

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // Try to load pixel-agents character sprites
    this.load.on('loaderror', (_file: Phaser.Loader.File) => {
      // silently fall back to procedural player texture
    });
    this.load.spritesheet('char', 'assets/characters/char_0.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
  }

  create(): void {
    this.makeTileTextures();
    this.makePlayerTexture();
    this.makeSignTexture();

    // Progress bar / loading text
    const { width, height } = this.scale;
    const text = this.add
      .text(width / 2, height / 2, 'Memuat peta kampus...', {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    this.time.delayedCall(100, () => {
      text.destroy();
      this.scene.start('CampusScene');
    });
  }

  // ── Tile textures ──────────────────────────────────────────────────────────

  private makeTileTextures(): void {
    this.makeTile('tile_wall', (g) => {
      // Dark blue-gray fill
      g.fillStyle(0x3a3256);
      g.fillRect(0, 0, T, T);
      // Subtle top/left lighter edge for 3D feel
      g.lineStyle(1, 0x5a4e80, 0.6);
      g.beginPath();
      g.moveTo(0, T);
      g.lineTo(0, 0);
      g.lineTo(T, 0);
      g.strokePath();
      // Darker bottom/right
      g.lineStyle(1, 0x1e1830, 0.8);
      g.beginPath();
      g.moveTo(T, 0);
      g.lineTo(T, T);
      g.lineTo(0, T);
      g.strokePath();
    });

    this.makeTile('tile_floor', (g) => {
      g.fillStyle(0xc8b888);
      g.fillRect(0, 0, T, T);
      g.lineStyle(1, 0xb0a070, 0.35);
      g.strokeRect(0, 0, T, T);
    });

    this.makeTile('tile_room', (g) => {
      g.fillStyle(0xe8dcc8);
      g.fillRect(0, 0, T, T);
      g.lineStyle(1, 0xd4c8a8, 0.3);
      g.strokeRect(0, 0, T, T);
    });

    this.makeTile('tile_library', (g) => {
      g.fillStyle(0xaed4e8);
      g.fillRect(0, 0, T, T);
      g.lineStyle(1, 0x90bcd4, 0.35);
      g.strokeRect(0, 0, T, T);
    });
  }

  private makeTile(
    key: string,
    draw: (g: Phaser.GameObjects.Graphics) => void,
  ): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    draw(g);
    g.generateTexture(key, T, T);
    g.destroy();
  }

  // ── Player fallback texture ───────────────────────────────────────────────

  private makePlayerTexture(): void {
    const size = 24;
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Body (shirt)
    g.fillStyle(0x4a90d9);
    g.fillRect(6, 10, 12, 10);

    // Head
    g.fillStyle(0xf5c5a0);
    g.fillCircle(12, 7, 6);

    // Eyes
    g.fillStyle(0x333333);
    g.fillRect(9, 6, 2, 2);
    g.fillRect(13, 6, 2, 2);

    // Legs
    g.fillStyle(0x2c3e50);
    g.fillRect(7, 20, 4, 3);
    g.fillRect(13, 20, 4, 3);

    g.generateTexture('player', size, size);
    g.destroy();
  }

  // ── Small door sign texture ───────────────────────────────────────────────

  private makeSignTexture(): void {
    const w = 8, h = 10;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xf0d060);
    g.fillRect(0, 0, w, h);
    g.lineStyle(1, 0xc0a030, 1);
    g.strokeRect(0, 0, w, h);
    g.generateTexture('sign', w, h);
    g.destroy();
  }
}
