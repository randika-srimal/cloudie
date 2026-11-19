#!/usr/bin/env bash
# Publishes knowledge/ to the running assistant without a code deploy:
#   1. pnpm kb:build (runs the checks; stops on any error)
#   2. uploads dist/kb/<version>/{instructions.md,prompt.md,manifest.json} to R2: cloudie-kb/kb/<version>/
#   3. sets kbVersion in the agent's KV config (key `config`, binding CONFIG), keeping every other setting
# The agent reads the config within a minute and loads the new version. Old versions stay in R2, so rolling
# back is setting kbVersion to an earlier version (./cli.sh ai-config).
#
# Needs CLOUDFLARE_API_TOKEN (and CLOUDFLARE_ACCOUNT_ID) or a `wrangler login`. Run from the repo root, in
# the dev container (./cli.sh kb-publish) or in CI (.github/workflows/kb.yml).
#
# With --local it writes to the dev stack's local KV and R2 instead (.wrangler/state, what `wrangler dev`
# reads), needing no account: ./cli.sh kb-publish-local, and ./cli.sh e2e before every run.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

BUCKET="cloudie-kb"
wrangler() { (cd "$ROOT/backend/agent" && pnpm exec wrangler "$@"); }

TARGET=(--remote)
case "${1:-}" in
  "") ;;
  --local) TARGET=(--local --persist-to "$ROOT/.wrangler/state") ;;
  *) echo "Unknown option: $1 (the only option is --local)" >&2; exit 2 ;;
esac

version="$(pnpm -s kb:build | tail -1)"
[[ "$version" =~ ^[0-9a-f]{12}$ ]] || { echo "kb:build did not print a version: $version" >&2; exit 1; }
dir="dist/kb/$version"

for file in instructions.md prompt.md manifest.json; do
  case "$file" in
    *.json) type="application/json" ;;
    *) type="text/markdown; charset=utf-8" ;;
  esac
  wrangler r2 object put "$BUCKET/kb/$version/$file" --file "$ROOT/$dir/$file" --content-type "$type" "${TARGET[@]}"
done

# Merge kbVersion into the current config; with no config saved yet, start from the defaults. With --remote,
# `kv key get` on a missing key fails (404) just like an auth or network error, so look the key up in the
# listing first and let any other failure stop the script.
keys="$(wrangler kv key list --binding CONFIG "${TARGET[@]}" --prefix config)"
exists="$(KEYS="$keys" node -e '
  const raw = process.env.KEYS;
  const keys = JSON.parse(raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1));
  process.stdout.write(keys.some((k) => k.name === "config") ? "yes" : "no");
')"
current=""
if [[ "$exists" == yes ]]; then
  current="$(wrangler kv key get config --binding CONFIG "${TARGET[@]}")"
fi
# safeParse drops keys AssistantConfig does not know, so an unknown setting in the saved config is removed.
next="$(
  CURRENT="$current" VERSION="$version" node --experimental-strip-types --input-type=module -e '
    import { AssistantConfig, DEFAULT_CONFIG } from "./shared/protocol/src/index.ts";
    let base = { ...DEFAULT_CONFIG };
    if (process.env.CURRENT?.trim()) {
      const parsed = AssistantConfig.safeParse(JSON.parse(process.env.CURRENT));
      if (!parsed.success) {
        console.error("The saved config is invalid; fix it with ./cli.sh ai-config first.");
        process.exit(1);
      }
      base = parsed.data;
    }
    console.log(JSON.stringify({ ...base, kbVersion: process.env.VERSION }));
  '
)"
wrangler kv key put config "$next" --binding CONFIG "${TARGET[@]}"
echo "Published knowledge base $version${1:+ ($1)}"
