import Phaser from 'phaser';
import {
  buildCampusMap,
  MAP_COLS,
  MAP_ROWS,
  ROOMS,
  RoomInfo,
  TILE,
  TILE_SIZE,
} from '../map/campusLayout';

const T = TILE_SIZE;
const PLAYER_SPEED = 150;      // px/s
const PLAYER_R     = T * 0.32; // collision radius
const INTERACT_R   = T * 2.2;  // "Press E" detection radius
// char_N frames are 16×16 and the figure fills the whole frame. Scaling 2× makes
// the sprite exactly 32×32 = one full tile → reads as a solid block. Use 1.5×
// (24px) so there's floor margin around the character and it looks like a figure.
const CHAR_SCALE   = 2;
const NPC_SPEED    = 1.5;   // tiles per second when moving
const NPC_WALK_FPS = 8;     // walk animation frames per second

// char_0.png: 7 frames × 3 rows of 16×32 = 21 frames total
// Row 0 (0–6)  : walk south (facing camera)
// Row 1 (7–13) : walk north (backs to camera)
// Row 2 (14–20): walk east — mirror with setFlipX(true) for west
const ANIM_FRAMES = {
  'walk-down':  { start:  0, end:  6 },
  'walk-up':    { start:  7, end: 13 },
  'walk-right': { start: 14, end: 20 },
} as const;

type NpcBehavior = 'idle-turn' | 'wander' | 'pace';
type Facing = 'down' | 'up' | 'right';

interface NpcData {
  sprite: Phaser.GameObjects.Sprite;
  behavior: NpcBehavior;
  homeCol: number; homeRow: number;       // spawn / pace-point-A
  paceCol: number; paceRow: number;       // pace-point-B (same as home for non-pace)
  col: number; row: number;               // current tile (integer when idle)
  facing: Facing; flipX: boolean;
  moving: boolean;
  fromCol: number; fromRow: number;
  toCol:   number; toRow:   number;
  moveT: number;                          // 0→1 lerp progress
  frameIdx: number; frameTick: number;    // walk animation
  waitTimer: number;                      // seconds until next decision
}

export class CampusScene extends Phaser.Scene {
  private mapData!: number[][];
  private player!: Phaser.GameObjects.Sprite;
  private npcList: NpcData[] = [];
  private dpad = { left: false, right: false, up: false, down: false };

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyEsc!: Phaser.Input.Keyboard.Key;

  private promptText!: Phaser.GameObjects.Text;
  private infoPanel!: Phaser.GameObjects.Container;
  private panelOpen = false;
  private nearbyRoom: RoomInfo | null = null;

  constructor() {
    super({ key: 'CampusScene' });
  }

  create(): void {
    this.mapData = buildCampusMap();
    this.renderMap();
    this.addRoomLabels();
    this.addRoomObjects();
    this.createPlayer();
    this.setupAnimations();
    this.setupCamera();
    this.setupInput();
    this.createUI();
    this.createDpad();
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.updateNpcs(dt);
    if (this.panelOpen) return;
    this.movePlayer(dt);
    this.checkNearby();
    this.refreshPrompt();
  }

  private renderMap(): void {
    const tileKey: Record<number, string> = {
      [TILE.WALL]:    'tile_wall',
      [TILE.FLOOR]:   'tile_floor',
      [TILE.ROOM]:    'tile_room',
      [TILE.LIBRARY]: 'tile_library',
      [TILE.DOOR]:    'tile_door',
    };
    // [r1,c1,r2,c2, tint] — interior tile bounds per room
    const ROOM_TINTS: [number,number,number,number,number][] = [
      [1,  1,  8,  9,  0xe0f0ff], // Kelas 101     — sky blue
      [1,  10, 8,  18, 0xe8ffe0], // Kelas 102     — mint green
      [1,  19, 8,  27, 0xfff0e0], // Ruang Dosen   — warm amber
      [1,  28, 8,  36, 0xf0e0ff], // Lab Komputer  — soft purple
      [11, 1,  21, 8,  0xffe8d8], // Kantin        — warm peach
      [11, 29, 21, 36, 0xe0f4ff], // Tata Usaha    — cool blue
      [23, 1,  31, 9,  0xffe0e0], // Musholla      — rose
      [23, 10, 31, 18, 0xfffff0], // Aula          — ivory
      [23, 19, 31, 27, 0xe0ffe0], // UKM Center    — sage green
      [23, 28, 31, 36, 0xffe0f8], // Ruang Rapat   — orchid
    ];

    const mapLayer = this.add.layer();
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tileType = this.mapData[row][col];
        const img = this.add.image(col * T + T / 2, row * T + T / 2, tileKey[tileType]);

        if (tileType === TILE.LIBRARY) {
          img.setTint(0xe0e0f8); // periwinkle — beda dari semua room
        } else if (tileType === TILE.ROOM) {
          for (const [r1, c1, r2, c2, tint] of ROOM_TINTS)
            if (row >= r1 && row <= r2 && col >= c1 && col <= c2) { img.setTint(tint); break; }
        }

        mapLayer.add(img);
      }
    }
  }

  private addRoomObjects(): void {
    // All furniture sprites are 16px-grid assets displayed at 2× scale.
    // setOrigin(0,0) → top-left of sprite aligns to tile corner (col*T, row*T).
    // Depth uses row fraction for y-sort within the furniture layer.
    const furn = (key: string, col: number, row: number, flipX = false) =>
      this.add.image(col * T, row * T, key)
        .setOrigin(0, 0)
        .setScale(2)
        .setFlipX(flipX)
        .setDepth(7 + row * 0.01);

    // ── Kelas 101  (interior cols 2–8, rows 2–7) ──────────────────────────
    furn('WHITEBOARD',         3, 1);              // hung on north wall
    furn('DESK_FRONT',         2, 3);              // student desks row A (3W×2H each)
    furn('DESK_FRONT',         5, 3);
    furn('DESK_FRONT',         2, 5);              // student desks row B
    furn('DESK_FRONT',         5, 5);
    furn('PLANT',              8, 5);              // east-wall plant

    // ── Kelas 102  (interior cols 11–17, rows 2–7) ────────────────────────
    furn('WHITEBOARD',        12, 1);
    furn('DESK_FRONT',        11, 3);
    furn('DESK_FRONT',        14, 3);
    furn('DESK_FRONT',        11, 5);
    furn('DESK_FRONT',        14, 5);
    furn('CACTUS',            17, 5);

    // ── Ruang Dosen  (interior cols 20–26, rows 2–7) ──────────────────────
    furn('WHITEBOARD',        20, 1);
    furn('DESK_FRONT',        20, 2);              // faculty desk A
    furn('PC_FRONT_ON_1',     20, 2);              // PC on desk (same origin, renders above via depth)
    furn('DESK_FRONT',        23, 2);              // faculty desk B
    furn('PC_FRONT_ON_1',     23, 2);
    furn('DESK_FRONT',        20, 5);              // faculty desk C
    furn('PC_FRONT_ON_1',     20, 5);
    furn('DESK_FRONT',        23, 5);              // faculty desk D
    furn('PC_FRONT_ON_1',     23, 5);
    furn('CUSHIONED_CHAIR_FRONT', 21, 4);          // visitor chairs
    furn('CUSHIONED_CHAIR_FRONT', 24, 4);
    furn('PLANT',             26, 2);

    // ── Lab Komputer  (interior cols 29–35, rows 2–7) ─────────────────────
    furn('WHITEBOARD',        29, 1);
    for (let c = 29; c <= 34; c++) furn('PC_FRONT_ON_1', c, 2); // 6 PCs top row
    for (let c = 29; c <= 34; c++) furn('PC_FRONT_ON_1', c, 5); // 6 PCs bottom row
    furn('BIN',               35, 7);

    // ── Kantin  (interior cols 2–7, rows 12–20) ───────────────────────────
    furn('DESK_FRONT',         2, 12);             // food counter
    furn('COFFEE',             2, 13);             // coffee machine beside counter
    furn('LARGE_PLANT',        6, 12);             // corner plant (2W×3H)
    furn('COFFEE_TABLE',       2, 15);             // dining table A (2W×2H)
    furn('CUSHIONED_CHAIR_FRONT', 2, 17);
    furn('CUSHIONED_CHAIR_FRONT', 3, 17);
    furn('COFFEE_TABLE',       5, 15);             // dining table B
    furn('CUSHIONED_CHAIR_FRONT', 5, 17);
    furn('CUSHIONED_CHAIR_FRONT', 6, 17);
    furn('COFFEE_TABLE',       2, 18);             // dining table C
    furn('CUSHIONED_CHAIR_FRONT', 2, 20);
    furn('CUSHIONED_CHAIR_FRONT', 3, 20);
    furn('COFFEE_TABLE',       5, 18);             // dining table D
    furn('CUSHIONED_CHAIR_FRONT', 5, 20);
    furn('CUSHIONED_CHAIR_FRONT', 6, 20);
    furn('BIN',                7, 20);

    // ── Perpustakaan  (interior cols 14–23, rows 12–19) ───────────────────
    // Bookshelves along north interior wall (each 2W×2H)
    for (let c = 14; c <= 22; c += 2) furn('DOUBLE_BOOKSHELF', c, 12);
    // Bookshelves along south interior wall
    for (let c = 14; c <= 22; c += 2) furn('DOUBLE_BOOKSHELF', c, 18);
    // Reading tables + chairs in centre
    furn('SMALL_TABLE_FRONT',  15, 14);            // table A (2W×2H)
    furn('CUSHIONED_CHAIR_BACK',  15, 14);         // chair behind table A
    furn('CUSHIONED_CHAIR_FRONT', 15, 16);         // chair in front
    furn('CUSHIONED_CHAIR_FRONT', 16, 16);
    furn('SMALL_TABLE_FRONT',  19, 14);            // table B
    furn('CUSHIONED_CHAIR_BACK',  19, 14);
    furn('CUSHIONED_CHAIR_FRONT', 19, 16);
    furn('CUSHIONED_CHAIR_FRONT', 20, 16);
    furn('PC_FRONT_ON_1',      22, 14);            // library PC terminal
    furn('HANGING_PLANT',      23, 12);

    // ── Tata Usaha  (interior cols 30–35, rows 12–20) ─────────────────────
    furn('DESK_FRONT',         30, 12);            // reception desk (3W×2H)
    furn('PC_FRONT_ON_1',      30, 12);            // PC at reception
    furn('CUSHIONED_CHAIR_FRONT', 31, 14);         // visitor chair
    furn('BOOKSHELF',          33, 12);            // filing shelves (2W×1H each)
    furn('BOOKSHELF',          33, 13);
    furn('BOOKSHELF',          33, 15);
    furn('BOOKSHELF',          33, 17);
    furn('DESK_FRONT',         30, 16);            // second staff desk
    furn('PC_FRONT_ON_1',      30, 16);
    furn('CLOCK',              35, 12);
    furn('PLANT',              35, 19);
    furn('BIN',                34, 20);

    // ── Musholla  (interior cols 2–8, rows 24–30) ─────────────────────────
    furn('SMALL_PAINTING',     2, 24);             // qibla marker on north wall
    for (let r = 25; r <= 29; r += 2)             // prayer mat rows
      for (let c = 2; c <= 7; c += 2)
        furn('CUSHIONED_BENCH', c, r);
    furn('HANGING_PLANT',      8, 24);

    // ── Aula  (interior cols 11–17, rows 24–30) ───────────────────────────
    furn('DESK_FRONT',         12, 24);            // stage/podium
    furn('LARGE_PAINTING',     15, 24);            // backdrop art (2W×2H)
    furn('PLANT',              11, 24);
    furn('PLANT',              17, 24);
    for (let c = 11; c <= 17; c++) furn('WOODEN_BENCH', c, 27); // bench row A
    for (let c = 11; c <= 17; c++) furn('WOODEN_BENCH', c, 29); // bench row B

    // ── UKM Center  (interior cols 20–26, rows 24–30) ─────────────────────
    furn('LARGE_PLANT',        25, 24);
    furn('SOFA_BACK',          20, 25);            // sofa group (2W×1H each)
    furn('SOFA_BACK',          22, 25);
    furn('COFFEE_TABLE',       21, 26);            // coffee table (2W×2H)
    furn('SOFA_FRONT',         20, 28);
    furn('SOFA_FRONT',         22, 28);
    furn('SMALL_PAINTING_2',   24, 25);
    furn('PLANT_2',            20, 24);
    furn('BIN',                26, 30);

    // ── Ruang Rapat  (interior cols 29–35, rows 24–30) ────────────────────
    furn('WHITEBOARD',         30, 23);            // on north wall
    furn('DESK_FRONT',         29, 25);            // conference table left (3W×2H)
    furn('DESK_FRONT',         32, 25);            // conference table right
    for (let c = 29; c <= 34; c++)                 // chairs south side
      furn('CUSHIONED_CHAIR_FRONT', c, 27);
    for (let c = 29; c <= 34; c++)                 // chairs north side
      furn('CUSHIONED_CHAIR_BACK', c, 24);
    furn('CLOCK',              35, 24);
    furn('PLANT',              35, 29);

    // ── NPC characters (depth 40+) — animated via updateNpcs() ───────────
    // [key, col, row, facing, flipX, behavior, paceDestCol, paceDestRow]
    type NpcDef = [string, number, number, Facing, boolean, NpcBehavior, number?, number?];
    const defs: NpcDef[] = [
      // Kelas 101
      ['char_1',  3,  4, 'down',  false, 'wander'],
      ['char_2',  7,  6, 'down',  false, 'idle-turn'],
      // Kelas 102
      ['char_3', 12,  4, 'down',  false, 'idle-turn'],
      ['char_1', 17,  6, 'down',  false, 'wander'],
      // Ruang Dosen
      ['char_4', 22,  4, 'up',    false, 'idle-turn'],
      ['char_5', 25,  6, 'down',  false, 'pace', 25, 3],
      // Lab Komputer
      ['char_2', 31,  4, 'right', false, 'idle-turn'],
      ['char_3', 34,  6, 'right', false, 'wander'],
      // Kantin
      ['char_5',  3, 14, 'right', false, 'pace', 5, 14],
      ['char_1',  5, 16, 'down',  false, 'idle-turn'],
      ['char_2',  6, 19, 'down',  false, 'wander'],
      // Tata Usaha
      ['char_4', 34, 14, 'right', true,  'pace', 34, 18],
      ['char_2', 33, 18, 'right', true,  'idle-turn'],
      // Library
      ['char_3', 15, 13, 'down',  false, 'wander'],
      ['char_5', 21, 17, 'up',    false, 'idle-turn'],
      ['char_1', 17, 16, 'right', true,  'wander'],
      // Musholla
      ['char_2',  3, 28, 'up',    false, 'idle-turn'],
      ['char_4',  5, 29, 'up',    false, 'idle-turn'],
      ['char_3',  7, 26, 'up',    false, 'idle-turn'],
      // Aula
      ['char_5', 13, 26, 'down',  false, 'wander'],
      ['char_3', 15, 28, 'up',    false, 'idle-turn'],
      ['char_4', 11, 26, 'right', false, 'pace', 11, 29],
      // UKM
      ['char_4', 21, 27, 'right', false, 'wander'],
      ['char_2', 24, 29, 'right', true,  'idle-turn'],
      ['char_5', 23, 24, 'down',  false, 'wander'],
      // Ruang Rapat
      ['char_5', 31, 24, 'up',    false, 'pace', 31, 27],
      ['char_1', 34, 29, 'up',    false, 'idle-turn'],
      ['char_3', 29, 28, 'right', false, 'idle-turn'],
    ];

    this.npcList = [];
    for (const [key, col, row, facing, flipX, behavior, paceCol, paceRow] of defs) {
      if (!this.textures.exists(key)) continue;
      const baseFrame = facing === 'down' ? 0 : facing === 'up' ? 7 : 14;
      const sprite = this.add.sprite(col * T + T / 2, row * T + T / 2, key, baseFrame)
        .setScale(CHAR_SCALE)
        .setFlipX(flipX)
        .setDepth(40 + row * 0.01);
      this.npcList.push({
        sprite, behavior,
        homeCol: col, homeRow: row,
        paceCol: paceCol ?? col, paceRow: paceRow ?? row,
        col, row, facing, flipX,
        moving: false,
        fromCol: col, fromRow: row, toCol: col, toRow: row,
        moveT: 1,
        frameIdx: 0, frameTick: 0,
        waitTimer: Math.random() * 3, // stagger initial actions
      });
    }
  }

  private addRoomLabels(): void {
    for (const room of ROOMS) {
      const isLib = room.id === 'perpustakaan';
      this.add
        .text(room.labelCol * T + T / 2, room.labelRow * T + T / 2, room.name, {
          fontSize: '9px',
          color: isLib ? '#1a3a5c' : '#3a2010',
          fontFamily: 'monospace',
          align: 'center',
          wordWrap: { width: T * 5.5 },
        })
        .setOrigin(0.5)
        .setAlpha(0.9)
        .setDepth(5);
    }
  }

  private createPlayer(): void {
    // Spawn inside the library center — gives the best overview of the campus
    // and allows free north/south movement through the library doors.
    const col = 19, row = 15;
    const hasChar = this.textures.exists('char');
    this.player = this.add
      .sprite(col * T + T / 2, row * T + T / 2, hasChar ? 'char' : 'player_fallback')
      .setDepth(50);
    if (hasChar) this.player.setScale(CHAR_SCALE);
  }

  private setupAnimations(): void {
    if (!this.textures.exists('char')) return;
    for (const [key, { start, end }] of Object.entries(ANIM_FRAMES)) {
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers('char', { start, end }),
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  private setupCamera(): void {
    this.cameras.main
      .setBounds(0, 0, MAP_COLS * T, MAP_ROWS * T)
      .startFollow(this.player, true)
      // zoom 1.0 → shows 30×20 tiles (79% × 63% of the 38×32 map) — good campus overview
      .setZoom(1.0);
  }

  private setupInput(): void {
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.keyE   = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyEsc = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.keyE.on('down', () => this.handleE());
    this.keyEsc.on('down', () => this.closePanel());
  }

  // ── Movement: separate X/Y checks → smooth wall-sliding ──────────────────
  private movePlayer(dt: number): void {
    const goLeft  = this.cursors.left.isDown  || this.wasd.left.isDown  || this.dpad.left;
    const goRight = this.cursors.right.isDown || this.wasd.right.isDown || this.dpad.right;
    const goUp    = this.cursors.up.isDown    || this.wasd.up.isDown    || this.dpad.up;
    const goDown  = this.cursors.down.isDown  || this.wasd.down.isDown  || this.dpad.down;

    const hasChar = this.textures.exists('char');

    let dx = (goRight ? 1 : 0) - (goLeft ? 1 : 0);
    let dy = (goDown  ? 1 : 0) - (goUp   ? 1 : 0);

    if (dx === 0 && dy === 0) {
      if (hasChar) this.player.stop();
      return;
    }

    // Play directional walk animation (walk-left mirrors walk-right via flipX)
    if (hasChar) {
      if (dx < 0) {
        this.player.play('walk-right', true);
        this.player.setFlipX(true);
      } else if (dx > 0) {
        this.player.play('walk-right', true);
        this.player.setFlipX(false);
      } else if (dy < 0) {
        this.player.play('walk-up', true);
        this.player.setFlipX(false);
      } else {
        this.player.play('walk-down', true);
        this.player.setFlipX(false);
      }
    }

    const len = Math.sqrt(dx * dx + dy * dy);
    dx = (dx / len) * PLAYER_SPEED * dt;
    dy = (dy / len) * PLAYER_SPEED * dt;

    const { x, y } = this.player;
    const r = PLAYER_R;

    const nx = x + dx;
    if (
      this.walkable(nx - r, y - r) && this.walkable(nx + r, y - r) &&
      this.walkable(nx - r, y + r) && this.walkable(nx + r, y + r)
    ) this.player.x = nx;

    const ny = y + dy;
    if (
      this.walkable(this.player.x - r, ny - r) && this.walkable(this.player.x + r, ny - r) &&
      this.walkable(this.player.x - r, ny + r) && this.walkable(this.player.x + r, ny + r)
    ) this.player.y = ny;
  }

  private walkable(wx: number, wy: number): boolean {
    const col = Math.floor(wx / T);
    const row = Math.floor(wy / T);
    if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return false;
    return this.mapData[row][col] !== TILE.WALL;
  }

  private checkNearby(): void {
    let closest: RoomInfo | null = null;
    let minDist = Infinity;
    for (const room of ROOMS) {
      const tx = room.triggerCol * T + T / 2;
      const ty = room.triggerRow * T + T / 2;
      const d  = Phaser.Math.Distance.Between(this.player.x, this.player.y, tx, ty);
      if (d < INTERACT_R && d < minDist) { minDist = d; closest = room; }
    }
    this.nearbyRoom = closest;
  }

  private createUI(): void {
    const { width, height } = this.scale;

    this.promptText = this.add
      .text(width / 2, height - 44, '', {
        fontSize: '12px', color: '#ffffff',
        backgroundColor: '#00000099',
        padding: { x: 14, y: 7 }, fontFamily: 'monospace',
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(100).setVisible(false);

    this.add.text(10, height - 10,
      'WASD / ↑↓←→  Jalan    E  Info ruangan    ESC  Tutup', {
        fontSize: '9px', color: '#777777', fontFamily: 'monospace',
      }).setOrigin(0, 1).setScrollFactor(0).setDepth(100);

    this.add.text(10, 10, 'Kampus Cakrawala', {
      fontSize: '13px', color: '#f0d060', fontFamily: 'monospace', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(100);

    this.infoPanel = this.buildInfoPanel(width, height);
  }

  private buildInfoPanel(width: number, height: number): Phaser.GameObjects.Container {
    const pw = Math.min(380, width - 48);
    const ph = 200;

    const bg = this.add.graphics();
    bg.fillStyle(0x0d0b1a, 0.94);
    bg.fillRoundedRect(0, 0, pw, ph, 10);
    bg.lineStyle(2, 0xf0d060, 0.85);
    bg.strokeRoundedRect(0, 0, pw, ph, 10);

    const title = this.add.text(pw / 2, 22, '', {
      fontSize: '15px', color: '#f0d060', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setName('title');

    const desc = this.add.text(pw / 2, 52, '', {
      fontSize: '11px', color: '#e0e0d0', fontFamily: 'monospace',
      align: 'center', wordWrap: { width: pw - 40 }, lineSpacing: 5,
    }).setOrigin(0.5, 0).setName('desc');

    const hint = this.add.text(pw / 2, ph - 18, '[ ESC ]  Tutup', {
      fontSize: '9px', color: '#555555', fontFamily: 'monospace',
    }).setOrigin(0.5, 1);

    return this.add
      .container((width - pw) / 2, (height - ph) / 2, [bg, title, desc, hint])
      .setScrollFactor(0).setDepth(200).setVisible(false);
  }

  private refreshPrompt(): void {
    if (this.nearbyRoom) {
      this.promptText.setText(`[E]  ${this.nearbyRoom.name}`).setVisible(true);
    } else {
      this.promptText.setVisible(false);
    }
  }

  private handleE(): void {
    if (this.panelOpen) { this.closePanel(); return; }
    if (!this.nearbyRoom) return;
    if (this.textures.exists('char')) this.player.stop();
    (this.infoPanel.getByName('title') as Phaser.GameObjects.Text).setText(this.nearbyRoom.name);
    (this.infoPanel.getByName('desc')  as Phaser.GameObjects.Text).setText(this.nearbyRoom.description);
    this.infoPanel.setVisible(true);
    this.promptText.setVisible(false);
    this.panelOpen = true;
  }

  private closePanel(): void {
    this.infoPanel.setVisible(false);
    this.panelOpen = false;
  }

  // ── Virtual D-pad (mobile) ────────────────────────────────────────────────

  private createDpad(): void {
    const { width, height } = this.scale;
    const R   = 36;   // button radius
    const GAP = 6;    // gap between buttons
    const S   = R * 2 + GAP; // step between button centres
    // centre of the cross: bottom-right corner
    const cx  = width  - S - R - 16;
    const cy  = height - S - R - 16;

    // Interact button (E) — top-left of screen, mobile-friendly
    const eX  = R + 16;
    const eY  = height - R - 16;

    const btnAlpha    = 0.55;
    const btnColor    = 0x222244;

    const makeBtn = (
      bx: number, by: number,
      arrow: string,
      onDown: () => void,
      onUp: () => void,
    ) => {
      const g = this.add.graphics().setScrollFactor(0).setDepth(150).setInteractive(
        new Phaser.Geom.Circle(bx, by, R), Phaser.Geom.Circle.Contains,
      );

      const draw = (pressed: boolean) => {
        g.clear();
        g.fillStyle(btnColor, pressed ? 0.85 : btnAlpha);
        g.fillCircle(bx, by, R);
        g.lineStyle(2, 0x6666aa, 0.7);
        g.strokeCircle(bx, by, R);
        // text labels are added separately as Text objects below
      };

      draw(false);

      // text label centred on button
      this.add.text(bx, by, arrow, {
        fontSize: '20px', color: '#ffffff',
        fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(151);

      g.on('pointerdown', () => { draw(true);  onDown(); });
      g.on('pointerup',   () => { draw(false); onUp();   });
      g.on('pointerout',  () => { draw(false); onUp();   });
    };

    // D-pad arrows
    makeBtn(cx,     cy - S, '↑', () => this.dpad.up    = true, () => this.dpad.up    = false);
    makeBtn(cx,     cy + S, '↓', () => this.dpad.down  = true, () => this.dpad.down  = false);
    makeBtn(cx - S, cy,     '←', () => this.dpad.left  = true, () => this.dpad.left  = false);
    makeBtn(cx + S, cy,     '→', () => this.dpad.right = true, () => this.dpad.right = false);

    // Interact button
    makeBtn(eX, eY, 'E', () => this.handleE(), () => {});
  }

  // ── NPC AI ────────────────────────────────────────────────────────────────

  private updateNpcs(dt: number): void {
    for (const n of this.npcList) {
      if (n.moving) {
        n.moveT = Math.min(1, n.moveT + dt * NPC_SPEED);
        const x = (n.fromCol + (n.toCol - n.fromCol) * n.moveT) * T + T / 2;
        const y = (n.fromRow + (n.toRow - n.fromRow) * n.moveT) * T + T / 2;
        n.sprite.setPosition(x, y);
        n.sprite.setDepth(40 + n.toRow * 0.01);

        // walk frame animation
        n.frameTick += dt;
        if (n.frameTick >= 1 / NPC_WALK_FPS) {
          n.frameTick -= 1 / NPC_WALK_FPS;
          n.frameIdx = (n.frameIdx + 1) % 7;
        }
        const base = n.facing === 'down' ? 0 : n.facing === 'up' ? 7 : 14;
        n.sprite.setFrame(base + n.frameIdx);
        n.sprite.setFlipX(n.flipX);

        if (n.moveT >= 1) {
          n.moving = false;
          n.col = n.toCol; n.row = n.toRow;
          n.fromCol = n.toCol; n.fromRow = n.toRow;
          n.frameIdx = 0; n.frameTick = 0;
          n.sprite.setFrame(base); // idle frame
          n.waitTimer = 1 + Math.random() * 2;
        }
      } else {
        n.waitTimer -= dt;
        if (n.waitTimer <= 0) this.npcDecide(n);
      }
    }
  }

  private npcDecide(n: NpcData): void {
    switch (n.behavior) {
      case 'idle-turn': {
        const opts: [Facing, boolean][] = [
          ['down', false], ['up', false], ['right', false], ['right', true],
        ];
        [n.facing, n.flipX] = opts[Math.floor(Math.random() * opts.length)];
        const f = n.facing === 'down' ? 0 : n.facing === 'up' ? 7 : 14;
        n.sprite.setFrame(f);
        n.sprite.setFlipX(n.flipX);
        n.waitTimer = 2 + Math.random() * 3;
        break;
      }
      case 'wander': {
        const dirs = [[0,-1],[0,1],[-1,0],[1,0]].sort(() => Math.random() - 0.5);
        for (const [dc, dr] of dirs) {
          const tc = n.col + dc, tr = n.row + dr;
          const homeDist = Math.abs(tc - n.homeCol) + Math.abs(tr - n.homeRow);
          if (homeDist <= 3 && this.walkable(tc * T + T / 2, tr * T + T / 2)) {
            this.npcStartMove(n, tc, tr, dc as -1|0|1, dr as -1|0|1);
            return;
          }
        }
        n.waitTimer = 1 + Math.random(); // stuck, wait and retry
        break;
      }
      case 'pace': {
        const atA = n.col === n.homeCol && n.row === n.homeRow;
        const tc = atA ? n.paceCol : n.homeCol;
        const tr = atA ? n.paceRow : n.homeRow;
        const dc = Math.sign(tc - n.col) as -1|0|1;
        const dr = Math.sign(tr - n.row) as -1|0|1;
        const nc = n.col + (dc || 0), nr = n.row + (dr || 0);
        if (this.walkable(nc * T + T / 2, nr * T + T / 2))
          this.npcStartMove(n, nc, nr, dc, dr);
        else
          n.waitTimer = 1;
        break;
      }
    }
  }

  private npcStartMove(n: NpcData, tc: number, tr: number, dc: -1|0|1, dr: -1|0|1): void {
    n.moving = true;
    n.toCol = tc; n.toRow = tr;
    n.moveT = 0; n.frameIdx = 0; n.frameTick = 0;
    if      (dr < 0) { n.facing = 'up';    n.flipX = false; }
    else if (dr > 0) { n.facing = 'down';  n.flipX = false; }
    else if (dc > 0) { n.facing = 'right'; n.flipX = false; }
    else             { n.facing = 'right'; n.flipX = true;  }
  }
}
