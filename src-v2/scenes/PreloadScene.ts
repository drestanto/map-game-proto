import Phaser from 'phaser';
import { TILE_SIZE } from '../map/codes';

const T = TILE_SIZE;

const FLOOR_FOR_TILE: Record<string, string> = {
  tile_floor:   'floor_0',
  tile_room:    'floor_3',
  tile_library: 'floor_7',
};

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    this.load.spritesheet('char', 'assets/characters/char_0.png', {
      frameWidth: 16, frameHeight: 32,
    });
    for (let i = 1; i <= 5; i++)
      this.load.spritesheet(`char_${i}`, `assets/characters/char_${i}.png`, {
        frameWidth: 16, frameHeight: 32,
      });

    this.load.image('floor_0', 'assets/floors/floor_0.png');
    this.load.image('floor_3', 'assets/floors/floor_3.png');
    this.load.image('floor_7', 'assets/floors/floor_7.png');

    this.load.spritesheet('wall_sheet', 'assets/walls/wall_0.png', {
      frameWidth: 16, frameHeight: 16,
    });

    const fi = (key: string, path: string) =>
      this.load.image(key, `assets/furniture/${path}`);
    fi('DESK_FRONT',            'DESK/DESK_FRONT.png');
    fi('DESK_SIDE',             'DESK/DESK_SIDE.png');
    fi('SMALL_TABLE_FRONT',     'SMALL_TABLE/SMALL_TABLE_FRONT.png');
    fi('SMALL_TABLE_SIDE',      'SMALL_TABLE/SMALL_TABLE_SIDE.png');
    fi('COFFEE_TABLE',          'COFFEE_TABLE/COFFEE_TABLE.png');
    fi('BOOKSHELF',             'BOOKSHELF/BOOKSHELF.png');
    fi('DOUBLE_BOOKSHELF',      'DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png');
    fi('WHITEBOARD',            'WHITEBOARD/WHITEBOARD.png');
    fi('WOODEN_CHAIR_FRONT',    'WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png');
    fi('WOODEN_CHAIR_BACK',     'WOODEN_CHAIR/WOODEN_CHAIR_BACK.png');
    fi('WOODEN_CHAIR_SIDE',     'WOODEN_CHAIR/WOODEN_CHAIR_SIDE.png');
    fi('CUSHIONED_CHAIR_FRONT', 'CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png');
    fi('CUSHIONED_CHAIR_BACK',  'CUSHIONED_CHAIR/CUSHIONED_CHAIR_BACK.png');
    fi('CUSHIONED_CHAIR_SIDE',  'CUSHIONED_CHAIR/CUSHIONED_CHAIR_SIDE.png');
    fi('CUSHIONED_BENCH',       'CUSHIONED_BENCH/CUSHIONED_BENCH.png');
    fi('WOODEN_BENCH',          'WOODEN_BENCH/WOODEN_BENCH.png');
    fi('SOFA_FRONT',            'SOFA/SOFA_FRONT.png');
    fi('SOFA_BACK',             'SOFA/SOFA_BACK.png');
    fi('SOFA_SIDE',             'SOFA/SOFA_SIDE.png');
    fi('PC_FRONT_ON_1',         'PC/PC_FRONT_ON_1.png');
    fi('PC_FRONT_OFF',          'PC/PC_FRONT_OFF.png');
    fi('PC_BACK',               'PC/PC_BACK.png');
    fi('PC_SIDE',               'PC/PC_SIDE.png');
    fi('PLANT',                 'PLANT/PLANT.png');
    fi('PLANT_2',               'PLANT_2/PLANT_2.png');
    fi('LARGE_PLANT',           'LARGE_PLANT/LARGE_PLANT.png');
    fi('HANGING_PLANT',         'HANGING_PLANT/HANGING_PLANT.png');
    fi('CACTUS',                'CACTUS/CACTUS.png');
    fi('POT',                   'POT/POT.png');
    fi('BIN',                   'BIN/BIN.png');
    fi('CLOCK',                 'CLOCK/CLOCK.png');
    fi('COFFEE',                'COFFEE/COFFEE.png');
    fi('SMALL_PAINTING',        'SMALL_PAINTING/SMALL_PAINTING.png');
    fi('SMALL_PAINTING_2',      'SMALL_PAINTING_2/SMALL_PAINTING_2.png');
    fi('LARGE_PAINTING',        'LARGE_PAINTING/LARGE_PAINTING.png');
  }

  create(): void {
    this.buildTileTextures();
    this.buildPlayerFallback();
    this.scene.start('CampusScene');
  }

  private buildTileTextures(): void {
    this.buildWallTexture();
    for (const [key, floorKey] of Object.entries(FLOOR_FOR_TILE))
      this.buildFloorTexture(key, floorKey);
    this.buildDoorTexture();
  }

  private buildWallTexture(): void {
    const rt = this.add.renderTexture(0, 0, T, T).setVisible(false);
    const bg = this.make.graphics({ x: 0, y: 0 }, false);
    bg.fillStyle(0x14111f); bg.fillRect(0, 0, T, T);
    rt.draw(bg, 0, 0); bg.destroy();
    const top = this.make.graphics({ x: 0, y: 0 }, false);
    top.fillStyle(0x2e2850); top.fillRect(0, 0, T, 6);
    rt.draw(top, 0, 0); top.destroy();
    rt.saveTexture('tile_wall'); rt.destroy();
  }

  private buildFloorTexture(key: string, floorKey: string): void {
    const rt = this.add.renderTexture(0, 0, T, T).setVisible(false);
    for (let ty = 0; ty < 2; ty++)
      for (let tx = 0; tx < 2; tx++)
        rt.drawFrame(floorKey, undefined, tx * 16, ty * 16);
    rt.saveTexture(key); rt.destroy();
  }

  private buildDoorTexture(): void {
    const rt = this.add.renderTexture(0, 0, T, T).setVisible(false);
    for (let ty = 0; ty < 2; ty++)
      for (let tx = 0; tx < 2; tx++)
        rt.drawFrame('floor_0', undefined, tx * 16, ty * 16);
    const stripe = this.make.graphics({ x: 0, y: 0 }, false);
    stripe.fillStyle(0xf0a020, 0.85); stripe.fillRect(2, 11, T - 4, 10);
    rt.draw(stripe, 0, 0); stripe.destroy();
    rt.saveTexture('tile_door'); rt.destroy();
  }

  private buildPlayerFallback(): void {
    const size = 24;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x4a90d9); g.fillCircle(size / 2, size / 2, size / 2 - 2);
    g.fillStyle(0xffffff, 0.5); g.fillCircle(size / 2 - 4, size / 2 - 4, 4);
    g.generateTexture('player_fallback', size, size); g.destroy();
  }
}
