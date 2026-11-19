#!/usr/bin/env bash
# Fails if a wrangler.toml still holds a placeholder that `./cli.sh infra-write-config` should have replaced
# with a Terraform output (the agent's account id and KV id, the production chat origins). Deploying with one
# would bind the wrong KV namespace or reject every chat origin. Plain bash: also run by CI before the deploy.
#
#   bash scripts/check-synced.sh [repo-root]   (default: this repo)

set -euo pipefail

ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
AGENT="$ROOT/backend/agent/wrangler.toml"
WEB="$ROOT/backend/api/wrangler.toml"
bad=0

problem() { echo "check-synced: $*" >&2; bad=1; }

grep -q 'ACCOUNT_ID' "$AGENT" && problem "backend/agent/wrangler.toml still has the ACCOUNT_ID placeholder (AI_GATEWAY_URL)"
grep -Eq '^[[:space:]]*id = "0{32}"' "$AGENT" && problem "backend/agent/wrangler.toml still has the all-zero KV namespace id"
grep -Eq '^[[:space:]]*ALLOWED_ORIGINS = ".*unsynced.*"' "$WEB" && problem "backend/api/wrangler.toml still has the placeholder production ALLOWED_ORIGINS"

if ((bad)); then
  echo "Run ./cli.sh infra-write-config after ./cli.sh infra-apply, then commit the two wrangler.toml files." >&2
  exit 1
fi
echo "wrangler.toml files hold real Terraform values."
