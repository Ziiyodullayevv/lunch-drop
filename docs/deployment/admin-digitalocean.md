# Admin panelni DigitalOcean serverga CI/CD qilish

Bu sozlama `admin/` Next.js ilovasini GitHub Actions orqali build qiladi, Docker image'ni GitHub Container Registry'ga yuboradi va DigitalOcean serverda `docker compose` bilan yangilaydi.

Joriy production server:

```text
IP: 206.189.229.8
Domain: lunchdrop.uz
Admin app port: 127.0.0.1:8082
```

## 0. Domainni serverga bog'lash

Domain DNS panelida quyidagi yozuvlarni qo'shing:

```text
Type  Name  Value
A     @     206.189.229.8
A     www   206.189.229.8
```

DNS tarqalishini tekshirish:

```bash
dig +short lunchdrop.uz
dig +short www.lunchdrop.uz
```

Ikkalasi ham `206.189.229.8` qaytarishi kerak.

## 1. Serverni tayyorlash

DigitalOcean droplet ichida:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git nginx

curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
```

Serverda compose papkasini yarating:

```bash
sudo mkdir -p /opt/launch-drop-admin
sudo chown -R $USER:$USER /opt/launch-drop-admin
cd /opt/launch-drop-admin
```

`docker-compose.yml` fayliga repo ichidagi `deploy/docker-compose.admin.yml` kontentini ko'chiring.

Yoniga `.env` fayl yarating:

```bash
cat > .env <<'EOF'
ADMIN_IMAGE=ghcr.io/GITHUB_USERNAME/launch-drop-admin:latest
NEXT_PUBLIC_SERVER_URL=http://206.189.229.8:8000
EOF
```

Compose fayl quyidagicha ko'rinishda bo'ladi:

```yaml
services:
  admin:
    image: ${ADMIN_IMAGE:-ghcr.io/OWNER/launch-drop-admin:latest}
    container_name: launch-drop-admin
    restart: unless-stopped
    ports:
      - '127.0.0.1:8082:8082'
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_SERVER_URL: ${NEXT_PUBLIC_SERVER_URL:?NEXT_PUBLIC_SERVER_URL is required}
```

Agar GHCR image private bo'lsa, serverda bir marta login qiling:

```bash
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

Token uchun `read:packages` permission yetadi.

## 2. GitHub Secrets

Repo `Settings -> Secrets and variables -> Actions` bo'limiga qo'shing:

```text
VPS_HOST=server_ip_yoki_domain
VPS_USER=root_yoki_deploy_user
VPS_SSH_KEY=private_ssh_key
NEXT_PUBLIC_SERVER_URL=http://206.189.229.8:8000
```

## 3. SSH key ulash

Local kompyuterda deploy key yarating:

```bash
ssh-keygen -t ed25519 -C "github-actions-launch-drop-admin" -f ~/.ssh/launch_drop_admin_deploy
```

Public key'ni serverga qo'shing:

```bash
ssh-copy-id -i ~/.ssh/launch_drop_admin_deploy.pub USER@SERVER_IP
```

Private key kontentini `VPS_SSH_KEY` secret'iga qo'ying:

```bash
cat ~/.ssh/launch_drop_admin_deploy
```

## 4. Nginx reverse proxy

`/etc/nginx/sites-available/launch-drop-admin`:

```nginx
server {
    listen 80;
    server_name lunchdrop.uz www.lunchdrop.uz;

    location / {
        proxy_pass http://127.0.0.1:8082;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Yoqish:

```bash
sudo ln -s /etc/nginx/sites-available/launch-drop-admin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

SSL kerak bo'lsa:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d lunchdrop.uz -d www.lunchdrop.uz
```

## 5. Deploy qanday ishlaydi

- `admin/**` o'zgarsa `Admin CI` ishga tushadi.
- `main` branchga push bo'lsa CI lint, TypeScript, test va build qiladi.
- CI muvaffaqiyatli tugasa Docker image `ghcr.io/<github-owner>/launch-drop-admin:latest` ga push bo'ladi.
- `Admin CD` serverga SSH qilib `/opt/launch-drop-admin` ichida `docker compose pull && docker compose up -d` bajaradi.

Qo'lda tekshirish:

```bash
docker ps
docker logs -f launch-drop-admin
curl -I http://127.0.0.1:8082
```
