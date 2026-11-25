#!/usr/bin/env bash
# Engaging Assistant project CLI: every project command behind a gum menu.
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

APP_NAME="Engaging Assistant"
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

# put_pages_secret NAME VALUE / put_agent_secret NAME VALUE: store a secret without echoing it.
put_pages_secret() {
  gum style --foreground "$DIM" "\$ wrangler pages secret put $1 (value hidden)"
  printf '%s' "$2" | wrangler pages secret put "$1" --project-name "$(pages_project)"
}
put_agent_secret() {
  gum style --foreground "$DIM" "\$ wrangler secret put $1 (value hidden; engaging-assistant-agent)"
  printf '%s' "$2" | agent_wrangler secret put "$1"
}

# ./cli.sh set-secret [NAME]  (e.g. TURNSTILE_SECRET, PASS_SECRET, CHAT_PASSWORD)
act_set_secret() {
  ensure_cloudflare
  note "A Pages secret: the Functions read it as env.<NAME>. Add it to backend/api/functions/_lib/env.ts,"
  note "and to backend/api/.dev.vars for local runs."
  local name="${1:-}" value
  [[ -n "$name" ]] || name="$(gum input --placeholder "Name, e.g. RESEND_API_KEY" --width 60)"
  [[ "$name" =~ ^[A-Z][A-Z0-9_]*$ ]] || { fail "Use UPPER_SNAKE_CASE"; return 1; }
  value="$(gum input --password --placeholder "Value" --width 60)"
  [[ -n "$value" ]] || { fail "Nothing entered; $name not changed"; return 1; }
  if put_pages_secret "$name" "$value"; then
    ok "Set. Deploy Pages again for it to take effect."
  else fail "Failed"; return 1; fi
}

# ./cli.sh set-agent-secret [NAME]  (e.g. CF_AIG_TOKEN, a provider key)
act_set_agent_secret() {
  ensure_cloudflare
  note "A secret on the agent Worker (engaging-assistant-agent): backend/agent reads it as env.<NAME>."
  note "Local runs use backend/agent/.dev.vars."
  local name="${1:-}" value
  [[ -n "$name" ]] || name="$(gum input --placeholder "Name, e.g. CF_AIG_TOKEN" --width 60)"
  [[ "$name" =~ ^[A-Z][A-Z0-9_]*$ ]] || { fail "Use UPPER_SNAKE_CASE"; return 1; }
  value="$(gum input --password --placeholder "Value" --width 60)"
  [[ -n "$value" ]] || { fail "Nothing entered; $name not changed"; return 1; }
  if put_agent_secret "$name" "$value"; then
    ok "Set. It takes effect on the Worker's next request; no redeploy needed."
  else fail "Failed"; return 1; fi
}

act_list_secrets() {
  ensure_cloudflare
  run wrangler pages secret list --project-name "$(pages_project)"
}

# The assistant's secrets, set once by the first-time wizard: the Turnstile secret straight from Terraform,
# a freshly generated PASS_SECRET, the chat page's password and the AI Gateway token, both typed in. Pages secrets need the
# Pages project (infra-apply); the agent secret needs the Worker (deploy-agent).
first_setup_secrets() {
  ensure_cloudflare
  local turnstile pass chat aig
  turnstile="$(tf_out turnstile_secret)" && [[ -n "$turnstile" ]] ||
    { fail "Could not read the turnstile_secret output (has infra-apply run?)"; return 1; }
  put_pages_secret TURNSTILE_SECRET "$turnstile" || { fail "Could not set TURNSTILE_SECRET"; return 1; }
  ok "TURNSTILE_SECRET set from Terraform"
  pass="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64"))')"
  put_pages_secret PASS_SECRET "$pass" || { fail "Could not set PASS_SECRET"; return 1; }
  ok "PASS_SECRET set (generated, 32 random bytes)"
  note "CHAT_PASSWORD: the shared password the sales team types on the chat page."
  chat="$(gum input --password --placeholder "Chat page password (CHAT_PASSWORD)" --width 60)"
  [[ -n "$chat" ]] || { fail "Nothing entered; set it later with ./cli.sh set-secret CHAT_PASSWORD"; return 1; }
  put_pages_secret CHAT_PASSWORD "$chat" || { fail "Could not set CHAT_PASSWORD"; return 1; }
  ok "CHAT_PASSWORD set"
  note "CF_AIG_TOKEN: an AI Gateway token (AI → AI Gateway → engaging-assistant-assistant → Settings → Authentication)."
  aig="$(gum input --password --placeholder "AI Gateway token (CF_AIG_TOKEN)" --width 60)"
  [[ -n "$aig" ]] || { fail "Nothing entered; set it later with ./cli.sh set-agent-secret CF_AIG_TOKEN"; return 1; }
  put_agent_secret CF_AIG_TOKEN "$aig" || { fail "Could not set CF_AIG_TOKEN"; return 1; }
  ok "CF_AIG_TOKEN set on engaging-assistant-agent"
}

act_first_setup() {
  gum style --border rounded --padding "0 2" --border-foreground "$GREEN" \
    "First-time setup on Cloudflare" "" \
    "1. Create the API tokens (admin, state key, deploy)" \
    "2. Create the Terraform state bucket" \
    "3. Terraform: Pages project, KV, R2, AI Gateway, Turnstile (and custom domains, if set)" \
    "4. Write the Terraform IDs into the wrangler.toml files" \
    "5. Deploy the agent Worker" \
    "6. Set the secrets: TURNSTILE_SECRET, PASS_SECRET, CHAT_PASSWORD, CF_AIG_TOKEN" \
    "7. Build and deploy Pages" \
    "8. Publish the knowledge base" \
    "9. Health check"
  confirm "Start? Each step can be skipped." || return 0
  step() { title "$1"; if confirm "$1?"; then "$2" || confirm "That failed. Continue anyway?" || return 1; fi; }
  step "Create the API tokens" act_tokens
  step "Create the Terraform state bucket" act_infra_bootstrap
  step "Create the infrastructure with Terraform" act_infra_apply
  step "Write the Terraform IDs into the wrangler.toml files" act_infra_write_config
  step "Deploy the agent Worker" act_deploy_agent
  step "Set the assistant secrets" first_setup_secrets
  step "Build and deploy Pages" act_deploy_pages
  step "Publish the knowledge base" act_kb_publish
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

# ── Terraform outputs into code ───────────────────────────────────────────
# Cloudflare creates the IDs; the code needs them. Lines tagged `# tf-sync` in the wrangler.toml files are
# rewritten from the Terraform outputs (commit the result). Nothing secret is involved.

tf_out() { bash "$ROOT/scripts/tf.sh" output -raw "$1" 2>/dev/null; }

# set_toml_value FILE KEY VALUE: rewrites `KEY = "..." # tf-sync` (the line must exist)
set_toml_value() {
  local file="$1" key="$2" value="$3"
  grep -Eq "^[[:space:]]*$key = \".*\" # tf-sync" "$file" || { fail "$file has no '$key = ... # tf-sync' line"; return 1; }
  sed -i -E "s|^([[:space:]]*$key = \").*(\" # tf-sync.*)$|\1$value\2|" "$file"
}

# Writes the agent's KV id and AI Gateway URL, and the production chat origins, into the wrangler.toml files.
# Everything is checked first (outputs non-empty, every tagged line present), so a failure writes nothing.
act_infra_write_config() {
  ensure_tf || return 1
  local kv gateway origins
  kv="$(tf_out kv_config_id)" && gateway="$(tf_out ai_gateway_url)" && origins="$(tf_out chat_origins)" ||
    { fail "Could not read the Terraform outputs (has './cli.sh infra-apply' run?)"; return 1; }
  [[ "$kv" =~ ^[0-9a-f]{32}$ ]] || { fail "kv_config_id is not a 32-character id: '$kv'"; return 1; }
  [[ "$gateway" =~ ^https://gateway\.ai\.cloudflare\.com/v1/[0-9a-f]{32}/[a-z0-9-]+$ ]] ||
    { fail "ai_gateway_url looks wrong: '$gateway'"; return 1; }
  [[ "$origins" =~ ^https://[^,[:space:]]+(,https://[^,[:space:]]+)*$ ]] ||
    { fail "chat_origins looks wrong: '$origins'"; return 1; }
  local f k
  for f_k in "backend/agent/wrangler.toml:id" "backend/agent/wrangler.toml:AI_GATEWAY_URL" "$WEB_TOML:ALLOWED_ORIGINS"; do
    f="${f_k%%:*}" k="${f_k##*:}"
    grep -Eq "^[[:space:]]*$k = \".*\" # tf-sync" "$f" || { fail "$f has no '$k = ... # tf-sync' line; nothing written"; return 1; }
  done
  set_toml_value backend/agent/wrangler.toml id "$kv" || return 1
  set_toml_value backend/agent/wrangler.toml AI_GATEWAY_URL "$gateway" || return 1
  set_toml_value "$WEB_TOML" ALLOWED_ORIGINS "$origins" || return 1
  ok "Wrote the KV id, AI Gateway URL and production chat origins ($origins) into the wrangler.toml files."
  git diff --quiet -- backend/agent/wrangler.toml "$WEB_TOML" || note "They changed: commit backend/agent/wrangler.toml and $WEB_TOML."
}

# Fails while a wrangler.toml still has a placeholder (see scripts/check-synced.sh).
check_synced() { bash "$ROOT/scripts/check-synced.sh" || { fail "Placeholders left: nothing deployed"; return 1; }; }

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
  act_infra_write_config || return 1
}

# ── Deploy ────────────────────────────────────────────────────────────────

# The web build inlines PUBLIC_TURNSTILE_SITEKEY (it fails without one). Use the one in the environment, else
# the Terraform output.
export_sitekey() {
  [[ -z "${PUBLIC_TURNSTILE_SITEKEY:-}" && -n "${R2_ACCESS_KEY_ID:-}" ]] &&
    PUBLIC_TURNSTILE_SITEKEY="$(tf_out turnstile_sitekey)" || true
  [[ -n "${PUBLIC_TURNSTILE_SITEKEY:-}" ]] ||
    { fail "No Turnstile sitekey: run Infrastructure → Create or update infrastructure, or set PUBLIC_TURNSTILE_SITEKEY"; return 1; }
  export PUBLIC_TURNSTILE_SITEKEY
}

# The agent Worker must exist before Pages: Pages' AGENT service binding points at it.
act_deploy_agent() {
  ensure_cloudflare
  check_synced || return 1
  run agent_wrangler deploy
}

act_deploy_pages() {
  ensure_cloudflare
  check_synced || return 1
  export_sitekey || return 1
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
  export_sitekey || return 1
  run pnpm build || return 1
  run wrangler pages deploy ../../web/build --project-name "$(pages_project)" --branch "$branch"
}

act_deploy() {
  ensure_cloudflare
  gum style --border rounded --padding "0 2" --border-foreground "$GREEN" \
    "Deploy to production ($(pages_project))" "" \
    "1. Infrastructure: Terraform plan, and apply if anything changed (asks)" \
    "2. Deploy the agent Worker (engaging-assistant-agent; before Pages, which binds to it)" \
    "3. Build and deploy Pages" \
    "4. Health check"
  confirm "Deploy now?" || return 0
  if [[ -n "${R2_ACCESS_KEY_ID:-}" ]]; then
    title "Infrastructure" && { act_infra_sync || return 1; }
  else
    note "Skipping Terraform: no state key in .env.cloudflare (run Infrastructure → Create the API tokens)."
  fi
  title "Agent Worker" && { act_deploy_agent || return 1; }
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

# ── Sales assistant (knowledge base and runtime config, see knowledge/README.md) ──

agent_wrangler() { (cd "$ROOT/backend/agent" && pnpm exec wrangler "$@"); }

act_kb_check() { run pnpm kb:check; }

act_kb_publish() {
  ensure_cloudflare
  note "Checks and builds knowledge/, uploads it to R2 (engaging-assistant-kb) and points the live assistant at it."
  confirm "Publish the knowledge base to production?" || return 0
  run bash "$ROOT/scripts/kb/publish.sh"
}

# The dev stack's local KV and R2 (.wrangler/state): no account, no confirmation. ./cli.sh e2e runs it too.
act_kb_publish_local() {
  note "Builds knowledge/ and points the local assistant (./cli.sh up) at it."
  run bash "$ROOT/scripts/kb/publish.sh" --local
}

# Shows the agent's runtime config (KV key `config`), lets you edit a copy, validates it, then saves it.
act_ai_config() {
  ensure_cloudflare
  local current tmp
  # With --remote, `kv key get` on a missing key fails (404) like any other error, so check the listing first.
  local keys exists
  keys="$(agent_wrangler kv key list --binding CONFIG --remote --prefix config)" || { fail "Could not list the KV keys"; return 1; }
  exists="$(KEYS="$keys" node -e '
    const raw = process.env.KEYS;
    const keys = JSON.parse(raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1));
    process.stdout.write(keys.some((k) => k.name === "config") ? "yes" : "no");')" || { fail "Unexpected kv key list output"; return 1; }
  current=""
  if [[ "$exists" == yes ]]; then
    current="$(agent_wrangler kv key get config --binding CONFIG --remote)" || { fail "Could not read the config"; return 1; }
  fi
  if [[ -z "$current" ]]; then
    note "No config saved yet; starting from the defaults."
    current="$(node --experimental-strip-types --input-type=module -e '
      import { DEFAULT_CONFIG } from "./shared/protocol/src/index.ts";
      console.log(JSON.stringify(DEFAULT_CONFIG, null, 2));')"
  fi
  printf '%s\n' "$current"
  confirm "Edit it?" || return 0
  tmp="$(mktemp --suffix=.json)"
  printf '%s\n' "$current" >"$tmp"
  while true; do
    "${EDITOR:-vi}" "$tmp"
    if node --experimental-strip-types --input-type=module -e '
      import { readFileSync } from "node:fs";
      import { AssistantConfig } from "./shared/protocol/src/index.ts";
      let value;
      try { value = JSON.parse(readFileSync(process.argv[1], "utf8")); }
      catch (e) { console.error(`Not JSON: ${e.message}`); process.exit(1); }
      // safeParse drops unknown keys; this only validates, and the file is saved as written.
      const parsed = AssistantConfig.safeParse(value);
      if (!parsed.success) {
        for (const i of parsed.error.issues) console.error(`${i.path.join(".") || "(config)"}: ${i.message}`);
        process.exit(1);
      }' "$tmp"; then
      break
    fi
    confirm "That config is invalid. Edit it again?" || { rm -f "$tmp"; return 1; }
  done
  confirm "Save this config? The assistant uses it within a minute." || { rm -f "$tmp"; return 0; }
  run agent_wrangler kv key put config "$(cat "$tmp")" --binding CONFIG --remote
  rm -f "$tmp"
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
rename|Rename this starter for a new project (name)"
MENU_SETUP="first_setup|First-time setup wizard
whoami|Check the Cloudflare login
set_secret|Set a Pages secret (env.<NAME> in the Functions)
set_agent_secret|Set an agent Worker secret (CF_AIG_TOKEN, provider keys)
list_secrets|List Pages secrets (names only)
forget_token|Forget saved token"
MENU_INFRA="tokens|Create the API tokens: admin, state key, deploy (once a year)
infra_bootstrap|Create the Terraform state bucket (once)
infra_plan|Preview infrastructure changes (changes nothing)
infra_apply|Create or update infrastructure
infra_output|Show infrastructure IDs and addresses
infra_write_config|Write Terraform IDs into the wrangler.toml files
infra_check|Format check and validate (no account needed)
deploy_token|Show the deploy token (for GitHub Actions)"
MENU_DEPLOY="deploy|Deploy everything (infrastructure, agent Worker, then Pages)
deploy_agent|Deploy the agent Worker (engaging-assistant-agent)
deploy_pages|Build and deploy Pages to production
deploy_preview|Build and deploy a preview (its own address)
deployments|List deployments
logs|Stream production logs
health|Health check"
MENU_ASSISTANT="kb_check|Check the knowledge base (knowledge/)
kb_publish|Publish the knowledge base to the live assistant
kb_publish_local|Publish the knowledge base to the local dev stack
ai_config|Show or edit the assistant config (model, kbVersion, …)"
MENUS=("$MENU_CHECKS" "$MENU_LOCAL" "$MENU_SETUP" "$MENU_INFRA" "$MENU_DEPLOY" "$MENU_ASSISTANT")

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
      "Checks" "Local" "Cloudflare setup" "Infrastructure" "Deploy" "Sales assistant" "Quit")" || exit 0
    case "$group" in
      "Checks") menu_text="$MENU_CHECKS" ;;
      "Local") menu_text="$MENU_LOCAL" ;;
      "Cloudflare setup") menu_text="$MENU_SETUP" ;;
      "Infrastructure") menu_text="$MENU_INFRA" ;;
      "Deploy") menu_text="$MENU_DEPLOY" ;;
      "Sales assistant") menu_text="$MENU_ASSISTANT" ;;
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
    if declare -F "act_$action" >/dev/null; then "act_$action" "${@:2}"; else
      echo "Unknown action: $1" >&2
      usage >&2
      exit 1
    fi
    ;;
esac
