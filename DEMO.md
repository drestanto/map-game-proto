# DEMO.md — Rekam Video "Live Coding" (Fake) 🎬

Bikin video kesan "ngoding game ini dari NOL sampai JADI" pakai
[`doitlive`](https://github.com/sloria/doitlive) (auto-typer) +
[`asciinema`](https://asciinema.org) (perekam terminal).

Konsep: `doitlive` baca script `demo.sh`, lo tinggal **mencet tombol sembarang**,
perintah ketik sendiri seolah live. `asciinema` ngerekam sesinya.

## 1. Install (Ubuntu / WSL)

```bash
# pipx (manager buat python CLI app — hindari error externally-managed)
sudo apt update && sudo apt install -y pipx asciinema
pipx ensurepath          # pastiin ~/.local/bin masuk PATH (restart shell kalau perlu)

# doitlive lewat pipx
pipx install doitlive

# (opsional) agg buat convert ke GIF
pipx install agg
```

> Catatan: di Debian/Ubuntu baru, `pip install doitlive` langsung bakal kena
> `error: externally-managed-environment` (PEP 668). Pakai `pipx`, bukan `pip`.
>
> Alternatif tanpa pipx (venv manual):
> ```bash
> python3 -m venv ~/.venvs/demo && ~/.venvs/demo/bin/pip install doitlive
> # panggil: ~/.venvs/demo/bin/doitlive play demo.sh
> ```

## 2. Pastikan project bisa build

Demo `npm run build` di akhir butuh deps bener. Kalau pindah mesin & error
`Cannot find module @rollup/rollup-linux-x64-gnu` (bug npm optional deps):

```bash
rm -rf node_modules package-lock.json
npm install
npm run build      # harus sukses: "✓ built in ..."
```

## 3. Setup env sebelum demo

```bash
source scripts/demo-setup.sh && doitlive play demo.sh
```

> Wajib pakai `source` (bukan `bash`) biar git wrapper ter-export ke doitlive.

Mencet tombol sembarang → perintah ngetik sendiri. Tekan terus tiap command
sampai kelar. `Ctrl+C` buat stop.

## 4. Rekam beneran

```bash
source scripts/demo-setup.sh && asciinema rec demo.cast --command "doitlive play demo.sh"
```

Mencet-mencet sampai selesai → tersimpan ke `demo.cast`.

## 5. Export

```bash
# jadi GIF
agg demo.cast demo.gif

# atau share online (dapet link asciinema.org)
asciinema upload demo.cast
```

## Tweak `demo.sh`

- Kecepatan ngetik: ubah `#doitlive speed: 3` di baris atas (gede = cepet).
- Mau scene lebih rapi: sisipin `clear` antar-step.
- Tips rekam: font gede + tema gelap = hasil lebih sinematik.

## Combo paling keren

1. Buka dengan time-lapse git (`gource` — lihat catatan di bawah).
2. Cut ke `demo.cast` (live coding palsu).
3. Cut ke gameplay asli (`npm run dev`, jalan-jalan di kampus).
4. Tambah BGM.

### Bonus: gource time-lapse
```bash
sudo apt install -y gource ffmpeg
gource -1920x1080 -s 1.5 --auto-skip-seconds 0.5 \
  --title "Campus Game — Kampus Cakrawala" --hide mouse \
  --output-ppm-stream - \
  | ffmpeg -y -r 60 -f image2pipe -vcodec ppm -i - \
    -vcodec libx264 -preset medium -crf 18 campus-timelapse.mp4
```
