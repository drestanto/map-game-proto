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
const CHAR_SCALE   = 1.5;

// char_0.png row layout: 7 frames per row × 6 rows = 42 frames
// Row 0 (0–6)  : walk south, Row 1 (7–13) : walk west
// Row 2 (14–20): walk east,  Row 3 (21–27): walk north
const ANIM_FRAMES = {
  'walk-down':  { start:  0, end:  6 },
  'walk-left':  { start:  7, end: 13 },
  'walk-right': { start: 14, end: 20 },
  'walk-up':    { start: 21, end: 27 },
} as const;

export class CampusScene extends Phaser.Scene {
  private mapData!: number[][];
  private player!: Phaser.GameObjects.Sprite;

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
  }

  update(_time: number, delta: number): void {
    if (this.panelOpen) return;
    this.movePlayer(delta / 1000);
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
    // ── Furniture (Graphics, depth 7) ─────────────────────────────────────
    const g = this.add.graphics().setDepth(7);

    const desk = (col: number, row: number, color = 0x7a5230) => {
      g.fillStyle(color, 0.9);
      g.fillRect(col * T + 4, row * T + 8, T - 8, T - 14);
    };
    const shelf = (col: number, row: number) => {
      g.fillStyle(0x4a2e10, 0.95);
      g.fillRect(col * T + 2, row * T + 2, T - 4, T - 4);
    };
    const mat = (col: number, row: number, color: number) => {
      g.fillStyle(color, 0.75);
      g.fillRect(col * T + 5, row * T + 5, T - 10, T - 10);
    };
    const tableCenter = (col: number, row: number) => {
      g.fillStyle(0x6b3a20, 0.85);
      g.fillRect(col * T + 3, row * T + 3, T - 6, T - 6);
    };

    // Classroom desks — 2 rows × 3 desks per class
    const classDeskRows = (bc: number) => {
      [3, 5].forEach(r => [0, 2, 4].forEach(dc => desk(bc + dc, r)));
    };
    classDeskRows(2);   // Kelas 101
    classDeskRows(11);  // Kelas 102
    classDeskRows(20);  // Ruang Dosen
    classDeskRows(29);  // Lab Komputer

    // Library — bookshelves on north & south interior walls
    for (let c = 14; c <= 23; c += 2) { shelf(c, 12); shelf(c, 19); }
    // Library — reading tables in center
    [17, 19].forEach(c => [14, 16].forEach(r => tableCenter(c, r)));

    // Kantin — food counter + 4 tables
    g.fillStyle(0x8b5c30, 0.85);
    g.fillRect(2 * T + 2, 12 * T + 2, T * 2 - 4, T - 8); // counter
    [[4,15],[4,18],[7,15],[7,18]].forEach(([c,r]) => tableCenter(c, r));

    // Tata Usaha — reception desk
    g.fillStyle(0x5a3a20, 0.9);
    g.fillRect(30 * T + 2, 13 * T + 2, T * 3 - 4, T - 8);

    // Musholla — prayer mats (4 rows)
    [25, 26, 27, 28].forEach(r =>
      [2, 4, 6, 8].forEach(c => mat(c, r, 0x2a6e3a))
    );

    // Aula — stage podium at north wall
    g.fillStyle(0x3a2a10, 0.9);
    g.fillRect(12 * T + 4, 24 * T + 4, T * 5 - 8, T - 8);

    // Ruang Rapat — conference table (2×3 cluster)
    [30,31,32].forEach(c => [26,27].forEach(r => tableCenter(c, r)));

    // UKM — sofas/low tables
    [[20,26],[20,28],[24,26],[24,28]].forEach(([c,r]) => mat(c, r, 0x336699));

    // ── Static NPC characters (depth 40) ─────────────────────────────────
    // frame 0=south, 7=west, 14=east, 21=north
    const npcs: [string, number, number, number][] = [
      // Kelas 101
      ['char_1',  3,  4,  0], ['char_2',  7,  6,  0],
      // Kelas 102
      ['char_3', 12,  4,  0], ['char_1', 17,  6,  0],
      // Ruang Dosen
      ['char_4', 22,  3, 21], ['char_5', 25,  6,  0],
      // Lab Komputer
      ['char_2', 30,  3, 14], ['char_3', 34,  5, 14],
      // Kantin
      ['char_5',  3, 16, 14], ['char_1',  6, 15,  0], ['char_2',  7, 18,  0],
      // Tata Usaha
      ['char_4', 34, 14,  7], ['char_2', 31, 18,  7],
      // Library
      ['char_3', 15, 13,  0], ['char_5', 19, 17, 21], ['char_1', 22, 15,  7],
      // Musholla
      ['char_2',  4, 28, 21], ['char_4',  6, 29, 21], ['char_3',  3, 26, 21],
      // Aula
      ['char_5', 14, 25,  0], ['char_3', 12, 28, 21], ['char_1', 16, 28, 21],
      ['char_4', 11, 26, 14],
      // UKM
      ['char_4', 21, 26, 14], ['char_2', 25, 28,  7], ['char_5', 23, 25,  0],
      // Ruang Rapat
      ['char_5', 30, 25,  0], ['char_1', 33, 28, 21], ['char_3', 29, 27, 14],
    ];

    for (const [key, col, row, frame] of npcs) {
      if (!this.textures.exists(key)) continue;
      this.add.sprite(col * T + T / 2, row * T + T / 2, key, frame)
        .setScale(CHAR_SCALE)
        .setDepth(40);
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
    const col = 19, row = 16;
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
    const goLeft  = this.cursors.left.isDown  || this.wasd.left.isDown;
    const goRight = this.cursors.right.isDown || this.wasd.right.isDown;
    const goUp    = this.cursors.up.isDown    || this.wasd.up.isDown;
    const goDown  = this.cursors.down.isDown  || this.wasd.down.isDown;

    const hasChar = this.textures.exists('char');

    let dx = (goRight ? 1 : 0) - (goLeft ? 1 : 0);
    let dy = (goDown  ? 1 : 0) - (goUp   ? 1 : 0);

    if (dx === 0 && dy === 0) {
      if (hasChar) this.player.stop();
      return;
    }

    // Play directional walk animation
    if (hasChar) {
      if      (dx < 0) this.player.play('walk-left',  true);
      else if (dx > 0) this.player.play('walk-right', true);
      else if (dy < 0) this.player.play('walk-up',    true);
      else              this.player.play('walk-down',  true);
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
}
