# UnraidClaw Development Log

## Infrastructure Overview

| Server | Role | Tailscale |
|--------|------|-----------|
| `unraid-syd` | Runs OpenClaw (krusty) | `myth-nessie.ts.net` tailnet |
| `optiplex3070` | Runs UnraidClaw plugin | Shared node via `scorpion-hippocampus.ts.net`, IP `100.107.204.31` |

- UnraidClaw API: `https://100.107.204.31:9876`
- OpenClaw container: `OpenClaw` on unraid-syd
- OpenClaw config mapped to host: `/mnt/cache/appdata/openclaw/config` → `/root/.openclaw`
- UnraidClaw server binary: `/usr/local/emhttp/plugins/unraidclaw/server/index.cjs`
- UnraidClaw plugin source on both servers: `/mnt/cache/appdata/unraidclaw-dev/`
- Fork: `https://github.com/bitcryptic-gw/unraidclaw`

---

## Session Summary — 2026-03-06

### What Was Built

Added full Docker container creation support to UnraidClaw, tested end-to-end via OpenClaw AI agent (krusty) deploying Vikunja via WhatsApp.

### PR Submitted
**`feat: add docker:create endpoint with Unraid UI integration`**  
→ `bitcryptic-gw/unraidclaw` → `emaspa/unraidclaw` (open, able to merge)

### Files Changed (6)

#### `packages/shared/src/resources.ts`
- Added `docker:create` to `PERMISSION_CATEGORIES` under Docker section

#### `packages/unraid-plugin/server/src/routes/docker.ts`
- Added `POST /api/docker/containers` — creates container via `docker run` CLI
  - Accepts: `image`, `name`, `ports`, `volumes`, `env`, `restart`, `network`, `labels`, `icon`, `webui`
  - Writes Unraid XML template to `/boot/config/plugins/dockerMan/templates-user/my-<name>.xml`
  - Applies `net.unraid.docker.managed`, `net.unraid.docker.icon`, `net.unraid.docker.webui` labels
  - Pre-creates host volume directories with `chown 1000:1000` before container start
  - Auto-masks env vars containing `secret`, `password`, or `key` in XML template
- Switched `DELETE /api/docker/containers/:id` from GraphQL to CLI (`docker rm [-f]`)
  - Supports `?force=true` query param for stop+remove in one call

#### `packages/unraid-plugin/src/usr/local/emhttp/plugins/unraidclaw/unraidclaw.page`
- Added `docker:create` checkbox to Docker section of Permissions UI

#### `packages/unraid-plugin/src/usr/local/emhttp/plugins/unraidclaw/javascript/unraidclaw.js`
- Added `docker:create` to `docker-manager` preset
- Added `docker:create` to `OCC_CATEGORIES.docker` array

#### `packages/openclaw-plugin/src/tools/docker.ts`
- Added `unraid_docker_create` tool with full parameter schema
- Updated `unraid_docker_remove` tool description and added `force` boolean parameter

### Key Bugs Found & Fixed
- UnraidClaw tools with no parameters missing `properties: {}` in schema → patched in installed plugin
- `--external @unraidclaw/shared` in ESM build meant shared package changes weren't bundled → use `bundle` script (CJS) instead of `build`
- Server was loading from `/usr/local/emhttp/plugins/unraidclaw/server/index.cjs`, not `/boot/config/plugins/unraidclaw/server.js`
- `docker:create` missing from `PERMISSION_CATEGORIES` meant `requirePermission` silently dropped the route
- Label ternary spread bug meant `icon`/`webui` labels weren't applied → replaced with explicit `if` statements
- Label push loop was missing from committed file (GitHub web editor truncation) → added `for` loop to push labels to args
- GraphQL `remove` mutation fails on running containers → switched DELETE route to CLI

### Vikunja Deployment (Test Case)
Running on optiplex at `http://100.107.204.31:3456`
- Data: `/mnt/cache/appdata/vikunja/files` → `/app/vikunja/files`
- DB: `/mnt/cache/appdata/vikunja/db` → `/db`
- Required env vars:
  - `VIKUNJA_SERVICE_JWTSECRET`
  - `VIKUNJA_SERVICE_PUBLICURL=http://100.107.204.31:3456`
  - `VIKUNJA_SERVICE_CORS_ENABLE=false`
- Container runs as uid=1000 — host dirs must be `chown 1000:1000`

---

## Build & Deploy Reference

### Optiplex (UnraidClaw server)
```bash
cd /mnt/cache/appdata/unraidclaw-dev
git pull
pnpm --filter @unraidclaw/server bundle        # produces dist/index.cjs
cp packages/unraid-plugin/server/dist/index.cjs /usr/local/emhttp/plugins/unraidclaw/server/index.cjs
/etc/rc.d/rc.unraidclaw restart
```

### unraid-syd (OpenClaw plugin)
```bash
cd /mnt/cache/appdata/unraidclaw-dev
git pull
pnpm --filter @unraidclaw/shared build
pnpm --filter unraidclaw build                 # produces dist/index.js
cp packages/openclaw-plugin/dist/index.js /mnt/cache/appdata/openclaw/config/extensions/unraidclaw/dist/index.js
docker restart OpenClaw
```

### Verify plugin loaded
```bash
docker logs OpenClaw 2>&1 | grep "registered" | tail -3
# Should show: registered 40 tools
```

---

## Pending / Next Challenges

- [ ] **Tailscale sidecar for Vikunja** — make it accessible as `vikunja.myth-nessie.ts.net` without port numbers
- [ ] **Krusty system prompt tuning** — teach it correct volume paths and container conventions for common apps
- [ ] **UnraidClaw docker:update** — pull new image versions and recreate containers in place
- [ ] **Vikunja setup** — configure admin account, invite colleague, start using as shared workspace
- [ ] **OpenClaw multi-server** — configure krusty to manage both unraid-syd and optiplex from one conversation
- [ ] **Rotate API keys** — keys were exposed in this session and should be regenerated
