#!/usr/bin/env bash
# Turns this starter into a new project: renames "cloudie" everywhere (package names, Pages project,
# Terraform state, tokens, Docker images, Flutter project) and sets the mobile app id.
#
#   ./cli.sh rename              asks for the values
#   scripts/rename.sh NAME ORG   e.g. scripts/rename.sh acme-notes com.example
#
# Run it once, on a fresh copy, before the first deploy: the Pages project name, the Android app id and
# the iOS bundle id can't change after they are live. Review with `git diff` afterwards.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OLD_NAME="cloudie"
OLD_ORG="com.area51projects"

die() { echo "rename: $*" >&2; exit 1; }
ask() { # prompt default
  if command -v gum >/dev/null && [ -t 0 ]; then gum input --header "$1" --value "$2" --width 60; else
    local v; read -r -p "$1 [$2]: " v; printf '%s' "${v:-$2}"; fi
}

NAME="${1:-}"
ORG="${2:-}"
[[ -n "$NAME" ]] || NAME="$(ask "Project name (lowercase, letters, digits, dashes)" "")"
[[ -n "$ORG" ]] || ORG="$(ask "Mobile app org (reverse domain)" "$OLD_ORG")"
[[ "$NAME" =~ ^[a-z][a-z0-9-]{1,40}$ ]] || die "name must be lowercase letters, digits and dashes, starting with a letter"
[[ "$ORG" =~ ^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$ ]] || die "org must look like com.example"
[[ "$NAME" != "$OLD_NAME" || "$ORG" != "$OLD_ORG" ]] || die "nothing to change"

# Dart package names and app ids allow no dashes.
SNAKE="${NAME//-/_}"
# PascalCase, no spaces: it is also used in code (CloudieApp → AcmeNotesApp). Edit display names after.
TITLE="$(sed -E 's/(^|-)([a-z])/\1\u\2/g; s/-//g' <<<"$NAME")"
OLD_TITLE="Cloudie"
OLD_ID="$OLD_ORG.$OLD_NAME"
NEW_ID="$ORG.$SNAKE"

echo "Name:       $OLD_NAME → $NAME   ($OLD_TITLE → $TITLE, Dart: $SNAKE)"
echo "App id:     $OLD_ID → $NEW_ID"
if command -v gum >/dev/null && [ -t 0 ]; then gum confirm "Rename the project?" || exit 0; fi

# Text files only, skipping generated and vendored folders.
mapfile -t FILES < <(grep -rIl \
  --exclude-dir={node_modules,.git,.svelte-kit,build,.wrangler,.terraform,.dart_tool,out,Pods,.gradle} \
  --exclude=pnpm-lock.yaml --exclude=package-lock.json --exclude=rename.sh \
  -e "$OLD_NAME" -e "$OLD_TITLE" -e "$OLD_ORG" . || true)

for f in "${FILES[@]}"; do
  sed -i \
    -e "s/${OLD_ID//./\\.}/$NEW_ID/g" \
    -e "s/--org ${OLD_ORG//./\\.}/--org $ORG/g" \
    -e "s/package:$OLD_NAME\//package:$SNAKE\//g" \
    -e "s/^name: $OLD_NAME$/name: $SNAKE/" \
    -e "s/--project-name $OLD_NAME --platforms/--project-name $SNAKE --platforms/" \
    -e "s/$OLD_TITLE/$TITLE/g" \
    -e "s/$OLD_NAME/$NAME/g" \
    "$f"
done

# Android keeps the Kotlin source in a folder per app id segment.
KT="mobile/android/app/src/main/kotlin"
if [[ -d "$KT/${OLD_ID//.//}" ]]; then
  mkdir -p "$KT/${NEW_ID//.//}"
  mv "$KT/${OLD_ID//.//}"/* "$KT/${NEW_ID//.//}/"
  find "$KT" -type d -empty -delete
fi

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
echo "  3. ./cli.sh app analyze     the Flutter app still builds"
