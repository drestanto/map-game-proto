# Deploy Guide — game.dubius.id

Server: `45.88.188.116`  
Domain: `game.dubius.id` (sudah di-pointing ke server)

---

## 1. Setup Awal di Server (sekali saja)

SSH ke server:

```bash
ssh root@45.88.188.116
```

Install dependencies:

```bash
apt update && apt install -y nginx nodejs npm git
```

Clone repo:

```bash
cd /var/www
git clone https://github.com/drestanto/map-game-proto
cd map-game-proto
npm install
npm run build
```

> Ganti `USERNAME/REPO_NAME` dengan repo GitHub kamu.

### Setup Nginx

Buat config:

```bash
nano /etc/nginx/sites-available/map-game-proto
```

Isi:

```nginx
server {
    listen 80;
    server_name game.dubius.id;

    root /var/www/map-game-proto/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache assets
    location ~* \.(png|jpg|gif|ico|js|css|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

Enable site:

```bash
ln -s /etc/nginx/sites-available/map-game-proto /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### SSL dengan Certbot

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d game.dubius.id
```

Ikuti prompt: masukkan email, setuju ToS, pilih redirect HTTP → HTTPS (opsi 2).

Verifikasi auto-renewal:

```bash
certbot renew --dry-run
```

---

## 2. Re-deploy (Update Game)

SSH ke server lalu jalankan:

```bash
cd /var/www/map-game-proto
git pull
npm install       # kalau ada perubahan dependencies
npm run build
```

Tidak perlu restart Nginx — `dist/` langsung terbaca.

---

## Hasil Akhir

Game bisa diakses di: **https://game.dubius.id**
