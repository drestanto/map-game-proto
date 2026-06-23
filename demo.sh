#doitlive prompt: {user.cyan}@{hostname.green}:{cwd.blue}$
#doitlive speed: 3
#doitlive shell: /bin/bash

# ───────────────────────────────────────────────
#  Campus Game — perjalanan dari NOL sampai JADI
#  Game orientasi Kampus Cakrawala (Phaser 3 + TS)
# ───────────────────────────────────────────────

echo "Oke... mulai dari kosong. Bikin game orientasi kampus 2D."

echo "Stack-nya: Phaser 3 + TypeScript + Vite. Gas."

# Awalnya cuma folder kosong + niat
ls -la

echo "Step 1 — setup project & install Phaser..."
cat package.json

echo "Step 2 — bikin MAP kampus. 38x32 tile, 5 tipe tile."
echo "WALL, FLOOR, ROOM, LIBRARY, DOOR. Digambar prosedural."
wc -l src/map/campusLayout.ts

echo "Step 3 — render map + player yang bisa jalan (tile-based collision)."
wc -l src/scenes/CampusScene.ts

echo "Step 4 — tiap ruangan dikasih warna tint beda. 11 ruangan!"
grep -c "drawRoom" src/map/campusLayout.ts

echo "Step 5 — tambah furniture dari pixel-agents (desk, sofa, plant, dll)."
ls public/assets/furniture | head -20

echo "Step 6 — spawn NPC char_1..char_5, kasih behavior: idle/wander/pace."
echo "Step 7 — D-pad buat main di HP. Multi-touch."

echo "Sekarang... liat perjalanannya lewat git history:"
git log --oneline --reverse

echo "Build production-nya beneran jalan ga? Cek..."
npm run build

echo "DONE. Dari folder kosong... jadi game orientasi kampus. 🎮🔥"
