#!/usr/bin/env bash
# Makes the three Cloudflare API tokens the project uses, without clicking through
# permissions in the dashboard:
#
#   engaging-assistant-terraform-admin   everything on this account and its zones (Terraform)
#   engaging-assistant-terraform-state   read/write files in the engaging-assistant-tfstate bucket only
#   engaging-assistant-deploy            deploy the Worker and Pages, migrations, secrets
#
#   ./cli.sh tokens
#
# 1. In the dashboard: My Profile → API Tokens → Create Token → template
#    "Create Additional Tokens" → Continue to summary → Create Token. Copy it. That
#    temporary token can only make tokens.
# 2. Run this and paste it. It creates the three tokens (expiring in a year), checks
#    each one works, saves them to .env.cloudflare, offers to delete the previous
#    tokens with the same names (rotation) and then the temporary token.
# No token is printed.
#
# Cloudflare does not let a token made this way manage tokens itself, so the admin
# token has every permission except the API-token ones. Run this again to rotate.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CREDS_FILE="$ROOT/.env.cloudflare"
API="https://api.cloudflare.com/client/v4"
STATE_BUCKET="engaging-assistant-tfstate"
DAYS="${TOKEN_DAYS:-365}"
ADMIN="engaging-assistant-terraform-admin"
STATE="engaging-assistant-terraform-state"
DEPLOY="engaging-assistant-deploy"

# What Wrangler needs to deploy Pages and the agent Worker, set their secrets and publish the knowledge base
# (R2 uploads, KV config). Names must match Cloudflare's permission groups exactly; the check below fails with
# the offending name if one is wrong. Add groups here when the project grows (e.g. "D1 Write"), then run
# ./cli.sh tokens again.
DEPLOY_PERMISSIONS=(
  "Account Settings Read"
  "Pages Write"
  "Workers Scripts Write"
  "Workers KV Storage Write"
  "Workers R2 Storage Write"
)

die() { echo "tokens: $*" >&2; exit 1; }
ok() { echo "✓ $*"; }
command -v gum >/dev/null || die "gum is missing; rebuild the container (docker compose up -d --build)"

if [[ -f "$CREDS_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a && source "$CREDS_FILE" && set +a
fi
if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  CLOUDFLARE_ACCOUNT_ID="$(gum input --placeholder "Cloudflare account ID" --width 60)"
fi
[[ "$CLOUDFLARE_ACCOUNT_ID" =~ ^[0-9a-f]{32}$ ]] || die "That is not an account ID (32 hex characters)."

BOOT="$(gum input --password --placeholder "Temporary token (\"Create Additional Tokens\" template)" --width 70)"
# Pasting can bring along spaces, line breaks or the terminal's bracketed-paste
# markers (ESC[200~ … ESC[201~); any of them breaks the Authorization header.
BOOT="${BOOT//$'\e[200~'/}"
BOOT="${BOOT//$'\e[201~'/}"
BOOT="$(tr -d '[:space:][:cntrl:]' <<<"$BOOT")"
[[ -n "$BOOT" ]] || die "No token entered."
[[ "$BOOT" =~ ^[A-Za-z0-9_-]+$ ]] ||
  die "The pasted text has characters an API token never has. Copy the token again and paste only it."

# api TOKEN METHOD PATH [JSON]; prints the response body, fails on success=false
api() {
  local out data=()
  [[ $# -ge 4 ]] && data=(--data "$4")
  out="$(curl -sS -X "$2" -H "Authorization: Bearer $1" -H "Content-Type: application/json" \
    "$API$3" "${data[@]}")"
  if [[ "$(jq -r '.success' <<<"$out")" != "true" ]]; then
    jq -r '.errors[]? | "  \(.code): \(.message)", (.error_chain[]? | "    \(.code): \(.message)")' <<<"$out" >&2 ||
      echo "  $out" >&2
    return 1
  fi
  printf '%s' "$out"
}

boot_id="$(api "$BOOT" GET /user/tokens/verify | jq -r .result.id)" ||
  die "The temporary token did not verify. Make it from the \"Create Additional Tokens\" template."
groups="$(api "$BOOT" GET /user/tokens/permission_groups)" ||
  die "Could not list permission groups with the temporary token."

acct="com.cloudflare.api.account.$CLOUDFLARE_ACCOUNT_ID"
expires="$(date -u -d "+$DAYS days" +%Y-%m-%dT%H:%M:%SZ)"

# ── Token bodies ──────────────────────────────────────────────────────────

# Admin: every account, zone and R2 group except token management (not allowed),
# split into policies of 250 (Cloudflare allows 300 per policy).
admin_body="$(jq -c --arg name "$ADMIN" --arg acct "$acct" --arg exp "$expires" '
  def ids(scope): [ .result[] | select(.scopes | index(scope)) | select(.name | test("API Tokens") | not) | {id} ] | unique;
  def chunks(n): [ range(0; length; n) as $i | .[$i:$i + n] ];
  def policies(resources; scope):
    ids(scope) | chunks(250) | map({ effect: "allow", resources: resources, permission_groups: . });
  { name: $name, expires_on: $exp, policies: (
      policies({ ($acct): "*" }; "com.cloudflare.api.account")
      + policies({ ($acct): { "com.cloudflare.api.account.zone.*": "*" } }; "com.cloudflare.api.account.zone")
      + policies({ ($acct): { "com.cloudflare.edge.r2.bucket.*": "*" } }; "com.cloudflare.edge.r2.bucket")
  ) }' <<<"$groups")"

# group_id NAME → the permission group's ID, or fail
group_id() {
  local id
  id="$(jq -r --arg n "$1" '[.result[] | select(.name == $n) | .id][0] // empty' <<<"$groups")"
  [[ -n "$id" ]] || die "Cloudflare has no permission group called \"$1\". Update scripts/tokens.sh."
  printf '%s' "$id"
}

# Check every name here, in this shell: a failure inside $(…) would not stop the script.
for p in "Workers R2 Storage Bucket Item Write" "${DEPLOY_PERMISSIONS[@]}"; do group_id "$p" >/dev/null; done

state_body="$(jq -nc --arg name "$STATE" --arg exp "$expires" \
  --arg bucket "com.cloudflare.edge.r2.bucket.${CLOUDFLARE_ACCOUNT_ID}_default_$STATE_BUCKET" \
  --arg id "$(group_id "Workers R2 Storage Bucket Item Write")" '
  { name: $name, expires_on: $exp, policies: [
      { effect: "allow", resources: { ($bucket): "*" }, permission_groups: [{ id: $id }] } ] }')"

deploy_ids="$(for p in "${DEPLOY_PERMISSIONS[@]}"; do group_id "$p"; echo; done | jq -R . | jq -sc 'map(select(length > 0) | { id: . })')"
deploy_body="$(jq -nc --arg name "$DEPLOY" --arg exp "$expires" --arg acct "$acct" --argjson ids "$deploy_ids" '
  { name: $name, expires_on: $exp, policies: [
      { effect: "allow", resources: { ($acct): "*" }, permission_groups: $ids } ] }')"

gum style --border rounded --padding "0 2" \
  "Create three API tokens (expire $expires)" "" \
  "$ADMIN   $(jq '[.policies[].permission_groups[]] | length' <<<"$admin_body") permissions: everything except managing tokens" \
  "$STATE   files in $STATE_BUCKET only" \
  "$DEPLOY          ${#DEPLOY_PERMISSIONS[@]} permissions: ${DEPLOY_PERMISSIONS[*]}" \
  "" "Account $CLOUDFLARE_ACCOUNT_ID and all its zones"
gum confirm "Create them?" || exit 0

# create BODY → "id value"
create() {
  local out
  out="$(api "$BOOT" POST /user/tokens "$1")" || return 1
  jq -r '"\(.result.id) \(.result.value)"' <<<"$out"
}

read -r admin_id ADMIN_TOKEN < <(create "$admin_body") || die "Cloudflare refused to create $ADMIN (errors above)."
read -r state_id STATE_TOKEN < <(create "$state_body") || die "Cloudflare refused to create $STATE (errors above). $ADMIN was created; delete it in the dashboard or run this again."
read -r deploy_id DEPLOY_TOKEN < <(create "$deploy_body") || die "Cloudflare refused to create $DEPLOY (errors above). The other two were created; run this again to replace them."
[[ -n "${ADMIN_TOKEN:-}" && -n "${STATE_TOKEN:-}" && -n "${DEPLOY_TOKEN:-}" ]] || die "A token came back without a value."
ok "Created the three tokens."

for t in "$ADMIN_TOKEN" "$DEPLOY_TOKEN"; do
  api "$t" GET /user/tokens/verify >/dev/null || die "A new token does not verify yet. Wait a minute and run this again."
done

# R2's S3 API takes a key pair: key ID = token ID, secret = SHA-256 of the token value.
R2_ACCESS_KEY_ID="$state_id"
R2_SECRET_ACCESS_KEY="$(printf '%s' "$STATE_TOKEN" | sha256sum | cut -d' ' -f1)"

# ── Save ──────────────────────────────────────────────────────────────────

umask 077
touch "$CREDS_FILE"
tmp="$(mktemp)"
grep -v -E '^(CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID|CLOUDFLARE_DEPLOY_TOKEN|R2_ACCESS_KEY_ID|R2_SECRET_ACCESS_KEY)=' \
  "$CREDS_FILE" >"$tmp" || true
printf '%s=%q\n' \
  CLOUDFLARE_API_TOKEN "$ADMIN_TOKEN" \
  CLOUDFLARE_ACCOUNT_ID "$CLOUDFLARE_ACCOUNT_ID" \
  CLOUDFLARE_DEPLOY_TOKEN "$DEPLOY_TOKEN" \
  R2_ACCESS_KEY_ID "$R2_ACCESS_KEY_ID" \
  R2_SECRET_ACCESS_KEY "$R2_SECRET_ACCESS_KEY" >>"$tmp"
cat "$tmp" >"$CREDS_FILE"
rm -f "$tmp"
ok "Saved to .env.cloudflare."

# Check the state key against the bucket, if it exists yet. New keys can take a
# moment to reach R2, so try a few times.
if api "$ADMIN_TOKEN" GET "/accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets/$STATE_BUCKET" >/dev/null 2>&1; then
  r2_ok=""
  for _ in 1 2 3 4 5 6; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --aws-sigv4 "aws:amz:auto:s3" \
      --user "$R2_ACCESS_KEY_ID:$R2_SECRET_ACCESS_KEY" \
      -H "x-amz-content-sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" \
      "https://$CLOUDFLARE_ACCOUNT_ID.r2.cloudflarestorage.com/$STATE_BUCKET?list-type=2&max-keys=1")"
    [[ "$code" == 200 ]] && { r2_ok=1; break; }
    sleep 5
  done
  if [[ -n "$r2_ok" ]]; then ok "The state key opens $STATE_BUCKET."; else
    echo "! The state key did not open $STATE_BUCKET yet (HTTP $code). Try 'pnpm tf plan' in a minute." >&2
  fi
fi

# ── Clean up ──────────────────────────────────────────────────────────────

old="$(api "$BOOT" GET "/user/tokens?per_page=100" | jq -r --arg a "$ADMIN" --arg s "$STATE" --arg d "$DEPLOY" \
  --arg ka "$admin_id" --arg ks "$state_id" --arg kd "$deploy_id" '
  .result[] | select(.name == $a or .name == $s or .name == $d)
  | select(.id != $ka and .id != $ks and .id != $kd) | "\(.id) \(.name)"')" || old=""
if [[ -n "$old" ]]; then
  echo "Older tokens with the same names (from a previous run):"
  sed 's/^[^ ]* /  /' <<<"$old"
  if gum confirm "Delete them? (If GitHub Actions uses the old deploy token, update its secret first.)"; then
    while read -r id _; do api "$BOOT" DELETE "/user/tokens/$id" >/dev/null && echo "  deleted"; done <<<"$old"
  fi
fi

if gum confirm "Delete the temporary token now? (recommended)"; then
  if api "$BOOT" DELETE "/user/tokens/$boot_id" >/dev/null; then ok "Temporary token deleted."; else
    echo "Could not delete it; remove it in My Profile → API Tokens." >&2
  fi
fi
echo "Next: ./cli.sh infra-bootstrap"
