# Cara Jalanin Game

## Prerequisites

- Node.js v18+ terinstall
- Terminal di folder ini (`/mnt/d/coding/game-examples/`)

## Run

```bash
npm install       # hanya perlu sekali (kalau belum)
npm run dev       # jalanin dev server
```

Buka browser ke: **http://localhost:3000**

## Kontrol

| Tombol | Aksi |
|--------|------|
| `WASD` atau `↑↓←→` | Gerakin karakter |
| `E` | Lihat info ruangan (kalau dekat pintu) |
| `ESC` | Tutup info panel |

## Yang Harus Keliatan

1. Peta kampus top-down (gelap = dinding, krem = koridor, putih = ruangan, biru = perpustakaan)
2. Karakter kecil di koridor atas tengah
3. Label nama tiap ruangan
4. Tanda pintu kuning kecil di tiap pintu
5. Kalau karakter dideketin pintu → muncul prompt `[E] Lihat info — Nama Ruangan`
6. Tekan `E` → popup info ruangan

## Kalau Ada Error

```bash
# reset node_modules
rm -rf node_modules
npm install
npm run dev
```

## Build Production

```bash
npm run build     # output ke folder dist/
npm run preview   # preview hasil build
```
