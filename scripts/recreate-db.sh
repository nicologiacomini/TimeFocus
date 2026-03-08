#!/usr/bin/env zsh
set -euo pipefail

# Script: recreate-db.sh
# Purpose: Backup any existing local SQLite DB files and recreate an empty DB
# using Prisma. Designed for local development. Run from project root.

echo "[recreate-db] backing up existing local DB files (if any)..."
cp dev.db dev.db.bak 2>/dev/null || true
cp prisma/dev.db prisma/dev.db.bak 2>/dev/null || true

echo "[recreate-db] ensuring dependencies are installed (bun install)..."
# Use bun if available; otherwise fall back to npm install
if command -v bun >/dev/null 2>&1; then
  bun install
else
  echo "bun not found in PATH — running npm install instead"
  npm install
fi

echo "[recreate-db] removing any remaining dev DB files to ensure a clean start..."
rm -f dev.db prisma/dev.db

echo "[recreate-db] pushing schema to SQLite (creates new dev.db)..."
# Use package.json scripts (prisma binary will be used from node_modules)
if command -v bun >/dev/null 2>&1; then
  bun run db:push
  bun run db:generate
else
  npm run db:push
  npm run db:generate
fi

echo "[recreate-db] done. New DB files (if any):"
ls -lah dev.db prisma/dev.db 2>/dev/null || true

echo "[recreate-db] backup files (if created):"
ls -lah dev.db.bak prisma/dev.db.bak 2>/dev/null || true

echo "[recreate-db] Tip: Verify your DATABASE_URL in .env or .env.local (should be file:./dev.db)"
