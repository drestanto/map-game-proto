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
    // drawFrame draws from top-left, unlike draw(key,x,y) which centers at (x,y).
    // Centering would shift every tile by -T/2 in both axes → 16px visual/collision mismatch.
    const rt = this.add.renderTexture(0, 0, MAP_COLS * T, MAP_ROWS * T).setOrigin(0, 0);
    for (let row = 0; row < MAP_ROWS; row++)
      for (let col = 0; col < MAP_COLS; col++)
        rt.drawFrame(tileKey[this.mapData[row][col]], undefined, col * T, row * T);
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
      .setDepth(10);
    if (hasChar) this.player.setScale(2);
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
