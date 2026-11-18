#!/usr/bin/env bash
# Runs Terraform for backend/infra/ with the Cloudflare credentials filled in.
#
#   pnpm tf bootstrap     once: create the private state bucket
#   pnpm tf plan          show what would change (changes nothing)
#   pnpm tf apply         make the changes (asks first)
#   pnpm tf fmt|validate  format and check; no account needed
#   pnpm tf <anything>    any other terraform command, e.g. output
#
# Inside the dev container (docker compose exec app pnpm tf ...). The menu (./cli.sh → Infrastructure) wraps these.
#
# Reads from the environment or .env.cloudflare (the same file the project CLI uses):
#   CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID       manage the resources
#   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY            the state bucket
# `./cli.sh tokens` makes and saves all of them (backend/infra/README.md, "Credentials").

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA="$ROOT/backend/infra"
# Must match `bucket` in backend/infra/backend.tf
STATE_BUCKET="$(sed -n 's/^ *bucket *= *"\(.*\)"/\1/p' "$INFRA/backend.tf" | head -1)"
API="https://api.cloudflare.com/client/v4"

if [[ -f "$ROOT/.env.cloudflare" ]]; then
  # shellcheck disable=SC1091
  set -a && source "$ROOT/.env.cloudflare" && set +a
fi

die() { echo "tf: $*" >&2; exit 1; }

export TF_IN_AUTOMATION=1 # shorter output: no "run terraform apply next" hints

# Everything except fmt and validate talks to Cloudflare.
need_account() {
  [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]] || die "CLOUDFLARE_API_TOKEN is not set. Run: ./cli.sh tokens"
  [[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]] || die "CLOUDFLARE_ACCOUNT_ID is not set."
  export CLOUDFLARE_API_TOKEN
  export TF_VAR_account_id="$CLOUDFLARE_ACCOUNT_ID"
  BACKEND_ENDPOINT="endpoints={s3=\"https://$CLOUDFLARE_ACCOUNT_ID.r2.cloudflarestorage.com\"}"
}

cf() { curl -fsS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$@"; }

# The state bucket is reached over R2's S3 API, which wants its own key pair.
r2_keys() {
  [[ -n "${R2_ACCESS_KEY_ID:-}" && -n "${R2_SECRET_ACCESS_KEY:-}" ]] ||
    die "R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are not set. Run: ./cli.sh tokens"
  export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
}

tf() { terraform -chdir="$INFRA" "$@"; }

# Connects to the state bucket. Quiet unless it fails.
tf_init() {
  r2_keys
  local out
  out="$(tf init -input=false -reconfigure -backend-config="$BACKEND_ENDPOINT" "$@" 2>&1)" ||
    { echo "$out" >&2; die "terraform init failed (has './cli.sh infra-bootstrap' been run?)"; }
}

# Once per account: create the private state bucket with a plain API call (Terraform
# cannot manage the bucket that holds its own state), then connect to it.
bootstrap() {
  local buckets="$API/accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets"
  if cf "$buckets/$STATE_BUCKET" >/dev/null 2>&1; then
    echo "State bucket $STATE_BUCKET already exists."
  else
    cf -X POST "$buckets" -H "Content-Type: application/json" \
      --data "{\"name\":\"$STATE_BUCKET\"}" >/dev/null
    echo "Created the private state bucket $STATE_BUCKET."
  fi
  tf_init
  echo "Terraform is ready. Next: pnpm tf plan"
}

cmd="${1:-plan}"
[[ $# -gt 0 ]] && shift

case "$cmd" in
  bootstrap) need_account && bootstrap ;;
  # Formatting and validation need no account access.
  fmt) tf fmt -recursive "$@" ;;
  # Own data dir, so validating never touches (or needs) the state bucket connection.
  validate)
    export TF_DATA_DIR="$INFRA/.terraform/validate"
    tf init -input=false -backend=false >/dev/null && tf validate "$@"
    ;;
  init) need_account && tf_init "$@" && echo "Terraform is connected to the state bucket." ;;
  *) need_account && tf_init && tf "$cmd" "$@" ;;
esac
