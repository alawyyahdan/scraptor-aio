#!/usr/bin/env bash
# Setup VPS: dependency, .env, build frontend (VITE_API_BASE_URL), PM2.
# Input hanya 2: URL frontend (yang dibuka di browser) dan URL API publik.
# Port proses di server tetap 3008 (backend) / 3009 (vite preview) — di belakang nginx.
#
#   bash scripts/vps-pm2-setup.sh
#
# Opsional (tanpa prompt): SCRAPTOR_SETUP_FRONTEND_URL=... SCRAPTOR_SETUP_API_URL=... bash scripts/vps-pm2-setup.sh
# Port override: SCRAPTOR_BACKEND_PORT=3008 SCRAPTOR_FRONTEND_PORT=3009 (default)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BP="${SCRAPTOR_BACKEND_PORT:-3008}"
FP="${SCRAPTOR_FRONTEND_PORT:-3009}"

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

# Trim, buang slash akhir; jika tanpa skema → https://
normalize_input_url() {
  local u="$1"
  u="${u#"${u%%[![:space:]]*}"}"
  u="${u%"${u##*[![:space:]]}"}"
  u="${u%/}"
  [[ -z "$u" ]] && { echo ""; return; }
  if [[ ! "$u" =~ ^https?:// ]]; then
    u="https://${u}"
  fi
  echo "$u"
}

# https://foo.com/path → https://foo.com  ;  https://foo.com:3009/x → https://foo.com:3009
origin_only() {
  local u="$1"
  if [[ "$u" =~ ^(https?://[^/]+) ]]; then
    echo "${BASH_REMATCH[1]}"
  else
    echo "$u"
  fi
}

echo "=== Scraptor — setup VPS (2 URL saja) ==="
echo ""
echo "Contoh:"
echo "  URL frontend  → https://scraptor.bica.ca     (alamat yang user buka)"
echo "  URL API       → https://scraptorapi.bica.ca  (nginx → localhost:${BP})"
echo ""
echo "Port di server (boleh diubah lewat env sebelum jalankan skrip): backend=${BP}, frontend preview=${FP}"
echo ""

if [[ -n "${SCRAPTOR_SETUP_FRONTEND_URL:-}" && -n "${SCRAPTOR_SETUP_API_URL:-}" ]]; then
  RAW_FE="${SCRAPTOR_SETUP_FRONTEND_URL}"
  RAW_API="${SCRAPTOR_SETUP_API_URL}"
  echo "Pakai env: FRONTEND=${RAW_FE} | API=${RAW_API}"
else
  read -rp "URL frontend (https://...): " RAW_FE
  read -rp "URL API publik (https://...): " RAW_API
fi

FE_URL="$(normalize_input_url "$RAW_FE")"
API_URL="$(normalize_input_url "$RAW_API")"

if [[ -z "$FE_URL" || -z "$API_URL" ]]; then
  echo "Kedua URL wajib diisi."
  exit 1
fi

FE_ORIGIN="$(origin_only "$FE_URL")"
API_ORIGIN="$(origin_only "$API_URL")"

DEPLOY_ENV="$ROOT/deploy.env"
cat >"$DEPLOY_ENV" <<EOF
# Dibuat otomatis oleh scripts/vps-pm2-setup.sh — jangan commit
export SCRAPTOR_BACKEND_PORT=${BP}
export SCRAPTOR_FRONTEND_PORT=${FP}
EOF

ENV_BACKEND="$ROOT/backend/.env"
[[ -f "$ENV_BACKEND" ]] || touch "$ENV_BACKEND"

upsert_env_line "$ENV_BACKEND" PORT "${BP}"
upsert_env_line "$ENV_BACKEND" FRONTEND_ORIGINS "${FE_ORIGIN}"

if [[ -f "$ENV_BACKEND" ]] && ! grep -q '^PUBLIC_ACCESS_SECRET=' "$ENV_BACKEND"; then
  if command -v openssl &>/dev/null; then
    PSEC="$(openssl rand -hex 32)"
    upsert_env_line "$ENV_BACKEND" PUBLIC_ACCESS_SECRET "$PSEC"
  fi
fi

FE_PROD_LOCAL="$ROOT/frontend/.env.production.local"
cat >"$FE_PROD_LOCAL" <<EOF
# Dibuat oleh scripts/vps-pm2-setup.sh — jangan commit
VITE_API_BASE_URL=${API_ORIGIN}
EOF

echo ""
echo "Menulis:"
echo "  deploy.env              → port PM2 ${BP} / ${FP}"
echo "  backend/.env            → FRONTEND_ORIGINS=${FE_ORIGIN}  PORT=${BP}"
echo "  frontend/.env.production.local → VITE_API_BASE_URL=${API_ORIGIN}"
echo ""

if ! command -v npm &>/dev/null; then
  echo "npm tidak ditemukan. Pasang Node.js LTS dulu."
  exit 1
fi

echo "npm install (backend)..."
(cd "$ROOT/backend" && npm install)

echo "npm install (frontend)..."
(cd "$ROOT/frontend" && npm install)

echo "npm run build (frontend)…"
(cd "$ROOT/frontend" && npm run build)

if ! command -v pm2 &>/dev/null; then
  echo ""
  echo "PM2 belum terpasang: npm i -g pm2"
  echo "Lalu: set -a && source $DEPLOY_ENV && set +a && cd $ROOT && pm2 start ecosystem.config.cjs && pm2 save"
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
echo "  Buka situs dari: ${FE_ORIGIN}"
echo "  Browser memanggil API: ${API_ORIGIN}"
echo "  nginx → backend http://127.0.0.1:${BP} , UI static/preview → 127.0.0.1:${FP}"
echo ""
echo "pm2 status | pm2 logs"
echo "Setelah reboot: pm2 startup  → ikuti perintah → pm2 save"
echo ""
