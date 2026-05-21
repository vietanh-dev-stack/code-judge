#!/usr/bin/env bash
# One-time bootstrap for Code Judge production on Ubuntu 24.04 LTS x64.
# Run on the VPS as a user with sudo (not root-only session required).
#
#   chmod +x deploy/ubuntu-24.04-setup.sh
#   ./deploy/ubuntu-24.04-setup.sh
#
set -euo pipefail

require_ubuntu_2404() {
  if [[ ! -f /etc/os-release ]]; then
    echo "Cannot detect OS. This script targets Ubuntu 24.04 LTS x64."
    exit 1
  fi
  # shellcheck source=/dev/null
  source /etc/os-release
  if [[ "${ID:-}" != "ubuntu" ]] || [[ "${VERSION_ID:-}" != "24.04" ]]; then
    echo "Warning: expected Ubuntu 24.04 (found: ${PRETTY_NAME:-unknown})."
    echo "Compose production is tested for Ubuntu 24.04 LTS x64; continue at your own risk."
    read -r -p "Continue? [y/N] " ans
    [[ "${ans,,}" == "y" ]] || exit 1
  fi
  local arch
  arch="$(uname -m)"
  if [[ "$arch" != "x86_64" ]]; then
    echo "Warning: expected x86_64 (found: $arch). Images use platform linux/amd64."
  fi
}

require_ubuntu_2404

echo "==> System packages"
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg ufw

echo "==> Docker Engine + Compose plugin (official install script)"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
else
  echo "Docker already installed: $(docker --version)"
fi

sudo usermod -aG docker "$USER" || true

echo "==> UFW (SSH + HTTP + API port for IP-only deploy)"
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp comment 'code-judge web'
sudo ufw allow 8080/tcp comment 'code-judge api (IP-only)'
# sudo ufw allow 443/tcp   # enable after HTTPS (certbot)
sudo ufw --force enable
sudo ufw status

echo "==> Optional: 2G swap if RAM < 6GB (helps Judge0 + Postgres on small VPS)"
total_ram_mb="$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)"
if [[ "$total_ram_mb" -lt 6144 ]] && [[ ! -f /swapfile ]]; then
  echo "RAM ~${total_ram_mb}MB — creating 2G swapfile (recommended for Judge0)."
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  fi
fi

echo ""
echo "Setup done."
echo "  1. Log out and SSH back in (docker group: $USER)"
echo "  2. Đồng bộ code từ máy dev qua SSH (deploy/sync-to-vps.ps1 hoặc rsync/WinSCP) — không dùng git clone GitHub"
echo "  3. cp .env.production.example .env.production → chỉnh secret"
echo "  4. ./deploy/production-up.sh"
echo ""
echo "Verify after deploy:"
echo "  docker compose -f docker-compose.production.yml --env-file .env.production ps"
echo "  curl -s http://127.0.0.1:8080/tags | head"
