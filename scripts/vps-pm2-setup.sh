#!/usr/bin/env bash
# Setup VPS: pasang dependency, build frontend, atur port & URL API, jalankan PM2 (backend + frontend terpisah).
# Prasyarat: Node.js 18+, npm. PM2 global: npm i -g pm2
# Jalankan dari mana pun: bash scripts/vps-pm2-setup.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

upsert_env_line() {
  local file="$1" key="$2" val="$3"
  if [[ -f "$file" ]] && grep -q "^${key}=" "$file"; then
    local esc
    esc=$(printf '%s\n' "$val" | sed -e 's/[&/\]/\\&/g')
    sed -i "s|^${key}=.*|${key}=${esc}|" "$file"
  else
    printf '%s=%s\n' "$key" "$val" >>"$file"
  fi
}

merge_cors_frontend() {
  local file="$1"
  local ph="$2"
  local fport="$3"
  local o1="http://${ph}:${fport}"
  local o2="http://127.0.0.1:${fport}"
  local o3="http://localhost:${fport}"
  local merged="${o1},${o2},${o3}"

  if [[ ! -f "$file" ]]; then
    printf 'CORS_ORIGINS=%s\n' "$merged" >>"$file"
    return
  fi

  if grep -q '^CORS_ORIGINS=' "$file"; then
    local cur
    cur=$(grep '^CORS_ORIGINS=' "$file" | head -1 | cut -d= -f2-)
    local add="$merged"
    if [[ -n "$cur" ]]; then
      for piece in "${o1}" "${o2}" "${o3}"; do
        if [[ ",${cur}," != *",${piece},"* ]]; then
          cur="${cur},${piece}"
        fi
      done
      add="$cur"
    fi
    upsert_env_line "$file" CORS_ORIGINS "$add"
  else
    printf 'CORS_ORIGINS=%s\n' "$merged" >>"$file"
  fi
}

echo "=== Scraptor — setup PM2 (backend + frontend terpisah) ==="
echo ""

read -rp "Port backend [3008]: " BP
BP=${BP:-3008}
read -rp "Port frontend — Vite preview [3009]: " FP
FP=${FP:-3009}

read -rp "Host publik untuk URL (IP atau domain, tanpa http/https): " PH
PH=${PH:-127.0.0.1}
PH="${PH#http://}"
PH="${PH#https://}"
PH="${PH%%/*}"

DEF_API="http://${PH}:${BP}"
read -rp "URL API untuk browser — tanpa slash di akhir [${DEF_API}]: " APIBASE
APIBASE=${APIBASE:-"$DEF_API"}
APIBASE="${APIBASE%/}"

DEPLOY_ENV="$ROOT/deploy.env"
cat >"$DEPLOY_ENV" <<EOF
# Dibuat otomatis oleh scripts/vps-pm2-setup.sh — jangan commit (lihat .gitignore)
export SCRAPTOR_BACKEND_PORT=${BP}
export SCRAPTOR_FRONTEND_PORT=${FP}
EOF

ENV_BACKEND="$ROOT/backend/.env"
if [[ ! -f "$ENV_BACKEND" ]]; then
  touch "$ENV_BACKEND"
fi
upsert_env_line "$ENV_BACKEND" PORT "${BP}"
merge_cors_frontend "$ENV_BACKEND" "${PH}" "${FP}"

DEF_FE_ORIG="http://${PH}:${FP}"
read -rp "FRONTEND_ORIGINS — untuk token API (pisah koma) [${DEF_FE_ORIG}]: " FEORIG
FEORIG=${FEORIG:-"$DEF_FE_ORIG"}
FEORIG="${FEORIG%/}"
upsert_env_line "$ENV_BACKEND" FRONTEND_ORIGINS "$FEORIG"

if [[ -f "$ENV_BACKEND" ]] && ! grep -q '^PUBLIC_ACCESS_SECRET=' "$ENV_BACKEND"; then
  if command -v openssl &>/dev/null; then
    PSEC="$(openssl rand -hex 32)"
    upsert_env_line "$ENV_BACKEND" PUBLIC_ACCESS_SECRET "$PSEC"
  fi
fi

FE_PROD_LOCAL="$ROOT/frontend/.env.production.local"
cat >"$FE_PROD_LOCAL" <<EOF
# Build-time: base URL API untuk browser (Vite)
VITE_API_BASE_URL=${APIBASE}
EOF

echo ""
echo "Menulis: deploy.env, backend/.env (PORT, CORS_ORIGINS, FRONTEND_ORIGINS), frontend/.env.production.local"
echo ""

if ! command -v npm &>/dev/null; then
  echo "npm tidak ditemukan. Pasang Node.js LTS dulu."
  exit 1
fi

echo "npm install (backend)..."
(cd "$ROOT/backend" && npm install)

echo "npm install (frontend)..."
(cd "$ROOT/frontend" && npm install)

echo "npm run build (frontend, VITE_API_BASE_URL=${APIBASE})..."
(cd "$ROOT/frontend" && npm run build)

if ! command -v pm2 &>/dev/null; then
  echo ""
  echo "PM2 belum terpasang. Pasang: npm i -g pm2"
  echo "Lalu jalankan:"
  echo "  set -a && source $DEPLOY_ENV && set +a && cd $ROOT && pm2 start ecosystem.config.cjs && pm2 save"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$DEPLOY_ENV"
set +a

pm2 delete scraptor-backend 2>/dev/null || true
pm2 delete scraptor-frontend 2>/dev/null || true
pm2 start "$ROOT/ecosystem.config.cjs"
pm2 save

echo ""
echo "Selesai."
echo "  Backend (PM2: scraptor-backend)  → listen PORT=${BP} (cek backend/.env)"
echo "  Frontend (PM2: scraptor-frontend) → Vite preview host 0.0.0.0 port ${FP}"
echo "  Browser memanggil API: ${APIBASE}"
echo ""
echo "Perintah berguna: pm2 status | pm2 logs | pm2 restart scraptor-backend scraptor-frontend"
echo "Agar hidup setelah reboot VPS: pm2 startup   lalu jalankan perintah yang ditampilkan, lalu pm2 save"
