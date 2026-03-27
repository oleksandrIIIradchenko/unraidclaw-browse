#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/6] Install deps"
pnpm install --frozen-lockfile --prod=false

echo "[2/6] Prepare workspace packages for tests"
pnpm --filter @unraidclaw/shared build

echo "[3/6] Unit tests"
pnpm --filter @unraidclaw/shared test
pnpm --filter @unraidclaw/server test

echo "[4/6] Typecheck"
pnpm typecheck

echo "[5/6] Build"
pnpm build

echo "[6/6] Build plugin package"
VERSION=$(grep -oP 'ENTITY\s+version\s+"\K[^"]+' packages/unraid-plugin/unraidclaw-browse.plg)
bash packages/unraid-plugin/scripts/build.sh "$VERSION"

echo "[7/7] Validate PLG structure"
PLG="packages/unraid-plugin/unraidclaw-browse.plg"
EXPECTED_PKG="unraidclaw-browse-${VERSION}-x86_64-1.txz"

grep -q "oleksandrIIIradchenko/unraidclaw-browse" "$PLG"
grep -q "<!ENTITY version   \"${VERSION}\">" "$PLG"
grep -q '/boot/config/plugins/&name;/&name;-&version;-x86_64-1.txz' "$PLG"

echo "Note: MD5 is release-time validated, not CI-stable, because txz builds are not deterministic yet."
echo "Smoke check OK"
