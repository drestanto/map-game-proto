import Phaser from 'phaser';
import { TILE_SIZE } from '../map/campusLayout';

const T = TILE_SIZE;

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // ── Pixel-agents assets ──────────────────────────────────────────────────
    // char_0.png: 112×96 → 7 cols × 6 rows of 16×16 frames
    this.load.spritesheet('char', 'assets/characters/char_0.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
    // floor tile: 16×16 pixel art floor
    this.load.image('floor_tile', 'assets/floors/floor_0.png');
    // wall sheet: 64×128 → 4 cols × 8 rows of 16×16 (16 bitmask variants)
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

  // ── Build individual tile textures ────────────────────────────────────────

  private buildTileTextures(): void {
    this.buildWallTexture();
    this.buildFloorTexture('tile_floor',   1.0,  1.0,  1.0);  // neutral corridor
    this.buildFloorTexture('tile_room',    1.05, 1.02, 0.92); // warm cream (rooms)
    this.buildFloorTexture('tile_library', 0.85, 1.05, 1.1);  // cool blue (library)
    this.buildDoorTexture();
  }

  private buildWallTexture(): void {
    const rt = this.add.renderTexture(0, 0, T, T).setVisible(false);

    // Very dark base — high contrast with all floor types
    const bg = this.make.graphics({ x: 0, y: 0 }, false);
    bg.fillStyle(0x14111f);
    bg.fillRect(0, 0, T, T);
    rt.draw(bg, 0, 0);
    bg.destroy();

    // Lighter top strip — "3D top of wall" look
    const top = this.make.graphics({ x: 0, y: 0 }, false);
    top.fillStyle(0x2e2850);
    top.fillRect(0, 0, T, 6);
    rt.draw(top, 0, 0);
    top.destroy();

    rt.saveTexture('tile_wall');
    rt.destroy();
  }

  private buildFloorTexture(key: string, r: number, g: number, b: number): void {
    const rt = this.add.renderTexture(0, 0, T, T).setVisible(false);

    // Tile floor_0.png (16×16) four times to fill 32×32
    const tmp = this.make.image({ x: 0, y: 0, key: 'floor_tile' }, false);
    const tint = Phaser.Display.Color.GetColor(
      Math.min(255, Math.round(255 * r)),
      Math.min(255, Math.round(255 * g)),
      Math.min(255, Math.round(255 * b)),
    );
    tmp.setTint(tint);
    for (let ty = 0; ty < 2; ty++)
      for (let tx = 0; tx < 2; tx++)
        rt.draw(tmp, tx * 16, ty * 16);
    tmp.destroy();

    rt.saveTexture(key);
    rt.destroy();
  }

  private buildDoorTexture(): void {
    const rt = this.add.renderTexture(0, 0, T, T).setVisible(false);

    // Same floor base
    const tmp = this.make.image({ x: 0, y: 0, key: 'floor_tile' }, false);
    for (let ty = 0; ty < 2; ty++)
      for (let tx = 0; tx < 2; tx++)
        rt.draw(tmp, tx * 16, ty * 16);
    tmp.destroy();

    // Bright orange stripe — unmistakable "doorway" marker
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
