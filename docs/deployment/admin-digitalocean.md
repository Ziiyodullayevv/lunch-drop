# Admin panelni DigitalOcean serverga CI/CD qilish

Bu sozlama `admin/` Next.js ilovasini GitHub Actions orqali build qiladi, Docker image'ni GitHub Container Registry'ga yuboradi va DigitalOcean serverda `docker compose` bilan yangilaydi.

Joriy production server:

```text
IP: 159.203.188.17
Domain: lunchdrop.uz
Public ports: 80, 443
Internal admin app port: admin:8082
```

## 0. Domainni serverga bog'lash

Domain DNS panelida quyidagi yozuvlarni qo'shing:

```text
Type  Name  Value
A     @     159.203.188.17
A     www   159.203.188.17
```

DNS tarqalishini tekshirish:

```bash
dig +short lunchdrop.uz
dig +short www.lunchdrop.uz
```

Ikkalasi ham `159.203.188.17` qaytarishi kerak.

## 1. Serverni tayyorlash

DigitalOcean droplet ichida:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git

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
NEXT_SERVER_API_URL=http://164.90.210.222:8000
DOMAIN=lunchdrop.uz
SUBDOMAINS=www
SSL_EMAIL=you@example.com
TZ=Asia/Tashkent
PUID=1000
PGID=1000
EOF
```

`SSL_EMAIL` ni haqiqiy emailingizga almashtiring.

Compose fayl SWAG reverse proxy va admin container bilan quyidagicha ko'rinishda bo'ladi:

```yaml
services:
  swag:
    image: lscr.io/linuxserver/swag:latest
    container_name: launch-drop-swag
    cap_add:
      - NET_ADMIN
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
    environment:
      PUID: ${PUID:-1000}
      PGID: ${PGID:-1000}
      TZ: ${TZ:-Asia/Tashkent}
      URL: ${DOMAIN:?DOMAIN is required}
      SUBDOMAINS: ${SUBDOMAINS:-www}
      VALIDATION: http
      EMAIL: ${SSL_EMAIL:?SSL_EMAIL is required}
      ONLY_SUBDOMAINS: false
    volumes:
      - ./swag-config:/config

  admin:
    image: ${ADMIN_IMAGE:-ghcr.io/OWNER/launch-drop-admin:latest}
    container_name: launch-drop-admin
    restart: unless-stopped
    expose:
      - '8082'
    environment:
      NODE_ENV: production
      NEXT_SERVER_API_URL: ${NEXT_SERVER_API_URL:-${NEXT_PUBLIC_SERVER_URL:?NEXT_SERVER_API_URL is required}}
      NEXT_PUBLIC_SERVER_URL: ${NEXT_PUBLIC_SERVER_URL:-}
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
NEXT_SERVER_API_URL=http://164.90.210.222:8000
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

## 4. SWAG reverse proxy va SSL

Avval 80 va 443 portlar ochiq bo'lishi kerak. Agar `ufw` ishlatilsa:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

SWAG'ni birinchi marta ishga tushiring. U Let's Encrypt SSL sertifikatni o'zi oladi:

```bash
cd /opt/launch-drop-admin
docker compose up -d swag
docker logs -f launch-drop-swag
```

Logda sertifikat olingani ko'ringandan keyin admin uchun root domain proxy config yarating:

```bash
cat > swag-config/nginx/site-confs/default.conf <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name lunchdrop.uz www.lunchdrop.uz;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name lunchdrop.uz www.lunchdrop.uz;

    include /config/nginx/ssl.conf;

    client_max_body_size 0;

    location / {
        include /config/nginx/proxy.conf;
        include /config/nginx/resolver.conf;
        set $upstream_app admin;
        set $upstream_port 8082;
        set $upstream_proto http;
        proxy_pass $upstream_proto://$upstream_app:$upstream_port;
    }
}
EOF
```

HTTP'dan HTTPS'ga redirect SWAG default site orqali ishlaydi. Containerlarni ishga tushiring:

```bash
docker compose up -d
docker logs -f launch-drop-swag
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
docker logs -f launch-drop-swag
curl -I https://lunchdrop.uz
```
