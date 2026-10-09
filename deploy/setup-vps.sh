#!/usr/bin/env bash
# One-time VPS setup for the Utune API + worker (Ubuntu 22.04 / 24.04).
# Safe to re-run: every step checks before it installs.
#
# Usage (on the VPS, as a sudo-capable user, NOT root):
#   curl -fsSL https://raw.githubusercontent.com/maulana-tech/Utune-AI/main/deploy/setup-vps.sh -o setup-vps.sh
#   bash setup-vps.sh --domain api.example.com            # Upstash / external Redis
#   bash setup-vps.sh --domain api.example.com --redis    # also install Redis on this VPS
#
# Options:
#   --domain <host>   subdomain for the API; installs Caddy with automatic HTTPS
#   --redis           install redis-server locally (REDIS_URL="redis://localhost:6379")
#   --repo <url>      git URL (default: https://github.com/maulana-tech/Utune-AI.git)
#   --dir <path>      where the app lives (default: ~/app — the CI deploy job expects this)
#
# The first run stops after cloning so you can fill in .env, then run it again.
set -euo pipefail

DOMAIN=""
WITH_REDIS=0
REPO="https://github.com/maulana-tech/Utune-AI.git"
APP_DIR="$HOME/app"
while [ $# -gt 0 ]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    --redis) WITH_REDIS=1; shift ;;
    --repo) REPO="$2"; shift 2 ;;
    --dir) APP_DIR="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

step() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }
[ "$(id -u)" -eq 0 ] && { echo "Run as a normal sudo user, not root (PM2 should not run as root)."; exit 1; }

step "System packages"
sudo apt-get update -y
sudo apt-get install -y curl git ca-certificates python3 python3-venv ufw

step "Node.js 22 + pnpm + PM2"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
command -v pnpm >/dev/null || sudo npm install -g pnpm@9.15.0
command -v pm2 >/dev/null || sudo npm install -g pm2
node -v && pnpm -v && pm2 -v

if [ "$WITH_REDIS" -eq 1 ]; then
  step "Redis (local)"
  sudo apt-get install -y redis-server
  sudo systemctl enable --now redis-server
  redis-cli ping
fi

step "Code"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"

if [ ! -f .env ]; then
  cp deploy/env.vps.example .env
  chmod 600 .env
  echo
  echo "Created $APP_DIR/.env from deploy/env.vps.example."
  echo "Fill it in (nano $APP_DIR/.env), then run this script again."
  exit 0
fi
chmod 600 .env

step "Dependencies"
pnpm install --frozen-lockfile
[ -x apps/workers/.venv/bin/python ] || python3 -m venv apps/workers/.venv
apps/workers/.venv/bin/pip install -q -r apps/workers/requirements.txt

step "Build"
pnpm turbo build --filter=api --filter=workers

step "Database schema"
pnpm --filter @repo/db push
pnpm --filter @repo/db rls   # lock the Supabase Data API out of every table

step "PM2"
pm2 startOrReload ecosystem.config.js --update-env
pm2 save
# Start PM2 on boot (prints and runs the systemd command for this user).
sudo env PATH="$PATH" "$(command -v pm2)" startup systemd -u "$USER" --hp "$HOME" >/dev/null

if [ -n "$DOMAIN" ]; then
  step "Caddy (HTTPS for $DOMAIN)"
  if ! command -v caddy >/dev/null; then
    sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
    sudo apt-get update -y && sudo apt-get install -y caddy
  fi
  sed "s/api.example.com/$DOMAIN/" deploy/Caddyfile | sudo tee /etc/caddy/Caddyfile >/dev/null
  sudo systemctl reload caddy || sudo systemctl restart caddy
fi

step "Firewall"
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable   # 3001 (API) and 6379 (Redis) stay closed to the internet

step "Check"
sleep 3
curl -fsS http://localhost:3001/health && echo
if [ -n "$DOMAIN" ]; then
  echo "Public: https://$DOMAIN/health (TLS can take a minute on first run)"
fi
pm2 status
echo
echo "Done. Logs: pm2 logs api | pm2 logs workers"
