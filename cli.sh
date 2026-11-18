#!/usr/bin/env bash
# Cloudie: one entry point for the whole repo. Your computer only needs Docker (and Git Bash on Windows).
#
#   ./cli.sh                      the project menu (scripts/cli.sh in the dev container)
#   ./cli.sh <action>             one menu action, e.g. ./cli.sh deploy, ./cli.sh help
#   ./cli.sh up | down            start or stop the dev stack (site :5173, API :8788, docs :3000)
#   ./cli.sh logs-dev             follow the dev stack's output
#   ./cli.sh e2e [filter]         Playwright end-to-end tests against the dev stack
#   ./cli.sh app <command>        the Flutter app in mobile/ (docker/app.sh in the Flutter container)
#
# Layout: web/ (SvelteKit), backend/ (api, infra), shared/ (protocol), mobile/ (Flutter). See docs/README.md.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' # Git Bash on Windows: do not rewrite /app paths

die() { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }
step() { printf '\033[1;32m==> %s\033[0m\n' "$*"; }
# -T (no terminal) only when not run from a terminal.
TTY=(); { [ -t 0 ] && [ -t 1 ]; } || TTY=(-T)

# Already inside the dev container (pnpm cli): just run the project CLI.
if [ -f /.dockerenv ] && command -v gum >/dev/null; then exec bash scripts/cli.sh "$@"; fi

command -v docker >/dev/null || die "Docker is not installed. Get it at https://docs.docker.com/get-docker/"

# This computer's address on the Wi-Fi (Linux, macOS, Windows Git Bash). Worked out here, not in a
# container: in Docker Desktop a container only sees the VM's own network.
lan_ip() {
  local ip=""
  if command -v ip >/dev/null 2>&1; then ip="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i = 1; i <= NF; i++) if ($i == "src") { print $(i + 1); exit }}')"; fi
  if [ -z "$ip" ] && command -v ipconfig >/dev/null 2>&1; then
    ip="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
    [ -n "$ip" ] || ip="$(ipconfig 2>/dev/null | tr -d '\r' | awk -F': ' '/IPv4/ {print $2; exit}')"
  fi
  if [ -z "$ip" ] && command -v hostname >/dev/null 2>&1; then ip="$(hostname -I 2>/dev/null | awk '{print $1}')"; fi
  printf '%s' "$ip"
}

# The Flutter container runs as root; docker/app.sh hands files it writes into mobile/ back to you afterwards.
in_flutter() {
  docker image inspect cloudie-flutter:local >/dev/null 2>&1 || { step "Building the Flutter image (first run only, a few minutes)"; docker compose --profile mobile build flutter; }
  HOST_UID="$(id -u)" HOST_GID="$(id -g)" LAN_IP="${LAN_IP:-$(lan_ip)}" docker compose --profile mobile run --rm "${TTY[@]}" flutter /app/docker/app.sh "$@"
}

ensure_up() {
  docker compose ps --status running --services 2>/dev/null | grep -qx app || { step "Starting the dev stack"; docker compose up -d; }
}

# Every other command runs in the dev container, which has pnpm, wrangler, terraform and gum.
in_app() {
  ensure_up
  docker compose exec "${TTY[@]}" app bash scripts/cli.sh "$@"
}

case "${1:-}" in
  app)
    shift
    case "${1:-}" in
      image) docker compose --profile mobile build flutter ;;
      share) # the QR code from the Flutter container, then the APK from the share service until Ctrl+C
        in_flutter share
        rc=0; docker compose --profile mobile up share || rc=$?
        docker compose --profile mobile rm -fs share >/dev/null 2>&1 || true
        exit $rc ;;
      *) in_flutter "$@" ;;
    esac ;;
  up)
    docker compose up -d
    step "Site http://localhost:5173  ·  API http://localhost:8788/api/hello  ·  Docs http://localhost:3000" ;;
  down) docker compose down ;;
  logs-dev) docker compose logs -f app ;;
  e2e) shift; ensure_up; docker compose run --rm e2e "$@" ;;
  *) in_app "$@" ;;
esac
