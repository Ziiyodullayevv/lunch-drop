#!/usr/bin/env bash
# LunchDrop — deploy / yangilash skripti.
# Serverda ishlatish:  sudo /home/lunchdrop/deploy/deploy.sh
#
# Bajaradi: git pull -> bog'liqliklar -> migratsiya -> supervisor restart.

set -euo pipefail

APP_DIR="/home/lunchdrop"
VENV="$APP_DIR/venv"
PROGRAM="lunchdrop"        # supervisor [program:...] nomi
HEALTH_URL="http://127.0.0.1:8000/api/v1/health"

cd "$APP_DIR"

echo "==> 1/4 Kodni yangilash (git pull)"
git pull

echo "==> 2/4 Bog'liqliklar (requirements.txt)"
"$VENV/bin/pip" install -q -r requirements.txt

echo "==> 3/4 Migratsiya (alembic upgrade head)"
"$VENV/bin/alembic" upgrade head

echo "==> 4/4 Servisni qayta ishga tushirish (supervisor)"
supervisorctl restart "$PROGRAM"

echo "--- holat ---"
supervisorctl status "$PROGRAM"

echo "--- sog'liq tekshiruvi ---"
sleep 2
curl -fsS "$HEALTH_URL" && echo "" && echo "✅ Deploy tayyor." || {
  echo "⚠️  Health javob bermadi. Loglar: supervisorctl tail -f $PROGRAM"
  exit 1
}
