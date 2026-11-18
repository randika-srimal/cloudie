#!/usr/bin/env bash
# Cloudie project CLI: every project command behind a gum menu.
#
#   ./cli.sh                 interactive menu (from your computer; runs this in the dev container)
#   ./cli.sh <action>        run one action, e.g. ./cli.sh deploy (see ./cli.sh help)
#
# Runs inside the dev container (it needs gum, pnpm, wrangler and terraform).
# Cloudflare actions use CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID from the environment or
# .env.cloudflare, or a `wrangler login`; otherwise they ask, and can remember the answer in
# .env.cloudflare (ignored by Git and Docker).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

APP_NAME="Cloudie"
WEB_TOML="backend/api/wrangler.toml"
GREEN=36
RED=203
DIM=244

if ! command -v gum >/dev/null; then
  echo "gum is not installed. Rebuild the dev container: docker compose up -d --build" >&2
  exit 1
fi

# ── Helpers ───────────────────────────────────────────────────────────────

wrangler() { pnpm --filter api exec wrangler "$@"; }
pages_project() { sed -n 's/^name = "\(.*\)"/\1/p' "$WEB_TOML" | head -1; }

title() { gum style --bold --foreground "$GREEN" --margin "1 0 0 0" "▸ $*"; }
note() { gum style --foreground "$DIM" "$*"; }
ok() { gum style --foreground "$GREEN" "✓ $*"; }
fail() { gum style --foreground "$RED" "✗ $*"; }
confirm() { gum confirm --default=false "$1"; }

# Shows the command, runs it, reports the result. Returns its exit code.
run() {
  gum style --foreground "$DIM" "\$ $*"
  if "$@"; then ok "Done"; else
    local code=$?
    fail "Failed (exit $code)"
    return "$code"
  fi
}

# Saved credentials (only when the developer chooses "remember"). Ignored by Git and Docker.
CREDS_FILE="$ROOT/.env.cloudflare"
if [[ -f "$CREDS_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a && source "$CREDS_FILE" && set +a
fi
CF_READY=""

ensure_cloudflare() {
  [[ -n "$CF_READY" ]] && return 0
  if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    # A `wrangler login` in this container works too; then no token is needed
    if wrangler whoami 2>/dev/null | grep -q "associated with the email"; then
      CF_READY=1
      return 0
    fi
    note "Make a token with ./cli.sh tokens, or in the dashboard: My Profile → API Tokens."
    CLOUDFLARE_API_TOKEN="$(gum input --password --placeholder "Cloudflare API token" --width 60)"
    [[ -n "$CLOUDFLARE_API_TOKEN" ]] || { fail "A token is needed"; return 1; }
    export CLOUDFLARE_API_TOKEN
    if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
      CLOUDFLARE_ACCOUNT_ID="$(gum input --placeholder "Cloudflare account ID" --width 60)"
      [[ -n "$CLOUDFLARE_ACCOUNT_ID" ]] || { fail "An account ID is needed"; return 1; }
      export CLOUDFLARE_ACCOUNT_ID
    fi
    if confirm "Remember these on this computer? (saved to .env.cloudflare, ignored by Git)"; then
      umask 077
      printf 'CLOUDFLARE_API_TOKEN=%q\nCLOUDFLARE_ACCOUNT_ID=%q\n' \
        "$CLOUDFLARE_API_TOKEN" "$CLOUDFLARE_ACCOUNT_ID" >"$CREDS_FILE"
      ok "Saved. Use Cloudflare setup → Forget saved token to remove it."
    fi
  fi
  CF_READY=1
}

act_forget_token() {
  if [[ -f "$CREDS_FILE" ]]; then
    rm -f "$CREDS_FILE"
    ok "Removed .env.cloudflare. Revoke the token in the Cloudflare dashboard too if it may have leaked."
  else
    note "No saved token."
  fi
  unset CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
  CF_READY=""
}

# ── Checks ────────────────────────────────────────────────────────────────

act_test() { run pnpm test; }
act_typecheck() { run pnpm typecheck; }
act_lint() { run pnpm lint; }
act_format() { run pnpm format; }
act_check_all() {
  title "Typecheck" && act_typecheck
  title "Lint" && act_lint
  title "Tests" && act_test
}

# ── Local ─────────────────────────────────────────────────────────────────

act_build() { run pnpm build; }
act_install() { run pnpm install; }
act_outdated() { pnpm -r outdated || true; }
act_rename() { bash "$ROOT/scripts/rename.sh"; }

# ── Cloudflare setup ──────────────────────────────────────────────────────

act_whoami() {
  ensure_cloudflare
  run wrangler whoami
}

act_set_secret() {
  ensure_cloudflare
  note "A Pages secret: the Functions read it as env.<NAME>. Add it to backend/api/functions/_lib/env.ts,"
  note "and to backend/api/.dev.vars for local runs."
  local name value
  name="$(gum input --placeholder "Name, e.g. RESEND_API_KEY" --width 60)"
  [[ "$name" =~ ^[A-Z][A-Z0-9_]*$ ]] || { fail "Use UPPER_SNAKE_CASE"; return 1; }
  value="$(gum input --password --placeholder "Value" --width 60)"
  [[ -n "$value" ]] || { fail "Nothing entered; $name not changed"; return 1; }
  gum style --foreground "$DIM" "\$ wrangler pages secret put $name (value hidden)"
  if printf '%s' "$value" | wrangler pages secret put "$name" --project-name "$(pages_project)"; then
    ok "Set. Deploy Pages again for it to take effect."
  else fail "Failed"; return 1; fi
}

act_list_secrets() {
  ensure_cloudflare
  run wrangler pages secret list --project-name "$(pages_project)"
}

act_first_setup() {
  gum style --border rounded --padding "0 2" --border-foreground "$GREEN" \
    "First-time setup on Cloudflare" "" \
    "1. Create the API tokens (admin, state key, deploy)" \
    "2. Create the Terraform state bucket" \
    "3. Terraform: the Pages project (and custom domains, if set)" \
    "4. Build and deploy Pages" \
    "5. Health check"
  confirm "Start? Each step can be skipped." || return 0
  step() { title "$1"; if confirm "$1?"; then "$2" || confirm "That failed. Continue anyway?" || return 1; fi; }
  step "Create the API tokens" act_tokens
  step "Create the Terraform state bucket" act_infra_bootstrap
  step "Create the infrastructure with Terraform" act_infra_apply
  step "Build and deploy Pages" act_deploy_pages
  step "Health check" act_health
}

# ── Infrastructure (Terraform, see backend/infra/README.md) ───────────────

tf() { bash "$ROOT/scripts/tf.sh" "$@"; }

# Terraform needs the admin token (a `wrangler login` is not enough) and the state-bucket key pair.
ensure_tf() {
  if [[ -z "${CLOUDFLARE_API_TOKEN:-}" || -z "${R2_ACCESS_KEY_ID:-}" ]]; then
    fail "Terraform's credentials are not in .env.cloudflare yet. Run Infrastructure → Create the API tokens first."
    return 1
  fi
}

act_tokens() {
  bash "$ROOT/scripts/tokens.sh" || return 1
  set -a && source "$CREDS_FILE" && set +a
  CF_READY=1
}

act_infra_bootstrap() { ensure_tf && run tf bootstrap; }
act_infra_plan() { ensure_tf && run tf plan; }
act_infra_apply() { ensure_tf && run tf apply; }
act_infra_output() { ensure_tf && run tf output; }
act_infra_check() {
  run tf fmt -check
  run tf validate
}

act_deploy_token() {
  [[ -n "${CLOUDFLARE_DEPLOY_TOKEN:-}" ]] || { fail "No deploy token yet. Run Infrastructure → Create the API tokens."; return 1; }
  note "Least-privilege token for Wrangler in GitHub Actions. Paste it as the CLOUDFLARE_API_TOKEN repository secret."
  confirm "Show the deploy token on screen?" || return 0
  printf '%s\n' "$CLOUDFLARE_DEPLOY_TOKEN"
}

# The first step of every deploy: bring Cloudflare in line with backend/infra/ before the code that may
# depend on it goes out. Plans once, and applies exactly that plan if you agree.
act_infra_sync() {
  ensure_tf || return 1
  local plan="deploy.tfplan" code=0
  gum style --foreground "$DIM" "\$ pnpm tf plan -detailed-exitcode -out=$plan"
  tf plan -input=false -detailed-exitcode -out="$plan" || code=$?
  case "$code" in
    0) ok "Infrastructure is up to date" ;;
    2)
      if confirm "Apply these infrastructure changes?"; then
        run tf apply -input=false "$plan" || { rm -f "$ROOT/backend/infra/$plan"; return 1; }
      else
        rm -f "$ROOT/backend/infra/$plan"
        confirm "Deploy the code anyway, without these changes?" || return 1
      fi
      ;;
    *)
      rm -f "$ROOT/backend/infra/$plan"
      fail "terraform plan failed (exit $code)"
      return 1
      ;;
  esac
  rm -f "$ROOT/backend/infra/$plan"
}

# ── Deploy ────────────────────────────────────────────────────────────────

act_deploy_pages() {
  ensure_cloudflare
  run pnpm build || return 1
  run wrangler pages deploy ../../web/build --project-name "$(pages_project)" --branch main
}

# A preview deployment: its own https://<branch>.<project>.pages.dev address, production untouched.
act_deploy_preview() {
  ensure_cloudflare
  local branch
  branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo preview)"
  branch="$(gum input --value "$branch" --header "Preview branch name" --width 50)"
  [[ -n "$branch" && "$branch" != main ]] || { fail "Pick a branch other than main"; return 1; }
  run pnpm build || return 1
  run wrangler pages deploy ../../web/build --project-name "$(pages_project)" --branch "$branch"
}

act_deploy() {
  ensure_cloudflare
  gum style --border rounded --padding "0 2" --border-foreground "$GREEN" \
    "Deploy to production ($(pages_project))" "" \
    "1. Infrastructure: Terraform plan, and apply if anything changed (asks)" \
    "2. Build and deploy Pages" \
    "3. Health check"
  confirm "Deploy now?" || return 0
  if [[ -n "${R2_ACCESS_KEY_ID:-}" ]]; then
    title "Infrastructure" && { act_infra_sync || return 1; }
  else
    note "Skipping Terraform: no state key in .env.cloudflare (run Infrastructure → Create the API tokens)."
  fi
  title "Pages" && { act_deploy_pages || return 1; }
  title "Health check" && act_health
}

act_health() {
  local url
  url="$(gum input --value "${SITE_URL:-https://$(pages_project).pages.dev}" --header "Site address" --width 70)"
  gum style --foreground "$DIM" "\$ curl $url/api/health"
  if curl -fsS "$url/api/health"; then
    echo
    ok "The site and its API are answering"
  else
    echo
    fail "No healthy answer (see docs/operations/troubleshooting.md)"
    return 1
  fi
}

act_deployments() {
  ensure_cloudflare
  run wrangler pages deployment list --project-name "$(pages_project)"
}

# Live logs (console.log, errors) from the production Functions until Ctrl+C.
act_logs() {
  ensure_cloudflare
  note "Streaming production logs. Ctrl+C to stop."
  wrangler pages deployment tail --project-name "$(pages_project)" --environment production || true
}

# ── Mobile ────────────────────────────────────────────────────────────────

# The Flutter app runs in its own container, started from your computer, not from here.
act_mobile_help() {
  note "Run these from the repo root on your computer (see docs/guide/mobile.md):"
  cat <<'TXT'
  ./cli.sh app apk [--local|--usb]   debug APK in mobile/out/ (deployed site, LAN dev stack, or USB)
  ./cli.sh app share                 QR code to install the debug APK over Wi-Fi
  ./cli.sh app install               install over USB (adb on your computer)
  ./cli.sh app run [--local|--usb]   flutter run with hot reload
  ./cli.sh app test | analyze        Flutter tests, static analysis
  ./cli.sh app build                 signed release .aab/.apk for Google Play
  ./cli.sh app icons | shell | image icons and splash, a shell, rebuild the image
TXT
}

# ── Menu ──────────────────────────────────────────────────────────────────

# "action|Label" per line, grouped
MENU_CHECKS="check_all|Typecheck, lint and test
test|Run tests
typecheck|Typecheck
lint|Lint
format|Format all files"
MENU_LOCAL="build|Build the web app (web/build)
install|Install packages (after editing a package.json)
outdated|Show outdated packages
rename|Rename this starter for a new project (name, app id)"
MENU_SETUP="first_setup|First-time setup wizard
whoami|Check the Cloudflare login
set_secret|Set a Pages secret (env.<NAME> in the Functions)
list_secrets|List Pages secrets (names only)
forget_token|Forget saved token"
MENU_INFRA="tokens|Create the API tokens: admin, state key, deploy (once a year)
infra_bootstrap|Create the Terraform state bucket (once)
infra_plan|Preview infrastructure changes (changes nothing)
infra_apply|Create or update infrastructure
infra_output|Show infrastructure IDs and addresses
infra_check|Format check and validate (no account needed)
deploy_token|Show the deploy token (for GitHub Actions)"
MENU_DEPLOY="deploy|Deploy everything (infrastructure, then Pages)
deploy_pages|Build and deploy Pages to production
deploy_preview|Build and deploy a preview (its own address)
deployments|List deployments
logs|Stream production logs
health|Health check"
MENU_MOBILE="mobile_help|Android and iOS app commands (run from ./cli.sh on your computer)"
MENUS=("$MENU_CHECKS" "$MENU_LOCAL" "$MENU_SETUP" "$MENU_INFRA" "$MENU_DEPLOY" "$MENU_MOBILE")

pick() { # menu text → action name
  local label
  label="$(cut -d'|' -f2 <<<"$1" | gum choose --header "$2" --height 12)" || return 1
  grep -F "|$label" <<<"$1" | head -1 | cut -d'|' -f1
}

banner() {
  gum style --border double --border-foreground "$GREEN" --padding "0 3" --margin "1 0" --bold \
    "${APP_NAME^^}" "$(gum style --foreground "$DIM" --bold=false "project commands")"
}

menu() {
  banner
  while true; do
    local group action menu_text
    group="$(gum choose --header "What do you want to do?" \
      "Checks" "Local" "Cloudflare setup" "Infrastructure" "Deploy" "Mobile app" "Quit")" || exit 0
    case "$group" in
      "Checks") menu_text="$MENU_CHECKS" ;;
      "Local") menu_text="$MENU_LOCAL" ;;
      "Cloudflare setup") menu_text="$MENU_SETUP" ;;
      "Infrastructure") menu_text="$MENU_INFRA" ;;
      "Deploy") menu_text="$MENU_DEPLOY" ;;
      "Mobile app") menu_text="$MENU_MOBILE" ;;
      *) exit 0 ;;
    esac
    action="$(pick "$menu_text" "$group")" || continue
    [[ -n "$action" ]] || continue
    title "$(grep -F "$action|" <<<"$menu_text" | head -1 | cut -d'|' -f2)"
    "act_$action" || true
    echo
  done
}

usage() {
  echo "Usage: ./cli.sh [action]"
  echo
  echo "With no action, opens the menu. Actions:"
  for m in "${MENUS[@]}"; do
    while IFS='|' read -r a l; do printf '  %-18s %s\n' "${a//_/-}" "$l"; done <<<"$m"
  done
  echo
  echo "From your computer only: up, down, logs-dev, e2e, app <command> (see ./cli.sh at the repo root)."
}

case "${1:-}" in
  "") menu ;;
  help | -h | --help) usage ;;
  *)
    action="${1//-/_}"
    if declare -F "act_$action" >/dev/null; then "act_$action"; else
      echo "Unknown action: $1" >&2
      usage >&2
      exit 1
    fi
    ;;
esac
