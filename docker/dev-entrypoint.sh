#!/bin/sh
# Installs packages (fast: the store is a cached volume, and nothing happens when they're already current),
# then runs the container's command (pnpm dev by default).
set -e
cd /app
if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile --reporter=silent; else pnpm install; fi
exec "$@"
