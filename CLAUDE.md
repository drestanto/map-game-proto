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
src/
  main.ts                 — Phaser game config & entry point
  scenes/
    PreloadScene.ts       — load aset eksternal + buat tile textures (tile_wall/floor/room/library/door)
    CampusScene.ts        — main scene: map, player, NPC, kamera, interaksi
  map/
    campusLayout.ts       — definisi tile, map builder, data semua ruangan (ROOMS[])
```

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

## NPC & Furniture

### Static NPCs (`char_1`–`char_5`)
- Dimuat di PreloadScene sebagai spritesheet (16×16 frame, sama dengan char_0)
- Ditempatkan di `CampusScene.addRoomObjects()`, depth 40
- Frame: 0=south, 7=west, 14=east, 21=north
- Scale 2× → tampil 32×32
- Tiap ruangan punya 2–4 NPC

### Furniture (Phaser Graphics, depth 7)
- Kelas 101/102/Dosen/Lab: meja kuliah 2 baris × 3 meja
- Library: rak buku di dinding utara & selatan + meja baca
- Kantin: meja kasir panjang + 4 meja makan
- Tata Usaha: meja resepsionis panjang
- Musholla: sajadah 4×4 (hijau)
- Aula: panggung/podium
- Ruang Rapat: meja konferensi
- UKM: sofa/meja santai (biru)

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
- Semua: 112×96 px → 7 kolom × 6 baris, frame 16×16, scale 2× → 32×32

Frame layout (asumsi — sesuaikan jika animasi terlihat salah):
```
Row 0 (frames  0– 6): walk south (↓)
Row 1 (frames  7–13): walk west  (←)
Row 2 (frames 14–20): walk east  (→)
Row 3 (frames 21–27): walk north (↑)
```

## Status Saat Ini (per 2026-06-19)

### Sudah Berjalan
- Map 38×32 render dengan tile pixel-agents (floor_0/3/7, wall procedural)
- Setiap ruangan punya color tint berbeda via `setTint()`
- Player movement tile-based collision dengan wall-sliding
- Animasi walk 4-arah dari char_0.png
- Info panel ruangan (tekan E, tutup ESC)
- 11 ruangan terdefinisi lengkap dengan deskripsi
- Static NPC char_1–5 tersebar di semua ruangan (2–4 per ruangan)
- Furniture Graphics per ruangan (meja, rak, sajadah, panggung, dsb)
- Zoom 1.0 → overview kampus terlihat baik

### Backlog
- [x] **BUG-009: Sprite kelihatan kayak balok (FIXED)** — ternyata BUKAN clipping/occlusion.
  Depth order (mapLayer 0 < NPC 40 < player 50) sudah benar, tile tak mungkin menutupi sprite.
  Root cause: frame char_N 16×16 diisi penuh oleh figur (bbox ~1–14 × 2–15) + `setScale(2)`
  → sprite jadi tepat 32×32 = 1 tile penuh, jadi tampak seperti balok (apalagi frame "south"
  didominasi rambut). Fix: `CHAR_SCALE = 1.5` (24px) untuk player & NPC → ada margin lantai.
- [ ] **Quest System** — NPC kasih misi, track progress
- [ ] **Minimap** — tampilkan posisi player di corner
- [ ] **Multiple floors/areas** — pindah antara gedung via pintu khusus
- [ ] **Sound** — BGM + SFX langkah kaki
- [ ] **Save/Load** — simpan posisi & progress quest
- [ ] **Mobile controls** — virtual joystick untuk HP
- [ ] **NPC interaksi** — tekan E di dekat NPC untuk dialog sederhana

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

### BUG-009: Sprite ngeclip ke tile grid (OPEN — di backlog)
- **Gejala**: Player & NPC terpotong mengikuti batas tile 32×32
- **Sudah dicoba**: depth -1 vs 50, saveTexture+Image, Layer — semua tidak fix
- **Hipotesis**: Phaser 3.88 WebGL depth sorting quirk dengan pixelArt+roundPixels config

## Dev Commands

```bash
npm install       # install dependencies
npm run dev       # start dev server (localhost:3000)
npm run build     # build production ke dist/
npm run preview   # preview build
```
