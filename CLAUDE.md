# Campus Game — CLAUDE.md

Game orientasi kampus 2D top-down berbasis Phaser 3 + TypeScript + Vite.
Dibuat sebagai tools orientasi untuk Kampus Cakrawala.

## Stack

- **Phaser 3** — game engine (web, canvas/WebGL)
- **TypeScript** — type safety
- **Vite** — dev server & bundler
- **Assets** — prosedural (dibuat via Phaser Graphics) + opsional sprite dari pixel-agents

## Struktur

```
src/
  main.ts                 — Phaser game config & entry point
  scenes/
    PreloadScene.ts       — load aset eksternal + buat tile/player textures
    CampusScene.ts        — main scene: map, player, kamera, interaksi
  map/
    campusLayout.ts       — definisi tile, map builder, data semua ruangan
```

## Cara Kerja

### Map (`campusLayout.ts`)
- Map: **38 × 32 tiles**, setiap tile **32px**
- 4 tipe tile: `WALL=0`, `FLOOR=1`, `ROOM=2`, `LIBRARY=3`
- Fungsi `buildCampusMap()` menghasilkan `number[][]`
- Ruangan digambar dengan `drawRoom()`: outline wall + isi interior
- Pintu = override wall tile jadi `FLOOR`

### Rendering (`CampusScene`)
- Seluruh peta di-render ke satu `RenderTexture` (1 draw call, efisien)
- Label ruangan = `Phaser.GameObjects.Text` di posisi tile
- Tanda pintu kecil = sprite kuning kecil

### Player Movement
- **Manual tile-based collision** — tidak pakai Phaser Arcade Physics
- `isWalkable(x, y)` cek `mapData[row][col] !== WALL`
- Cek X dan Y terpisah → efek sliding di dinding
- Kecepatan: `PLAYER_SPEED = 160 px/s`

### Interaksi Ruangan
- Setiap `RoomInfo` punya `triggerCol/triggerRow` (posisi di depan pintu)
- `checkNearbyRooms()` cari ruangan terdekat dalam radius `INTERACT_DIST = 2.2 tiles`
- Tekan `E` → tampilkan info panel ruangan
- Tekan `ESC` → tutup

## Layout Kampus

```
┌──────────────────────────────────────┐
│  [K.101] [K.102] [R.Dosen] [Lab Komp]│  row 1–8
├──────────────────────────────────────┤
│          KORIDOR UTARA               │  row 9–10  ← BEBAS PENUH (32 tile lebar)
│[Kantin]  ┌─[PERPUSTAKAAN]─┐  [TU]   │  row 11–21
│          └────────────────┘         │
├──────────────────────────────────────┤
│          KORIDOR SELATAN             │  row 22    ← BEBAS PENUH (32 tile lebar)
│[Mushola] [Aula] [UKM] [R.Rapat]     │  row 23–31
└──────────────────────────────────────┘
```

Player spawn: kolom 19, baris 16 (tengah Perpustakaan — overview terbaik kampus).

### Aturan Kritis Pintu & Koridor

**JANGAN pernah** menaruh dinding side-room (Kantin/TU) di row yang sama dengan
koridor akses pintu top-room atau bottom-room. Ini menyebabkan ruangan tidak bisa
diakses sama sekali. Aturan:

- Kantin (`cols 1–8`) dan TU (`cols 29–36`) harus span **rows 11–21**
  (bukan 9–22). Ini membuka koridor north (rows 9–10) dan south (row 22) sepenuhnya.
- Koridor north (rows 9–10) harus bebas di seluruh lebar agar semua 4 pintu
  top-rooms (cols 4-5, 13-14, 22-23, 32-33 di row 8) bisa diakses.
- Koridor south (row 22) harus bebas di seluruh lebar agar semua 4 pintu
  bottom-rooms (cols 4-5, 13-14, 22-23, 32-33 di row 23) bisa diakses.

## Cara Tambah Ruangan Baru

1. Di `campusLayout.ts`, tambah `drawRoom(map, r1, c1, r2, c2)` di `buildCampusMap()`
2. Tambah entri `RoomInfo` di array `ROOMS` dengan `labelCol/Row` dan `triggerCol/Row`
3. Pintu: `door(map, row, col)` di titik yang tepat

## Pixel-agents Assets

Semua aset dari `https://github.com/pixel-agents-hq/pixel-agents/tree/main/webview-ui/public/assets`.
Download dengan `curl -sf -o "path/file.png" "https://raw.githubusercontent.com/pixel-agents-hq/pixel-agents/main/webview-ui/public/assets/..."`.

### Tile System

Layout format mengacu `default-layout-1.json`:
- `tiles[]`: flat array `row * cols + col` = tile value
- Tile values: `255` = void, `0` = wall, `1/3/7/9` = floor variants
- `tileColors[]`: per-tile HSB adjustment `{h,s,b,c}`

Floor tiles yang dipakai di game ini:
| Asset | Digunakan untuk |
|-------|-----------------|
| `floor_0.png` | Koridor (light stone) |
| `floor_3.png` | Ruang kelas/kantor (grid tile) |
| `floor_7.png` | Perpustakaan (dark checker) |

### Character Sprite (`char_0.png`)

- Ukuran: 112×96 px → 7 kolom × 6 baris, frame 16×16
- **Di-scale 2× di game** (`setScale(2)`) → tampil 32×32 px
- Frame layout (asumsi — sesuaikan jika animasi terlihat salah):
  ```
  Row 0 (frames  0– 6): walk south (↓)
  Row 1 (frames  7–13): walk west  (←)
  Row 2 (frames 14–20): walk east  (→)
  Row 3 (frames 21–27): walk north (↑)
  ```
- Animasi dibuat di `CampusScene.setupAnimations()` dengan `frameRate: 8`
- Player harus pakai `this.add.sprite(...)` bukan `this.add.image(...)` agar animasi jalan

## Status Saat Ini (per 2026-06-18)

### Sudah Berjalan
- Map 38×32 render dengan tile pixel-agents (floor_0/3/7, wall procedural)
- Player movement tile-based collision dengan wall-sliding
- Animasi walk 4-arah dari char_0.png (spritesheet 7×6 frame)
- Info panel ruangan (tekan E, tutup ESC)
- 11 ruangan terdefinisi lengkap dengan deskripsi
- Zoom 1.0 → overview kampus terlihat baik

### Perlu Dilakukan Sebelum Session Berikutnya
- ~~Debug corner markers sudah dihapus~~ ✓
- ~~BUG-006 fix (`rt.drawFrame`) dikonfirmasi dan BUG-008 (RT origin) sudah fix~~ ✓

### Assets Tersedia (belum dipakai)
- `public/assets/characters/char_1.png` … `char_5.png` — sudah didownload,
  siap dipakai sebagai **NPC statis** (diam di dekat pintu ruangan)
- `public/assets/floors/floor_1.png` … `floor_8.png` — tersedia semua

## Backlog (Belum Diimplementasi)

- [ ] **NPC statis** — char_1–5 ditempatkan diam di depan ruangan (assets sudah ada)
- [ ] **Quest System** — NPC kasih misi, track progress
- [ ] **Minimap** — tampilkan posisi player di corner
- [ ] **Multiple floors/areas** — pindah antara gedung via pintu khusus
- [ ] **Sound** — BGM + SFX langkah kaki
- [ ] **Save/Load** — simpan posisi & progress quest
- [ ] **Mobile controls** — virtual joystick untuk HP

## Bug Log — Jangan Diulang

### BUG-001: Camera zoom terlalu tinggi
- **Gejala**: Map terasa kecil, tidak keliatan overview kampus
- **Root cause**: `setZoom(2)` di `setupCamera()` — viewport hanya 15×10 tiles dari map 38×32
- **Fix**: `setZoom(1.0)` → viewport 30×20 tiles (79%×63% map sekaligus terlihat)

### BUG-002: Kelas 101 dan Lab Komputer tidak bisa diakses
- **Gejala**: Player tidak bisa masuk ke ruangan pojok atas (Kelas 101, Lab Komputer)
- **Root cause**: Kantin (`drawRoom(map, 9, ...)`) dan TU (`drawRoom(map, 9, ...)`) dimulai
  di **row 9**, sehingga north wall Kantin/TU menempel langsung ke row 9 di cols 4-5 dan 32-33.
  Pintu Kelas 101 (row 8, cols 4-5) dan Lab Komputer (row 8, cols 32-33) berada tepat di atas
  Kantin/TU wall → **inaccessible**.
- **Fix**: Pindah Kantin & TU ke `drawRoom(map, 11, ...)` agar rows 9–10 jadi koridor bebas

### BUG-003: Musholla dan Ruang Rapat tidak bisa diakses
- **Gejala**: Sama seperti BUG-002, tapi untuk ruangan pojok bawah
- **Root cause**: Kantin/TU berakhir di **row 22** — south wall mereka menempel ke north wall
  Musholla (row 23, cols 1-9) dan Ruang Rapat (row 23, cols 28-36). Pintu di cols 4-5 dan
  32-33 tidak terjangkau dari koridor.
- **Fix**: Pindah Kantin & TU akhir ke row 21, membuka row 22 sebagai koridor selatan bebas

### BUG-004: Player spawn langsung stuck ke atas
- **Gejala**: Menekan UP dari spawn awal (col 19, row 9) hanya bergerak ~6 pixel
- **Root cause**: Row 8, col 19 adalah south wall Ruang Dosen tanpa pintu (pintu di cols 22-23).
  Collision radius PLAYER_R = 10.24px memblok gerakan ke atas hampir seketika.
- **Fix**: Spawn player di col 19, row 16 (dalam Perpustakaan) — bisa bebas gerak ke atas
  melalui library north door (row 11, cols 18-19) dan ke bawah melalui library south door (row 20)

### BUG-006: Tile visual/collision mismatch — rt.draw() pakai origin (0.5, 0.5)
- **Gejala**: Semua tile floor & wall tampak 16px terlalu ke kiri dan ke atas dibanding
  collision grid → player berjalan di visual floor padahal collision menganggapnya di wall
- **Root cause**: `rt.draw(key, x, y)` — baik dengan Image object maupun texture key string —
  selalu meng-CENTER tile di (x, y). Untuk tile 32×32, top-left visual jatuh di (x−16, y−16).
  Tapi collision pakai (col×T, row×T) sebagai top-left → **offset 16px permanen di X dan Y**.
  Bug ini ada di DUA tempat yang terpisah:
  1. `PreloadScene.buildFloorTexture()` — saat membangun tile textures dari 16×16 floor images
  2. `CampusScene.renderMap()` — saat meletakkan tile textures ke map RenderTexture
  Fix partial (hanya PreloadScene) menyebabkan tiles "geser" tapi tetap salah — karena
  renderMap masih menggunakan `rt.draw()`.
- **Fix**: Di KEDUA tempat, ganti `rt.draw(...)` dengan `rt.drawFrame(key, undefined, x, y)`.
  `drawFrame` selalu draw dari TOP-LEFT — tidak ada origin issue.
- **Lesson**: Setiap kali draw ke RenderTexture, SELALU pakai `rt.drawFrame(key, frame, x, y)`.
  JANGAN pakai `rt.draw(key/image, x, y)` — behavior centering-nya tidak intuitif dan
  tidak terlihat jelas dari API signature.

### BUG-007: Library door terlalu sempit → corner-trap
- **Gejala**: Player freeze total ketika drift ke tepi pintu library
- **Root cause**: Door 2-tile (64px) dengan PLAYER_R=10.24 → effective passthrough hanya
  43.5px (1.36 tiles). Saat player tepat di tepi pintu, collision corner masuk ke wall —
  semua 4 arah gerak (X/Y check) gagal serentak → player completely stuck.
- **Fix**: Widen library doors dari 2 tile (cols 18-19) ke 4 tile (cols 17-20) →
  effective passthrough jadi 3.36 tiles. Sangat forgiving.
- **Lesson**: Effective passthrough = door_width_px - 2*PLAYER_R. Untuk PLAYER_R=10.24,
  butuh door minimal 3 tile (~86px) agar player bisa lewat nyaman.

### BUG-008: RenderTexture origin (0.5,0.5) — map tampil offset −608px,−512px
- **Gejala**: Map tiles hanya tampil di sudut kiri atas viewport; player muncul di area
  gelap di luar map; debug markers bertebaran di posisi aneh
- **Root cause**: `this.add.renderTexture(0, 0, w, h)` membuat RT dengan default origin
  (0.5, 0.5), sehingga top-left RT jatuh di world (−w/2, −h/2) = (−608, −512), bukan (0, 0).
  Player di-spawn di world (624, 528) — di luar range visual RT (−608..608, −512..512).
- **Fix**: Tambah `.setOrigin(0, 0)` setelah `this.add.renderTexture(...)` di `renderMap()`
- **Lesson**: Selalu set `.setOrigin(0, 0)` pada RenderTexture yang dipakai sebagai tilemap,
  agar posisi world (0,0) = pojok kiri atas map sesuai ekspektasi.

### BUG-005: Player Image tidak support animasi
- **Gejala**: Karakter statis meski pixel-agents char_0.png sudah punya walk frames
- **Root cause**: `this.add.image(...)` tidak punya `.play()` di Phaser 3
- **Fix**: Ganti ke `this.add.sprite(...)` + `setupAnimations()` + `.play()` di `movePlayer()`

## Dev Commands

```bash
npm install       # install dependencies
npm run dev       # start dev server (localhost:3000)
npm run build     # build production ke dist/
npm run preview   # preview build
```
