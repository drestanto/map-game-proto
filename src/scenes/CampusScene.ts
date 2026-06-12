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
const PLAYER_RADIUS = T * 0.35; // collision box (slightly smaller than tile)
const PLAYER_SPEED = 160;       // px/s
const INTERACT_DIST = T * 2.2;  // distance to trigger "Press E"

// ─────────────────────────────────────────────────────────────────────────────

export class CampusScene extends Phaser.Scene {
  private mapData!: number[][];
  private player!: Phaser.GameObjects.Image;

  private keys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    w: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    e: Phaser.Input.Keyboard.Key;
    esc: Phaser.Input.Keyboard.Key;
  };

  // UI elements (fixed to camera)
  private promptText!: Phaser.GameObjects.Text;
  private infoPanel!: Phaser.GameObjects.Container;
  private infoPanelVisible = false;

  private nearbyRoom: RoomInfo | null = null;

  constructor() {
    super({ key: 'CampusScene' });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  create(): void {
    this.mapData = buildCampusMap();

    this.renderMap();
    this.addRoomLabels();
    this.addDoorSigns();
    this.createPlayer();
    this.setupCamera();
    this.setupInput();
    this.createUI();
  }

  update(_time: number, delta: number): void {
    if (this.infoPanelVisible) return; // freeze player while info is open

    this.handleMovement(delta / 1000);
    this.checkNearbyRooms();
    this.updatePrompt();
  }

  // ── Map Rendering ──────────────────────────────────────────────────────────

  private renderMap(): void {
    const tileKeys = ['tile_wall', 'tile_floor', 'tile_room', 'tile_library'] as const;

    // Render entire map to a single RenderTexture (1 draw call)
    const rt = this.add.renderTexture(0, 0, MAP_COLS * T, MAP_ROWS * T);
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tileType = this.mapData[row][col];
        rt.draw(tileKeys[tileType], col * T, row * T);
      }
    }
  }

  // ── Room Labels ───────────────────────────────────────────────────────────

  private addRoomLabels(): void {
    for (const room of ROOMS) {
      const x = room.labelCol * T + T / 2;
      const y = room.labelRow * T + T / 2;

      this.add.text(x, y, room.name, {
        fontSize: '9px',
        color: room.id === 'perpustakaan' ? '#1a3a5c' : '#4a3020',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: T * 6 },
      }).setOrigin(0.5).setAlpha(0.85);
    }
  }

  // ── Door Signs ────────────────────────────────────────────────────────────

  private addDoorSigns(): void {
    for (const room of ROOMS) {
      const x = room.triggerCol * T + T / 2;
      const y = (room.triggerRow - 1) * T + T / 2;
      this.add.image(x, y, 'sign').setAlpha(0.7);
    }
  }

  // ── Player ────────────────────────────────────────────────────────────────

  private createPlayer(): void {
    const startCol = 19;
    const startRow = 9; // top corridor, near center
    const x = startCol * T + T / 2;
    const y = startRow * T + T / 2;

    const texture = this.textures.exists('char') ? 'char' : 'player';
    this.player = this.add.image(x, y, texture).setDepth(10);

    if (texture === 'char') {
      this.player.setScale(2); // pixel art — scale up
    }
  }

  // ── Camera ────────────────────────────────────────────────────────────────

  private setupCamera(): void {
    this.cameras.main
      .setBounds(0, 0, MAP_COLS * T, MAP_ROWS * T)
      .startFollow(this.player, true, 0.1, 0.1) // smooth follow
      .setZoom(1.8);
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  private setupInput(): void {
    const kb = this.input.keyboard!;
    this.keys = {
      up:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      w:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      s:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      a:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      d:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      e:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      esc:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
    };

    this.keys.e.on('down', () => this.handleInteract());
    this.keys.esc.on('down', () => this.closeInfoPanel());
  }

  // ── Movement ──────────────────────────────────────────────────────────────

  private handleMovement(dt: number): void {
    let dx = 0, dy = 0;

    if (this.keys.left.isDown  || this.keys.a.isDown)  dx -= 1;
    if (this.keys.right.isDown || this.keys.d.isDown)  dx += 1;
    if (this.keys.up.isDown    || this.keys.w.isDown)  dy -= 1;
    if (this.keys.down.isDown  || this.keys.s.isDown)  dy += 1;

    if (dx === 0 && dy === 0) return;

    // Normalise diagonal movement
    const len = Math.sqrt(dx * dx + dy * dy);
    const moveX = (dx / len) * PLAYER_SPEED * dt;
    const moveY = (dy / len) * PLAYER_SPEED * dt;

    const nx = this.player.x + moveX;
    const ny = this.player.y + moveY;

    // Separate X / Y checks → smooth wall sliding
    if (this.isWalkable(nx, this.player.y - PLAYER_RADIUS) &&
        this.isWalkable(nx, this.player.y + PLAYER_RADIUS)) {
      this.player.x = nx;
    }
    if (this.isWalkable(this.player.x - PLAYER_RADIUS, ny) &&
        this.isWalkable(this.player.x + PLAYER_RADIUS, ny)) {
      this.player.y = ny;
    }
  }

  private isWalkable(worldX: number, worldY: number): boolean {
    const col = Math.floor(worldX / T);
    const row = Math.floor(worldY / T);
    if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return false;
    return this.mapData[row][col] !== TILE.WALL;
  }

  // ── Proximity Detection ───────────────────────────────────────────────────

  private checkNearbyRooms(): void {
    let closest: RoomInfo | null = null;
    let minDist = Infinity;

    for (const room of ROOMS) {
      const tx = room.triggerCol * T + T / 2;
      const ty = room.triggerRow * T + T / 2;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, tx, ty);
      if (dist < INTERACT_DIST && dist < minDist) {
        minDist = dist;
        closest = room;
      }
    }

    this.nearbyRoom = closest;
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  private createUI(): void {
    const { width, height } = this.scale;

    // "Press E" prompt — fixed to camera
    this.promptText = this.add
      .text(width / 2, height - 48, '', {
        fontSize: '13px',
        color: '#ffffff',
        backgroundColor: '#00000099',
        padding: { x: 12, y: 6 },
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

    // Controls hint (bottom-left)
    this.add
      .text(12, height - 16, 'WASD / ↑↓←→  Gerak    E  Info ruangan    ESC  Tutup', {
        fontSize: '10px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      })
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(100);

    // Title
    this.add
      .text(12, 12, 'Kampus Cakrawala', {
        fontSize: '14px',
        color: '#f0d060',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setScrollFactor(0)
      .setDepth(100);

    // Info panel (hidden initially)
    this.infoPanel = this.buildInfoPanel();
  }

  private buildInfoPanel(): Phaser.GameObjects.Container {
    const { width, height } = this.scale;
    const panelW = Math.min(360, width - 40);
    const panelH = 180;
    const panelX = (width - panelW) / 2;
    const panelY = (height - panelH) / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x0d0b1a, 0.92);
    bg.fillRoundedRect(0, 0, panelW, panelH, 8);
    bg.lineStyle(2, 0xf0d060, 0.8);
    bg.strokeRoundedRect(0, 0, panelW, panelH, 8);

    const titleText = this.add
      .text(panelW / 2, 20, '', {
        fontSize: '16px',
        color: '#f0d060',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setName('title');

    const descText = this.add
      .text(panelW / 2, 50, '', {
        fontSize: '11px',
        color: '#e0e0e0',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: panelW - 32 },
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0)
      .setName('desc');

    const closeHint = this.add
      .text(panelW / 2, panelH - 20, '[ ESC ] Tutup', {
        fontSize: '10px',
        color: '#888888',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5, 1);

    const container = this.add
      .container(panelX, panelY, [bg, titleText, descText, closeHint])
      .setScrollFactor(0)
      .setDepth(200)
      .setVisible(false);

    return container;
  }

  private updatePrompt(): void {
    if (this.nearbyRoom) {
      this.promptText
        .setText(`[E] Lihat info — ${this.nearbyRoom.name}`)
        .setVisible(true);
    } else {
      this.promptText.setVisible(false);
    }
  }

  // ── Interaction ───────────────────────────────────────────────────────────

  private handleInteract(): void {
    if (this.infoPanelVisible) {
      this.closeInfoPanel();
      return;
    }
    if (!this.nearbyRoom) return;
    this.openInfoPanel(this.nearbyRoom);
  }

  private openInfoPanel(room: RoomInfo): void {
    const title = this.infoPanel.getByName('title') as Phaser.GameObjects.Text;
    const desc  = this.infoPanel.getByName('desc')  as Phaser.GameObjects.Text;
    title.setText(room.name);
    desc.setText(room.description);

    this.infoPanel.setVisible(true);
    this.promptText.setVisible(false);
    this.infoPanelVisible = true;
  }

  private closeInfoPanel(): void {
    this.infoPanel.setVisible(false);
    this.infoPanelVisible = false;
  }
}
