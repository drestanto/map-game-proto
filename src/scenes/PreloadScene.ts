import Phaser from 'phaser';
import { TILE_SIZE } from '../map/campusLayout';

const T = TILE_SIZE;

// Tile index → floor asset key (matches pixel-agents floor numbering)
// floor_0: light stone corridor
// floor_3: grid tile (classrooms/offices)
// floor_7: dark checker (library)
const FLOOR_FOR_TYPE: Record<string, string> = {
  tile_floor:   'floor_0',
  tile_room:    'floor_3',
  tile_library: 'floor_7',
};

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // char_0.png: 112×96 → 7 cols × 6 rows of 16×16 frames
    // Row 0 = walk-down, row 1 = walk-left, row 2 = walk-right, row 3 = walk-up
    this.load.spritesheet('char', 'assets/characters/char_0.png', {
      frameWidth: 16, frameHeight: 16,
    });
    // char_1–5: same layout, used as static NPCs in rooms
    for (let i = 1; i <= 5; i++)
      this.load.spritesheet(`char_${i}`, `assets/characters/char_${i}.png`, {
        frameWidth: 16, frameHeight: 16,
      });

    // Pixel-agents floor tiles (16×16 each, tiled 2×2 to fill 32×32)
    this.load.image('floor_0', 'assets/floors/floor_0.png'); // light stone — corridors
    this.load.image('floor_3', 'assets/floors/floor_3.png'); // grid tile  — rooms
    this.load.image('floor_7', 'assets/floors/floor_7.png'); // dark check — library

    // Wall spritesheet retained for potential bitmask use later
    this.load.spritesheet('wall_sheet', 'assets/walls/wall_0.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
  }

  create(): void {
    this.buildTileTextures();
    this.buildPlayerFallback();
    this.scene.start('CampusScene');
  }

  // ── Build tile textures ───────────────────────────────────────────────────

  private buildTileTextures(): void {
    this.buildWallTexture();
    for (const [key, floorKey] of Object.entries(FLOOR_FOR_TYPE))
      this.buildFloorTexture(key, floorKey);
    this.buildDoorTexture();
  }

  private buildWallTexture(): void {
    const rt = this.add.renderTexture(0, 0, T, T).setVisible(false);

    const bg = this.make.graphics({ x: 0, y: 0 }, false);
    bg.fillStyle(0x14111f);
    bg.fillRect(0, 0, T, T);
    rt.draw(bg, 0, 0);
    bg.destroy();

    // Top edge highlight gives a top-down "wall thickness" illusion
    const top = this.make.graphics({ x: 0, y: 0 }, false);
    top.fillStyle(0x2e2850);
    top.fillRect(0, 0, T, 6);
    rt.draw(top, 0, 0);
    top.destroy();

    rt.saveTexture('tile_wall');
    rt.destroy();
  }

  // Tile a 16×16 pixel-agents floor image 2×2 to fill 32×32.
  // IMPORTANT: must use drawFrame (not draw(image,...)) so tiles are drawn
  // top-left aligned. draw(Image) uses the image's origin (0.5,0.5) by
  // default → tiles only cover 24×24 of the 32×32 RT → visual/collision mismatch.
  private buildFloorTexture(key: string, floorKey: string): void {
    const rt = this.add.renderTexture(0, 0, T, T).setVisible(false);
    for (let ty = 0; ty < 2; ty++)
      for (let tx = 0; tx < 2; tx++)
        rt.drawFrame(floorKey, undefined, tx * 16, ty * 16);
    rt.saveTexture(key);
    rt.destroy();
  }

  private buildDoorTexture(): void {
    const rt = this.add.renderTexture(0, 0, T, T).setVisible(false);

    for (let ty = 0; ty < 2; ty++)
      for (let tx = 0; tx < 2; tx++)
        rt.drawFrame('floor_0', undefined, tx * 16, ty * 16);

    const stripe = this.make.graphics({ x: 0, y: 0 }, false);
    stripe.fillStyle(0xf0a020, 0.85);
    stripe.fillRect(2, 11, T - 4, 10);
    rt.draw(stripe, 0, 0);
    stripe.destroy();

    rt.saveTexture('tile_door');
    rt.destroy();
  }

  private buildPlayerFallback(): void {
    const size = 24;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x4a90d9);
    g.fillCircle(size / 2, size / 2, size / 2 - 2);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(size / 2 - 4, size / 2 - 4, 4);
    g.generateTexture('player_fallback', size, size);
    g.destroy();
  }
}
