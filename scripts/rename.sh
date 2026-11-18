#!/usr/bin/env bash
# Turns this starter into a new project: renames "cloudie" everywhere (package names, Pages project,
# Terraform state, tokens, Docker images).
#
#   ./cli.sh rename              asks for the values
#   scripts/rename.sh NAME       e.g. scripts/rename.sh acme-notes
#
# Run it once, on a fresh copy, before the first deploy: the Pages project name
# can't change after it is live. Review with `git diff` afterwards.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OLD_NAME="cloudie"

die() { echo "rename: $*" >&2; exit 1; }
ask() { # prompt default
  if command -v gum >/dev/null && [ -t 0 ]; then gum input --header "$1" --value "$2" --width 60; else
    local v; read -r -p "$1 [$2]: " v; printf '%s' "${v:-$2}"; fi
}

NAME="${1:-}"
[[ -n "$NAME" ]] || NAME="$(ask "Project name (lowercase, letters, digits, dashes)" "")"
[[ "$NAME" =~ ^[a-z][a-z0-9-]{1,40}$ ]] || die "name must be lowercase letters, digits and dashes, starting with a letter"
[[ "$NAME" != "$OLD_NAME" ]] || die "nothing to change"

# PascalCase, no spaces: it is also used in code. Edit display names after.
TITLE="$(sed -E 's/(^|-)([a-z])/\1\u\2/g; s/-//g' <<<"$NAME")"
OLD_TITLE="Cloudie"

echo "Name:       $OLD_NAME → $NAME   ($OLD_TITLE → $TITLE)"
if command -v gum >/dev/null && [ -t 0 ]; then gum confirm "Rename the project?" || exit 0; fi

# Text files only, skipping generated and vendored folders.
mapfile -t FILES < <(grep -rIl \
  --exclude-dir={node_modules,.git,.svelte-kit,build,.wrangler,.terraform,out} \
  --exclude=pnpm-lock.yaml --exclude=package-lock.json --exclude=rename.sh \
  -e "$OLD_NAME" -e "$OLD_TITLE" . || true)

for f in "${FILES[@]}"; do
  sed -i \
    -e "s/$OLD_TITLE/$TITLE/g" \
    -e "s/$OLD_NAME/$NAME/g" \
    "$f"
done

echo "Renamed ${#FILES[@]} files."

# In the dev container (./cli.sh rename): refresh the lockfile for the new package names, and re-align
# Markdown tables whose column widths changed with the name.
if command -v pnpm >/dev/null; then
  pnpm install --reporter=silent
  pnpm exec prettier --write . --log-level warn
fi

echo "Next:"
echo "  1. git diff                 review"
echo "  2. ./cli.sh check-all       typecheck, lint, test"
