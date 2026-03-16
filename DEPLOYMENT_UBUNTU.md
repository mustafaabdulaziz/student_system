# Ubuntu 24.04 Sunucuya Deployment Planı

Bu rehber, **student_system** projesini (Flask backend + React frontend) Ubuntu 24.04 sunucuda domain ile, güvenli ve sorunsuz çalışacak şekilde deploy etmek için adım adım plan ve komutları içerir.

---

## Genel mimari

```
İnternet → Domain (örn. app.sizindomain.com)
              ↓
         Nginx (443 HTTPS)
              ├── /         → Frontend (statik build)
              ├── /api      → Backend (Gunicorn, port 5000)
              └── /uploads  → Yüklenen dosyalar (opsiyonel Nginx ile)
         PostgreSQL (localhost)
```

---

## Ön koşullar

- Ubuntu 24.04 LTS sunucu (root veya sudo erişimi)
- Domain adınızın DNS’te bu sunucuya yönlendirilmesi (A kaydı: sunucu IP’si)
- SSH ile sunucuya erişim

---

## Faz 1: Sunucu hazırlığı ve güvenlik

### 1.1 Güncelleme ve temel paketler

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git software-properties-common
```

### 1.2 Firewall (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### 1.3 (Önerilen) Ayrı deploy kullanıcısı

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG sudo deploy
# Sonra deploy kullanıcısı ile SSH ile giriş yapıp aşağıdaki adımları bu kullanıcı ile yapabilirsiniz.
```

---

## Faz 2: Domain ve DNS

1. Domain sağlayıcınızda (GoDaddy, Cloudflare, Namecheap vb.):
   - **A kaydı:** `app` (veya `@`) → Sunucunuzun **public IP** adresi.
2. DNS yayılımını bekleyin (birkaç dakika–saat). Kontrol:
   ```bash
   dig app.sizindomain.com +short
   # veya
   nslookup app.sizindomain.com
   ```
   Çıkan IP, sunucu IP’nizle aynı olmalı.

---

## Faz 3: PostgreSQL kurulumu ve veritabanı

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

Veritabanı ve kullanıcı oluşturma (güçlü bir şifre kullanın):

```bash
sudo -u postgres psql -c "CREATE USER studentapp WITH PASSWORD 'GÜÇLÜ_ŞİFRE_BURAYA';"
sudo -u postgres psql -c "CREATE DATABASE studentdb OWNER studentapp;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE studentdb TO studentapp;"
```

---

## Faz 4: Backend (Flask + Gunicorn)

### 4.1 Python ve bağımlılıklar

```bash
sudo apt install -y python3-pip python3-venv
cd /var/www   # veya tercih ettiğiniz dizin
sudo mkdir -p student_system
sudo chown $USER:$USER student_system
cd student_system
git clone <REPO_URL> .   # veya projeyi scp/rsync ile atın
# Proje yapısı: backend/, frontend/, uploads/ (reorganize sonrası)
```

### 4.2 Sanal ortam ve Gunicorn

```bash
cd /var/www/student_system/backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn
```

### 4.3 Ortam değişkenleri (.env)

```bash
nano /var/www/student_system/backend/.env
```

İçeriği (kendi değerlerinizle):

```env
DATABASE_URL=postgresql://studentapp:GÜÇLÜ_ŞİFRE_BURAYA@localhost:5432/studentdb
FLASK_ENV=production
SECRET_KEY=rastgele-uzun-ve-guvenli-bir-anahtar-32-byte
```

- `SECRET_KEY`: `openssl rand -hex 32` ile üretebilirsiniz.
- Production’da **asla** `backend/.env` dosyasını Git’e eklemeyin.

### 4.4 Gunicorn ile test

```bash
cd /var/www/student_system/backend
source .venv/bin/activate
gunicorn --bind 127.0.0.1:5000 "run:app"
# Tarayıcıda http://SUNUCU_IP:5000 açılmıyorsa doğru (sadece Nginx üzerinden erişeceğiz).
# Ctrl+C ile durdurun.
```

### 4.5 Systemd servisi

```bash
sudo nano /etc/systemd/system/student-backend.service
```

İçerik:

```ini
[Unit]
Description=Student System Flask Backend
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/student_system/backend
Environment="PATH=/var/www/student_system/backend/.venv/bin"
EnvironmentFile=/var/www/student_system/backend/.env
ExecStart=/var/www/student_system/backend/.venv/bin/gunicorn --workers 2 --bind 127.0.0.1:5000 --timeout 120 "run:app"
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

- Proje farklı bir kullanıcıyla çalışacaksa `User=` ve `Group=` değiştirin; dosya sahipliğini de ona verin:
  ```bash
  sudo chown -R www-data:www-data /var/www/student_system
  ```

```bash
sudo systemctl daemon-reload
sudo systemctl enable student-backend
sudo systemctl start student-backend
sudo systemctl status student-backend
```

---

## Faz 5: Frontend build ve statik dosyalar

### 5.1 Node.js (LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

### 5.2 Build

```bash
cd /var/www/student_system/frontend
npm ci
npm run build
```

Build çıktısı `frontend/dist/` içinde olacak. Bu klasörü Nginx’in servis edeceği dizin olarak kullanacağız.

---

## Faz 6: Nginx (reverse proxy + HTTPS)

### 6.1 Nginx kurulumu

```bash
sudo apt install -y nginx
```

### 6.2 Site konfigürasyonu (domain ile)

`DOMAIN` yerine kendi domain’inizi yazın (örn. `app.sizindomain.com`).

```bash
sudo nano /etc/nginx/sites-available/student-system
```

İçerik (HTTP + HTTPS hazırlığı):

```nginx
server {
    listen 80;
    server_name DOMAIN;   # örn. app.sizindomain.com

    root /var/www/student_system/frontend/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    location /uploads {
        alias /var/www/student_system/uploads;
        add_header Cache-Control "private, no-cache";
    }
}
```

Aktifleştirme:

```bash
sudo ln -s /etc/nginx/sites-available/student-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Bu aşamada `http://DOMAIN` ile site açılmalı; API `/api` üzerinden çalışmalı.

---

## Faz 7: SSL (HTTPS) – Let’s Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d DOMAIN
```

Sorularda e-posta girin, sözleşmeyi kabul edin. Certbot Nginx konfigürasyonunu otomatik güncelleyecek ve HTTPS açılacak.

Yenileme testi:

```bash
sudo certbot renew --dry-run
```

---

## Faz 8: Güvenlik özeti

| Konu | Yapılacak |
|------|------------|
| **Şifreler** | PostgreSQL ve `.env` için güçlü şifre; admin hesabı şifresini ilk girişte değiştirin. |
| **SECRET_KEY** | `.env` içinde benzersiz, rastgele (örn. `openssl rand -hex 32`). |
| **Debug** | Production’da Flask debug kapalı (Gunicorn kullanıldığı için zaten kapalı). |
| **Dosya izinleri** | `backend/.env` sadece uygulama kullanıcısı okusun: `chmod 600 backend/.env`. |
| **Firewall** | Sadece 22, 80, 443 açık (UFW ile yapıldı). |
| **Güncelleme** | Düzenli `apt update && apt upgrade`. |
| **Admin şifresi** | İlk girişte uygulama içinden mutlaka değiştirin. |

İsteğe bağlı ek güvenlik:

- **fail2ban:** SSH brute-force azaltmak için: `sudo apt install fail2ban`
- **Rate limiting:** Nginx’te `limit_req_zone` ile API’yi sınırlayabilirsiniz.

---

## Faz 9: Domain’e bağlama kontrol listesi

- [ ] DNS A kaydı sunucu IP’sine işaret ediyor.
- [ ] Nginx `server_name` doğru domain.
- [ ] Certbot ile SSL alındı, `https://DOMAIN` açılıyor.
- [ ] Tarayıcıda `https://DOMAIN` → frontend yükleniyor.
- [ ] Giriş yapılabiliyor, API istekleri (`/api/...`) çalışıyor.
- [ ] Admin şifresi değiştirildi.

---

## Özet komut sırası (hatırlatma)

1. Sunucu: güncelleme, UFW (22, 80, 443).
2. DNS: A kaydı → sunucu IP.
3. PostgreSQL: kurulum, `studentapp` kullanıcısı, `studentdb` veritabanı.
4. Backend: proje dizini, venv, `pip install -r requirements.txt gunicorn`, `.env`, systemd servisi.
5. Frontend: `npm ci && npm run build`.
6. Nginx: site config (root: `frontend/dist`, `/api` → 5000, `/uploads` → uploads), `sites-enabled` link, reload.
7. SSL: `certbot --nginx -d DOMAIN`.
8. Güvenlik: `.env` izinleri, admin şifresi değişimi.

Bu planı takip ederek hem frontend hem backend’i tek domain üzerinde güvenli şekilde yayına alabilirsiniz. Takıldığınız bir adım olursa hangi faz ve komut olduğunu yazarsanız, o adıma özel detay verebilirim.
