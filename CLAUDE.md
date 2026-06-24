# Campus Game — CLAUDE.md

Game orientasi kampus 2D top-down berbasis Phaser 3 + TypeScript + Vite.
Dibuat sebagai tools orientasi untuk Kampus Cakrawala.

## Stack

- **Phaser 3** (v3.88) — game engine (web, canvas/WebGL)
- **TypeScript** — type safety
- **Vite** — dev server & bundler
- **Assets** — prosedural (dibuat via Phaser Graphics) + sprite dari pixel-agents

## Struktur

```
src/                      ← v1 (legacy, masih jalan)
  main.ts
  scenes/
    PreloadScene.ts
    CampusScene.ts
  map/
    campusLayout.ts

src-v2/                   ← v2 (aktif dikembangkan)
  main.ts
  scenes/
    PreloadScene.ts       — sama dengan v1
    CampusScene.ts        — render dari MAP string[][], localStorage position save
  map/
    campusMap.ts          — MAP: string[][] text-based + ROOMS[] + parseObjects()
    codes.ts              — tile codes (TC), object codes (OC/OBJ_ASSET/OBJ_SIZES), ROOM_TINTS
    mapParser.ts          — tileOf(), isWalkable(), walkableAt()
```

v2 dijalankan via `index-v2.html` + `vite.v2.config.ts`.

## Cara Kerja

### Map (`campusLayout.ts`)
- Map: **38 × 32 tiles**, setiap tile **32px**
- 5 tipe tile: `WALL=0`, `FLOOR=1`, `ROOM=2`, `LIBRARY=3`, `DOOR=4`
- Fungsi `buildCampusMap()` menghasilkan `number[][]`
- Ruangan digambar dengan `drawRoom()`: outline wall + isi interior
- Pintu = override wall tile jadi `DOOR`

### Rendering (`CampusScene.renderMap()`)
- Setiap tile di-render sebagai **individual `Image` object** yang dimasukkan ke dalam
  satu **Phaser Layer** (`this.add.layer()`).
- Layer ini sebagai satu entry di scene display list (depth 0).
- **JANGAN pakai single RenderTexture** untuk tilemap — RT bypass depth sorting WebGL
  sehingga tile selalu render di atas sprite player (BUG-006, BUG-008, BUG-009).
- Setiap ruangan mendapat **color tint** via `img.setTint(color)` berdasarkan posisi tile.
- Label ruangan = `Phaser.GameObjects.Text` di posisi tile, depth 5.

### Depth Hierarchy (penting!)
```
mapLayer (depth 0)   — semua tile Image dalam Layer
labels   (depth 5)   — nama ruangan
furniture(depth 7)   — Graphics objek dekorasi
NPCs     (depth 40)  — static sprite char_1–5
player   (depth 50)  — char_0 animated sprite
UI       (depth 100) — prompt, hint, title text
panel    (depth 200) — info panel container
```

### Player Movement
- **Manual tile-based collision** — tidak pakai Phaser Arcade Physics
- `walkable(wx, wy)` cek `mapData[row][col] !== WALL`
- Cek X dan Y terpisah → efek sliding di dinding
- Kecepatan: `PLAYER_SPEED = 150 px/s`
- Collision radius: `PLAYER_R = T * 0.32 = 10.24px`

### Interaksi Ruangan
- Setiap `RoomInfo` punya `triggerCol/triggerRow` (posisi di depan pintu)
- `checkNearby()` cari ruangan terdekat dalam radius `INTERACT_R = 2.2 tiles`
- Tekan `E` → tampilkan info panel ruangan
- Tekan `ESC` → tutup

## Layout Kampus

```
┌──────────────────────────────────────┐
│  [K.101] [K.102] [R.Dosen] [Lab Komp]│  row 1–8
├──────────────────────────────────────┤
│          KORIDOR UTARA               │  row 9–10  ← BEBAS PENUH (38 tile lebar)
│[Kantin]  ┌─[PERPUSTAKAAN]─┐  [TU]   │  row 11–21
│          └────────────────┘         │
├──────────────────────────────────────┤
│          KORIDOR SELATAN             │  row 22    ← BEBAS PENUH (38 tile lebar)
│[Mushola] [Aula] [UKM] [R.Rapat]     │  row 23–31
└──────────────────────────────────────┘
```

Player spawn: kolom 19, baris 16 (tengah Perpustakaan).

### Warna Tint per Ruangan
| Ruangan | Tint |
|---------|------|
| Kelas 101 | `0xe0f0ff` sky blue |
| Kelas 102 | `0xe8ffe0` mint green |
| Ruang Dosen | `0xfff0e0` warm amber |
| Lab Komputer | `0xf0e0ff` soft purple |
| Kantin | `0xffe8d8` warm peach |
| Tata Usaha | `0xe0f4ff` cool blue |
| Perpustakaan | `0xe0e0f8` periwinkle |
| Musholla | `0xffe0e0` rose |
| Aula | `0xfffff0` ivory |
| UKM Center | `0xe0ffe0` sage green |
| Ruang Rapat | `0xffe0f8` orchid |
| Koridor | no tint (natural floor_0) |

Tint hanya pada `TILE.ROOM` dan `TILE.LIBRARY`. WALL dan DOOR tidak di-tint.
Bounds check per ruangan ada di `ROOM_TINTS` array di dalam `renderMap()`.

### Aturan Kritis Pintu & Koridor

**JANGAN pernah** menaruh dinding side-room (Kantin/TU) di row yang sama dengan
koridor akses pintu top-room atau bottom-room.

- Kantin (`cols 1–8`) dan TU (`cols 29–36`) harus span **rows 11–21**
- Koridor north (rows 9–10) harus bebas di seluruh lebar
- Koridor south (row 22) harus bebas di seluruh lebar
- Library doors: **4-tile wide** (cols 17–20) — effective passthrough 3.36 tiles

## Furniture System

### Asset Source
Semua furniture dari pixel-agents, sudah dicopy ke `public/assets/furniture/`.
Tiap item adalah PNG terpisah per orientasi (FRONT/BACK/SIDE).

### Cara Tambah Furniture

1. **Load di `PreloadScene.preload()`** (sudah ada semua — cek dulu sebelum tambah):
   ```typescript
   fi('KEY_NAME', 'FOLDER/FILE.png');
   ```

2. **Place di `CampusScene.addRoomObjects()`** via helper `furn()`:
   ```typescript
   furn('KEY_NAME', col, row);          // normal
   furn('KEY_NAME', col, row, true);    // flipX untuk arah berlawanan
   ```
   - Origin `(0,0)` → koordinat = sudut kiri-atas sprite
   - Scale `2×` → 1 pixel-agents unit (16px) = 1 game tile (32px)
   - Depth `7 + row*0.01` (di bawah NPC depth 40)

### Available Assets & Ukuran (pada scale 2×)

| Key | File | Ukuran di game (tile W×H) |
|-----|------|---------------------------|
| `DESK_FRONT` | DESK/DESK_FRONT.png | 3×2 |
| `DESK_SIDE` | DESK/DESK_SIDE.png | 1×4 |
| `SMALL_TABLE_FRONT` | SMALL_TABLE/SMALL_TABLE_FRONT.png | 2×2 |
| `SMALL_TABLE_SIDE` | SMALL_TABLE/SMALL_TABLE_SIDE.png | 1×3 |
| `COFFEE_TABLE` | COFFEE_TABLE/COFFEE_TABLE.png | 2×2 |
| `BOOKSHELF` | BOOKSHELF/BOOKSHELF.png | 2×1 |
| `DOUBLE_BOOKSHELF` | DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png | 2×2 |
| `WHITEBOARD` | WHITEBOARD/WHITEBOARD.png | 2×2 |
| `WOODEN_CHAIR_FRONT/BACK/SIDE` | WOODEN_CHAIR/... | 1×2 |
| `CUSHIONED_CHAIR_FRONT/BACK/SIDE` | CUSHIONED_CHAIR/... | 1×1 |
| `CUSHIONED_BENCH` | CUSHIONED_BENCH/... | 1×1 |
| `WOODEN_BENCH` | WOODEN_BENCH/... | 1×1 |
| `SOFA_FRONT/BACK` | SOFA/... | 2×1 |
| `SOFA_SIDE` | SOFA/SOFA_SIDE.png | 1×2 |
| `PC_FRONT_ON_1/OFF` | PC/... | 1×2 |
| `PC_BACK/SIDE` | PC/... | 1×2 |
| `PLANT` / `PLANT_2` | PLANT/... | 1×2 |
| `LARGE_PLANT` | LARGE_PLANT/... | 2×3 |
| `HANGING_PLANT` | HANGING_PLANT/... | 1×2 |
| `CACTUS` | CACTUS/... | 1×2 |
| `POT` | POT/POT.png | 1×1 |
| `BIN` | BIN/BIN.png | 1×1 |
| `CLOCK` | CLOCK/CLOCK.png | 1×2 |
| `COFFEE` | COFFEE/COFFEE.png | 1×1 |
| `SMALL_PAINTING` / `SMALL_PAINTING_2` | ... | 1×2 |
| `LARGE_PAINTING` | LARGE_PAINTING/... | 2×2 |

### Konvensi Orientasi
- `FRONT` → menghadap kamera (selatan), taruh di sisi selatan ruangan
- `BACK` → membelakangi kamera (utara), taruh di sisi utara ruangan  
- `SIDE` → samping; gunakan `flipX=true` untuk arah berlawanan
- PC: gunakan `PC_FRONT_ON_1` untuk PC menyala, `PC_FRONT_OFF` untuk mati

### Tips Placement
- Wall-mounted items (WHITEBOARD, CLOCK, BOOKSHELF, PAINTING): taruh di `row` dinding (misal row 1 untuk north wall)
- Items di atas desk (PC): taruh di koordinat sama dengan desk, depth otomatis overlap dengan benar
- Jangan taruh furniture di tile WALL atau koridor — cuma tile ROOM/LIBRARY/FLOOR

## NPC System

### Sprites (`char_1`–`char_5`)
- Spritesheet 112×96 → frame 16×32, 3 rows × 7 cols = 21 frames
- Frame 0=south, 7=north, 14=east, 14+flipX=west
- Scale 2× → tampil 32×64 (1×2 tile)
- Dibuat & dikelola di `CampusScene.addRoomObjects()` → disimpan di `this.npcList`

### NPC Behavior (rule-based, bukan AI)
Setiap NPC punya salah satu dari 3 behavior (di-assign di array `defs` dalam `addRoomObjects()`):

| Behavior | Cara Kerja |
|----------|------------|
| `idle-turn` | Diam di tempat, random noleh tiap 2–5 detik |
| `wander` | Jalan random max 3 tile dari spawn, lalu balik |
| `pace` | Bolak-balik antara `home` (A) dan `paceCol/paceRow` (B) |

**Interface `NpcData`** (di CampusScene.ts):
```typescript
{ sprite, behavior, homeCol, homeRow, paceCol, paceRow,
  col, row, facing, flipX, moving,
  fromCol, fromRow, toCol, toRow, moveT,
  frameIdx, frameTick, waitTimer }
```

**Cara tambah NPC:**
```typescript
// di array defs dalam addRoomObjects():
['char_2', col, row, 'down', false, 'wander'],
['char_3', col, row, 'right', false, 'pace', destCol, destRow],
```

**Update loop**: `updateNpcs(dt)` → `npcDecide(n)` → `npcStartMove(n, ...)` dipanggil tiap frame di `update()`. NPC speed: `NPC_SPEED = 1.5` tiles/detik.

### Furniture (pixel-agents sprites, depth 7)
Semua furniture adalah real PNG dari pixel-agents, bukan Graphics lagi.
Lihat section **Furniture System** di atas untuk detail asset & placement.

## Cara Tambah Ruangan Baru

1. Di `campusLayout.ts`, tambah `drawRoom(map, r1, c1, r2, c2)` di `buildCampusMap()`
2. Tambah entri `RoomInfo` di array `ROOMS` dengan `labelCol/Row` dan `triggerCol/Row`
3. Pintu: `door(map, row, col)` di titik yang tepat
4. Tambah entry di `ROOM_TINTS` array di `renderMap()` untuk warna ruangan
5. Tambah furniture dan NPC di `addRoomObjects()`

## Pixel-agents Assets

Semua aset dari `https://github.com/pixel-agents-hq/pixel-agents/tree/main/webview-ui/public/assets`.
Download: `curl -sf -o "path/file.png" "https://raw.githubusercontent.com/pixel-agents-hq/pixel-agents/main/webview-ui/public/assets/..."`.

### Floor Tiles yang Dipakai
| Asset | Digunakan untuk |
|-------|-----------------|
| `floor_0.png` | Koridor (light stone) |
| `floor_3.png` | Ruang kelas/kantor (grid tile) |
| `floor_7.png` | Perpustakaan (dark checker) |

`floor_1.png`–`floor_8.png` tersedia semua di `public/assets/floors/`, belum dipakai.

### Character Sprites
- `char_0.png` — player utama (animated, 4 arah)
- `char_1.png`–`char_5.png` — NPC statis di dalam ruangan
- Semua: 112×96 px → 7 kolom × 3 baris, frame 16×32, scale 2× → 32×64

Frame layout (dikonfirmasi via analisis pixel):
```
Row 0 (frames  0– 6): walk south (↓) — menghadap kamera
Row 1 (frames  7–13): walk north (↑) — membelakangi kamera
Row 2 (frames 14–20): walk east  (→) — setFlipX(true) untuk west (←)
```

## Mobile Controls

Virtual D-pad dibuat di `createDpad()` (di-call dari `create()`):
- **D-pad** (bottom-right): 4 tombol lingkaran ↑↓←→
- **E button** (bottom-left): interact / buka info panel
- Multi-touch: `activePointers: 4` di `main.ts` → bisa tekan diagonal sekaligus
- Setiap tombol set `this.dpad.left/right/up/down = true/false` on pointerdown/up/out
- `movePlayer()` baca `this.dpad.*` sama seperti keyboard input

## Status Saat Ini (per 2026-06-24)

### v2 — Sudah Berjalan
- Map 38×32 **text-based** (`string[][]`) — tile + object dalam 1 cell, e.g. `"RXQ"` = room + desk + PC
- Furniture di-parse otomatis dari MAP via `parseObjects()` → tidak ada hardcode koordinat
- Tile render: Layer + individual Image (depth 0), tint per ruangan dari `ROOM_TINTS`
- Player movement tile-based collision + animasi 3-arah
- Info panel ruangan (E / ESC)
- 11 ruangan lengkap dengan deskripsi
- NPC char_1–5: idle-turn, wander, pace
- Mobile D-pad + E button
- **localStorage position save** — `campus_player_pos` disimpan tiap 1 detik, di-load saat `createPlayer()`

### v1 — Legacy (masih jalan, tidak dikembangkan)
- Map via `buildCampusMap()` number[][], furniture hardcode di `addRoomObjects()`

### Backlog
- [ ] **Quest System** — NPC kasih misi, track progress
- [ ] **Minimap** — tampilkan posisi player di corner
- [ ] **Multiple floors/areas** — pindah antara gedung via pintu khusus
- [ ] **Sound** — BGM + SFX langkah kaki
- [ ] **NPC dialog** — tekan E di dekat NPC untuk dialog sederhana

## Bug Log — Jangan Diulang

### BUG-001: Camera zoom terlalu tinggi
- **Gejala**: Map terasa kecil, tidak keliatan overview kampus
- **Fix**: `setZoom(1.0)` → viewport 30×20 tiles

### BUG-002: Kelas 101 dan Lab Komputer tidak bisa diakses
- **Root cause**: Kantin/TU dimulai di row 9 → nutup koridor north
- **Fix**: Pindah Kantin & TU ke `drawRoom(map, 11, ...)` agar rows 9–10 bebas

### BUG-003: Musholla dan Ruang Rapat tidak bisa diakses
- **Root cause**: Kantin/TU berakhir di row 22 → nutup koridor south
- **Fix**: End di row 21, membuka row 22 sebagai koridor selatan

### BUG-004: Player spawn langsung stuck
- **Fix**: Spawn di col 19, row 16 (dalam Perpustakaan)

### BUG-005: Player Image tidak support animasi
- **Fix**: Ganti ke `this.add.sprite(...)` + `setupAnimations()`

### BUG-006: Tile visual/collision mismatch — rt.draw() centering
- **Root cause**: `rt.draw(key, x, y)` CENTER tile di (x,y) → offset 16px
- **Fix**: Ganti ke `rt.drawFrame(key, undefined, x, y)` di KEDUA tempat
- **Lesson**: SELALU pakai `rt.drawFrame()`, JANGAN `rt.draw()` untuk texture key

### BUG-007: Library door corner-trap
- **Root cause**: Door 2-tile → effective passthrough 1.36 tiles → player stuck
- **Fix**: Perlebar door ke 4 tile (cols 17–20) → 3.36 tiles passthrough

### BUG-008: RenderTexture origin (0.5,0.5) — map tampil offset −608px,−512px
- **Root cause**: `add.renderTexture(0,0,w,h)` default origin (0.5,0.5)
- **Fix**: Tambah `.setOrigin(0,0)` — lalu diganti total ke approach Layer+Image
- **Lesson**: Jangan pakai RT besar sebagai tilemap display object

### BUG-009: Sprite kelihatan kayak balok / terpotong (FIXED)
- **Gejala**: Player & NPC terlihat sebagai blok 32×32 solid
- **Root cause**: `frameHeight: 16` salah — spritesheet sebenarnya 7×3 rows dengan frame 16×**32**
  (bukan 16×16). Dengan frame 16px, hanya ½ badan terlihat dan terpotong di batas frame.
- **Fix**: `frameHeight: 32` di PreloadScene untuk char_0–5 → sprite tampil 32×64 (benar)
- **Confirmed via**: analisis pixel numpy pada char_0.png — 3 strip of 32px each

## Dev Commands

```bash
npm install       # install dependencies
npm run dev       # start dev server (localhost:3000)
npm run build     # build production ke dist/
npm run preview   # preview build
```
