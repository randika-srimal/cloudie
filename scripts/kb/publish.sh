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
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

BUCKET="cloudie-kb"
wrangler() { (cd "$ROOT/backend/agent" && pnpm exec wrangler "$@"); }

version="$(pnpm -s kb:build | tail -1)"
[[ "$version" =~ ^[0-9a-f]{12}$ ]] || { echo "kb:build did not print a version: $version" >&2; exit 1; }
dir="dist/kb/$version"

for file in instructions.md prompt.md manifest.json; do
  case "$file" in
    *.json) type="application/json" ;;
    *) type="text/markdown; charset=utf-8" ;;
  esac
  wrangler r2 object put "$BUCKET/kb/$version/$file" --file "$ROOT/$dir/$file" --content-type "$type" --remote
done

# Merge kbVersion into the current config; with no config saved yet, start from the defaults.
# (Wrangler prints "Value not found" for a missing key; any other failure stops the script.)
current="$(wrangler kv key get config --binding CONFIG --remote)"
[[ "$current" == *"Value not found"* ]] && current=""
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
wrangler kv key put config "$next" --binding CONFIG --remote
echo "Published knowledge base $version"
