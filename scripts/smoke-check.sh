#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

FLASH_BASE="$TMP_DIR/flash"
mkdir -p "$FLASH_BASE"
export FLASH_BASE

CFG_FILE="$FLASH_BASE/unraidclaw-browse.cfg"

fail() {
  echo "Smoke check FAILED: $*" >&2
  exit 1
}

echo "[1/9] Install deps"
pnpm install --frozen-lockfile --prod=false

echo "[2/9] Prepare workspace packages for tests"
pnpm --filter @unraidclaw/shared build

echo "[3/9] Unit tests"
pnpm --filter @unraidclaw/shared test
pnpm --filter @unraidclaw/server test

echo "[4/9] Typecheck"
pnpm typecheck

echo "[5/9] Build"
pnpm build

echo "[6/9] Validate config + permissions flows against isolated FLASH_BASE"
FLASH_BASE="$FLASH_BASE" pnpm --filter @unraidclaw/server run smoke:config

cat > "$CFG_FILE" <<'EOF'
SERVICE="enable"
PORT="9988"
HOST="127.0.0.1"
GRAPHQL_URL="http://localhost:81/graphql"
UNRAID_API_KEY="keepme"
API_KEY_HASH="abc123"
MAX_LOG_SIZE="4096"
EOF

FLASH_BASE="$FLASH_BASE" pnpm --filter @unraidclaw/server run smoke:config

echo "[7/9] Build plugin package"
VERSION=$(grep -oP 'ENTITY\s+version\s+"\K[^"]+' packages/unraid-plugin/unraidclaw-browse.plg)
bash packages/unraid-plugin/scripts/build.sh "$VERSION"

echo "[8/9] Validate PLG structure + release references"
PLG="packages/unraid-plugin/unraidclaw-browse.plg"
EXPECTED_PKG="unraidclaw-browse-${VERSION}-x86_64-1.txz"
EXPECTED_MD5_FILE="${EXPECTED_PKG}.md5"

grep -q "oleksandrIIIradchenko/unraidclaw-browse" "$PLG"
grep -q "<!ENTITY version   \"${VERSION}\">" "$PLG"
grep -q "<!ENTITY pkgURL    \"https://github.com/&repo;/releases/download/v&version;/&name;-&version;-x86_64-1.txz\">" "$PLG"
grep -q '<FILE Name="/boot/config/plugins/&name;/&name;-&version;-x86_64-1.txz" Run="upgradepkg --install-new">' "$PLG"
grep -q '<MD5>&md5;</MD5>' "$PLG"
[ -f "packages/unraid-plugin/build/${EXPECTED_PKG}" ] || fail "Missing built package ${EXPECTED_PKG}"
[ -f "packages/unraid-plugin/build/${EXPECTED_MD5_FILE}" ] || fail "Missing built checksum ${EXPECTED_MD5_FILE}"

echo "[9/9] Validate no obvious legacy runtime paths remain in plugin sources"
LEGACY_HITS=$(find packages/unraid-plugin \
  \( -path '*/build/*' -o -path '*/dist/*' -o -path '*/node_modules/*' \) -prune -o \
  -type f -print | while IFS= read -r f; do
    grep -nE '/etc/unraidclaw|unraidclaw\.cfg|unraidclaw\.log|rc\.unraidclaw($|[^-])|/var/log/unraidclaw($|/)|/boot/config/plugins/unraidclaw($|/)' "$f" && printf 'FILE:%s\n' "$f"
  done || true)
if [ -n "$LEGACY_HITS" ]; then
  echo "$LEGACY_HITS"
  fail "Legacy runtime/plugin path references still present"
fi

echo "Note: MD5 is release-time validated, not byte-for-byte reproducible across environments yet."
echo "Smoke check OK"
