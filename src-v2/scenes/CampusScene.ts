import Phaser from 'phaser';
import { MAP, parseObjects, ROOMS, RoomInfo, ObjectPlacement } from '../map/campusMap';
import { TC, ROOM_TINTS, MAP_COLS, MAP_ROWS, TILE_SIZE } from '../map/codes';
import { tileOf, walkableAt } from '../map/mapParser';

const T            = TILE_SIZE;
const PLAYER_SPEED = 150;
const PLAYER_R     = T * 0.32;
const INTERACT_R   = T * 2.2;
const CHAR_SCALE   = 2;
const NPC_SPEED    = 1.5;
const NPC_WALK_FPS = 8;

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
  homeCol: number; homeRow: number;
  paceCol: number; paceRow: number;
  col: number; row: number;
  facing: Facing; flipX: boolean;
  moving: boolean;
  fromCol: number; fromRow: number;
  toCol: number; toRow: number;
  moveT: number;
  frameIdx: number; frameTick: number;
  waitTimer: number;
}

const TILE_KEY: Record<string, string> = {
  [TC.WALL]:    'tile_wall',
  [TC.FLOOR]:   'tile_floor',
  [TC.ROOM]:    'tile_room',
  [TC.LIBRARY]: 'tile_library',
  [TC.DOOR]:    'tile_door',
};

export class CampusScene extends Phaser.Scene {
  private mapData!: string[][];
  private player!: Phaser.GameObjects.Sprite;
  private npcList: NpcData[] = [];
  private dpad = { left: false, right: false, up: false, down: false };

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key;
                   left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyEsc!: Phaser.Input.Keyboard.Key;

  private promptText!: Phaser.GameObjects.Text;
  private infoPanel!: Phaser.GameObjects.Container;
  private panelOpen = false;
  private nearbyRoom: RoomInfo | null = null;

  constructor() { super({ key: 'CampusScene' }); }

  create(): void {
    this.mapData = MAP;
    this.renderMap();
    this.addRoomLabels();
    this.addObjects(parseObjects());
    this.addNpcs();
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

  // ── Map rendering ────────────────────────────────────────────────────────────

  private renderMap(): void {
    const mapLayer = this.add.layer();
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tile = tileOf(this.mapData[row][col]);
        const key  = TILE_KEY[tile] ?? 'tile_wall';
        const img  = this.add.image(col * T + T / 2, row * T + T / 2, key);

        if (tile === TC.LIBRARY) {
          img.setTint(0xe0e0f8);
        } else if (tile === TC.ROOM) {
          for (const [r1, c1, r2, c2, tint] of ROOM_TINTS)
            if (row >= r1 && row <= r2 && col >= c1 && col <= c2) { img.setTint(tint); break; }
        }

        mapLayer.add(img);
      }
    }
    mapLayer.setDepth(0);
  }

  // ── Furniture from parsed object list ────────────────────────────────────────

  private addObjects(objects: ObjectPlacement[]): void {
    for (const { assetKey, col, row, flipX } of objects) {
      if (!this.textures.exists(assetKey)) continue;
      this.add.image(col * T, row * T, assetKey)
        .setOrigin(0, 0)
        .setScale(2)
        .setFlipX(flipX)
        .setDepth(7 + row * 0.01);
    }
  }

  // ── Room labels ──────────────────────────────────────────────────────────────

  private addRoomLabels(): void {
    for (const room of ROOMS) {
      const isLib = room.id === 'perpustakaan';
      this.add
        .text(room.labelCol * T + T / 2, room.labelRow * T + T / 2, room.name, {
          fontSize: '9px', color: isLib ? '#1a3a5c' : '#3a2010',
          fontFamily: 'monospace', align: 'center', wordWrap: { width: T * 5.5 },
        })
        .setOrigin(0.5).setAlpha(0.9).setDepth(5);
    }
  }

  // ── NPC placement ────────────────────────────────────────────────────────────

  private addNpcs(): void {
    type NpcDef = [string, number, number, Facing, boolean, NpcBehavior, number?, number?];
    const defs: NpcDef[] = [
      ['char_1',  3,  4, 'down',  false, 'wander'],
      ['char_2',  7,  6, 'down',  false, 'idle-turn'],
      ['char_3', 12,  4, 'down',  false, 'idle-turn'],
      ['char_1', 17,  6, 'down',  false, 'wander'],
      ['char_4', 22,  4, 'up',    false, 'idle-turn'],
      ['char_5', 25,  6, 'down',  false, 'pace', 25, 3],
      ['char_2', 31,  4, 'right', false, 'idle-turn'],
      ['char_3', 34,  6, 'right', false, 'wander'],
      ['char_5',  3, 14, 'right', false, 'pace', 5, 14],
      ['char_1',  5, 16, 'down',  false, 'idle-turn'],
      ['char_2',  6, 19, 'down',  false, 'wander'],
      ['char_4', 34, 14, 'right', true,  'pace', 34, 18],
      ['char_2', 33, 18, 'right', true,  'idle-turn'],
      ['char_3', 15, 13, 'down',  false, 'wander'],
      ['char_5', 21, 17, 'up',    false, 'idle-turn'],
      ['char_1', 17, 16, 'right', true,  'wander'],
      ['char_2',  3, 28, 'up',    false, 'idle-turn'],
      ['char_4',  5, 29, 'up',    false, 'idle-turn'],
      ['char_3',  7, 26, 'up',    false, 'idle-turn'],
      ['char_5', 13, 26, 'down',  false, 'wander'],
      ['char_3', 15, 28, 'up',    false, 'idle-turn'],
      ['char_4', 11, 26, 'right', false, 'pace', 11, 29],
      ['char_4', 21, 27, 'right', false, 'wander'],
      ['char_2', 24, 29, 'right', true,  'idle-turn'],
      ['char_5', 23, 24, 'down',  false, 'wander'],
      ['char_5', 31, 24, 'up',    false, 'pace', 31, 27],
      ['char_1', 34, 29, 'up',    false, 'idle-turn'],
      ['char_3', 29, 28, 'right', false, 'idle-turn'],
    ];

    this.npcList = [];
    for (const [key, col, row, facing, flipX, behavior, paceCol, paceRow] of defs) {
      if (!this.textures.exists(key)) continue;
      const baseFrame = facing === 'down' ? 0 : facing === 'up' ? 7 : 14;
      const sprite = this.add.sprite(col * T + T / 2, row * T + T / 2, key, baseFrame)
        .setScale(CHAR_SCALE).setFlipX(flipX).setDepth(40 + row * 0.01);
      this.npcList.push({
        sprite, behavior,
        homeCol: col, homeRow: row,
        paceCol: paceCol ?? col, paceRow: paceRow ?? row,
        col, row, facing, flipX,
        moving: false,
        fromCol: col, fromRow: row, toCol: col, toRow: row,
        moveT: 1,
        frameIdx: 0, frameTick: 0,
        waitTimer: Math.random() * 3,
      });
    }
  }

  // ── Player ───────────────────────────────────────────────────────────────────

  private createPlayer(): void {
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
        frameRate: 8, repeat: -1,
      });
    }
  }

  private setupCamera(): void {
    this.cameras.main
      .setBounds(0, 0, MAP_COLS * T, MAP_ROWS * T)
      .startFollow(this.player, true)
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

  private movePlayer(dt: number): void {
    const goLeft  = this.cursors.left.isDown  || this.wasd.left.isDown  || this.dpad.left;
    const goRight = this.cursors.right.isDown || this.wasd.right.isDown || this.dpad.right;
    const goUp    = this.cursors.up.isDown    || this.wasd.up.isDown    || this.dpad.up;
    const goDown  = this.cursors.down.isDown  || this.wasd.down.isDown  || this.dpad.down;

    const hasChar = this.textures.exists('char');
    let dx = (goRight ? 1 : 0) - (goLeft ? 1 : 0);
    let dy = (goDown  ? 1 : 0) - (goUp   ? 1 : 0);

    if (dx === 0 && dy === 0) { if (hasChar) this.player.stop(); return; }

    if (hasChar) {
      if      (dx < 0) { this.player.play('walk-right', true); this.player.setFlipX(true); }
      else if (dx > 0) { this.player.play('walk-right', true); this.player.setFlipX(false); }
      else if (dy < 0) { this.player.play('walk-up',    true); this.player.setFlipX(false); }
      else             { this.player.play('walk-down',  true); this.player.setFlipX(false); }
    }

    const len = Math.sqrt(dx * dx + dy * dy);
    dx = (dx / len) * PLAYER_SPEED * dt;
    dy = (dy / len) * PLAYER_SPEED * dt;

    const { x, y } = this.player;
    const r = PLAYER_R;
    const walk = (wx: number, wy: number) => walkableAt(this.mapData, wx, wy, T);

    const nx = x + dx;
    if (walk(nx-r,y-r) && walk(nx+r,y-r) && walk(nx-r,y+r) && walk(nx+r,y+r))
      this.player.x = nx;

    const ny = y + dy;
    if (walk(this.player.x-r,ny-r) && walk(this.player.x+r,ny-r) &&
        walk(this.player.x-r,ny+r) && walk(this.player.x+r,ny+r))
      this.player.y = ny;
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

  // ── UI ───────────────────────────────────────────────────────────────────────

  private createUI(): void {
    const { width, height } = this.scale;

    this.promptText = this.add
      .text(width / 2, height - 44, '', {
        fontSize: '12px', color: '#ffffff',
        backgroundColor: '#00000099', padding: { x: 14, y: 7 }, fontFamily: 'monospace',
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
    bg.fillStyle(0x0d0b1a, 0.94); bg.fillRoundedRect(0, 0, pw, ph, 10);
    bg.lineStyle(2, 0xf0d060, 0.85); bg.strokeRoundedRect(0, 0, pw, ph, 10);
    const title = this.add.text(pw/2, 22, '', {
      fontSize: '15px', color: '#f0d060', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setName('title');
    const desc = this.add.text(pw/2, 52, '', {
      fontSize: '11px', color: '#e0e0d0', fontFamily: 'monospace',
      align: 'center', wordWrap: { width: pw - 40 }, lineSpacing: 5,
    }).setOrigin(0.5, 0).setName('desc');
    const hint = this.add.text(pw/2, ph-18, '[ ESC ]  Tutup', {
      fontSize: '9px', color: '#555555', fontFamily: 'monospace',
    }).setOrigin(0.5, 1);
    return this.add.container((width-pw)/2, (height-ph)/2, [bg, title, desc, hint])
      .setScrollFactor(0).setDepth(200).setVisible(false);
  }

  private refreshPrompt(): void {
    if (this.nearbyRoom)
      this.promptText.setText(`[E]  ${this.nearbyRoom.name}`).setVisible(true);
    else
      this.promptText.setVisible(false);
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

  private closePanel(): void { this.infoPanel.setVisible(false); this.panelOpen = false; }

  // ── Virtual D-pad ─────────────────────────────────────────────────────────────

  private createDpad(): void {
    const { width, height } = this.scale;
    const R = 36, GAP = 6, S = R * 2 + GAP;
    const cx = width - S - R - 16, cy = height - S - R - 16;
    const eX = R + 16, eY = height - R - 16;

    const makeBtn = (bx: number, by: number, label: string, onDown: () => void, onUp: () => void) => {
      const g = this.add.graphics().setScrollFactor(0).setDepth(150)
        .setInteractive(new Phaser.Geom.Circle(bx, by, R), Phaser.Geom.Circle.Contains);
      const draw = (pressed: boolean) => {
        g.clear();
        g.fillStyle(0x222244, pressed ? 0.85 : 0.55); g.fillCircle(bx, by, R);
        g.lineStyle(2, 0x6666aa, 0.7);                g.strokeCircle(bx, by, R);
      };
      draw(false);
      this.add.text(bx, by, label, {
        fontSize: '20px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(151);
      g.on('pointerdown', () => { draw(true);  onDown(); });
      g.on('pointerup',   () => { draw(false); onUp();   });
      g.on('pointerout',  () => { draw(false); onUp();   });
    };

    makeBtn(cx,     cy-S, '↑', () => this.dpad.up    = true, () => this.dpad.up    = false);
    makeBtn(cx,     cy+S, '↓', () => this.dpad.down  = true, () => this.dpad.down  = false);
    makeBtn(cx-S,   cy,   '←', () => this.dpad.left  = true, () => this.dpad.left  = false);
    makeBtn(cx+S,   cy,   '→', () => this.dpad.right = true, () => this.dpad.right = false);
    makeBtn(eX,     eY,   'E', () => this.handleE(),          () => {});
  }

  // ── NPC AI ────────────────────────────────────────────────────────────────────

  private updateNpcs(dt: number): void {
    for (const n of this.npcList) {
      if (n.moving) {
        n.moveT = Math.min(1, n.moveT + dt * NPC_SPEED);
        const x = (n.fromCol + (n.toCol - n.fromCol) * n.moveT) * T + T / 2;
        const y = (n.fromRow + (n.toRow - n.fromRow) * n.moveT) * T + T / 2;
        n.sprite.setPosition(x, y).setDepth(40 + n.toRow * 0.01);
        n.frameTick += dt;
        if (n.frameTick >= 1 / NPC_WALK_FPS) { n.frameTick -= 1 / NPC_WALK_FPS; n.frameIdx = (n.frameIdx + 1) % 7; }
        const base = n.facing === 'down' ? 0 : n.facing === 'up' ? 7 : 14;
        n.sprite.setFrame(base + n.frameIdx).setFlipX(n.flipX);
        if (n.moveT >= 1) {
          n.moving = false; n.col = n.toCol; n.row = n.toRow;
          n.fromCol = n.toCol; n.fromRow = n.toRow;
          n.frameIdx = 0; n.frameTick = 0;
          n.sprite.setFrame(base);
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
        const opts: [Facing, boolean][] = [['down',false],['up',false],['right',false],['right',true]];
        [n.facing, n.flipX] = opts[Math.floor(Math.random() * opts.length)];
        n.sprite.setFrame(n.facing === 'down' ? 0 : n.facing === 'up' ? 7 : 14).setFlipX(n.flipX);
        n.waitTimer = 2 + Math.random() * 3;
        break;
      }
      case 'wander': {
        const dirs = [[0,-1],[0,1],[-1,0],[1,0]].sort(() => Math.random() - 0.5);
        for (const [dc, dr] of dirs) {
          const tc = n.col + dc, tr = n.row + dr;
          if (Math.abs(tc - n.homeCol) + Math.abs(tr - n.homeRow) <= 3 &&
              walkableAt(this.mapData, tc * T + T/2, tr * T + T/2, T)) {
            this.npcStartMove(n, tc, tr, dc as -1|0|1, dr as -1|0|1); return;
          }
        }
        n.waitTimer = 1 + Math.random();
        break;
      }
      case 'pace': {
        const atA = n.col === n.homeCol && n.row === n.homeRow;
        const tc = atA ? n.paceCol : n.homeCol;
        const tr = atA ? n.paceRow : n.homeRow;
        const dc = Math.sign(tc - n.col) as -1|0|1;
        const dr = Math.sign(tr - n.row) as -1|0|1;
        const nc = n.col + (dc || 0), nr = n.row + (dr || 0);
        if (walkableAt(this.mapData, nc * T + T/2, nr * T + T/2, T))
          this.npcStartMove(n, nc, nr, dc, dr);
        else
          n.waitTimer = 1;
        break;
      }
    }
  }

  private npcStartMove(n: NpcData, tc: number, tr: number, dc: -1|0|1, dr: -1|0|1): void {
    n.moving = true; n.toCol = tc; n.toRow = tr; n.moveT = 0; n.frameIdx = 0; n.frameTick = 0;
    if      (dr < 0) { n.facing = 'up';    n.flipX = false; }
    else if (dr > 0) { n.facing = 'down';  n.flipX = false; }
    else if (dc > 0) { n.facing = 'right'; n.flipX = false; }
    else             { n.facing = 'right'; n.flipX = true;  }
  }
}
