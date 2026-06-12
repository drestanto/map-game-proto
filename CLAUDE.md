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
│          KORIDOR LUAR                │  row 8–10
│[Kantin]  ┌─[PERPUSTAKAAN]─┐  [TU]   │  row 9–22
│          └────────────────┘         │
├──────────────────────────────────────┤
│          KORIDOR LUAR                │  row 22–24
│[Mushola] [Aula] [UKM] [R.Rapat]     │  row 23–31
└──────────────────────────────────────┘
```

Player spawn: kolom 19, baris 9 (koridor atas, tengah).

## Cara Tambah Ruangan Baru

1. Di `campusLayout.ts`, tambah `drawRoom(map, r1, c1, r2, c2)` di `buildCampusMap()`
2. Tambah entri `RoomInfo` di array `ROOMS` dengan `labelCol/Row` dan `triggerCol/Row`
3. Pintu: `door(map, row, col)` di titik yang tepat

## Cara Tambah Karakter Sprite (pixel-agents)

1. Download `char_0.png` dari pixel-agents repo ke `public/assets/characters/`
2. Cek dimensi frame-nya (biasanya 16×16 atau 32×48)
3. Update `PreloadScene.preload()`:
   ```ts
   this.load.spritesheet('char', 'assets/characters/char_0.png', {
     frameWidth: 16, frameHeight: 16, // sesuaikan
   });
   ```
4. Di `CampusScene.createPlayer()`, ganti ke `this.add.sprite(x, y, 'char')`
5. Tambahkan animasi walk di `create()` dengan `this.anims.create(...)`

## Backlog (Belum Diimplementasi)

- [ ] **Quest System** — NPC kasih misi, track progress
- [ ] **NPC** — karakter yang bisa diajak bicara (pakai pixel-agents sprites)
- [ ] **Minimap** — tampilkan posisi player di corner
- [ ] **Multiple floors/areas** — pindah antara gedung via pintu khusus
- [ ] **Sound** — BGM + SFX langkah kaki
- [ ] **Save/Load** — simpan posisi & progress quest
- [ ] **Mobile controls** — virtual joystick untuk HP

## Dev Commands

```bash
npm install       # install dependencies
npm run dev       # start dev server (localhost:3000)
npm run build     # build production ke dist/
npm run preview   # preview build
```
