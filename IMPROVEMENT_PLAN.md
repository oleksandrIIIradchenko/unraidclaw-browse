# UnraidClaw Browse — Updated Improvement Plan

## 🎯 Goal
Stabilize **UnraidClaw Browse** as a reliable fork of UnraidClaw with extra browse capabilities, solid UI behavior, and predictable config/runtime persistence.

**Positioning:**
- [x] UnraidClaw Browse is currently a **fork of UnraidClaw** with extended browse APIs
- [ ] Not yet a fully separate platform/product

---

## Phase 0 — Core Stabilization First
**Priority: Critical**

Before adding major features, fix the platform baseline.

### Must be fully stable
- [ ] Start / Stop / Restart works reliably
- [ ] Service status in UI matches real daemon state
- [ ] API key persistence survives restart/stop/start
- [ ] Unraid API key persistence works correctly
- [ ] Permissions persist and reflect correctly in UI
- [ ] Log viewer reads the correct log file
- [x] All plugin paths use `unraidclaw-browse`, not legacy `unraidclaw` in the main runtime/config flow
- [ ] No stale references to old repo / old rc script / old cfg paths anywhere
- [ ] Generated key vs custom key flow behaves correctly in all scenarios
- [ ] UI state updates without misleading stale values

### Validation checklist
- [ ] Fresh install works
- [ ] Upgrade from previous build works
- [ ] Restart keeps config
- [ ] Stop/start keeps config
- [ ] Permissions saved → 403 disappears as expected
- [ ] Health endpoint reflects current version
- [ ] WebUI buttons behave consistently

---

## Phase 1 — UX / Frontend Reliability
**Priority: High**

### 1.1 Interface polish
- [ ] Fix all misleading states in settings/dashboard
- [ ] Improve service controls feedback
- [ ] Improve key-management UX
- [ ] Improve permission save feedback
- [ ] Improve log table readability
- [ ] Add loading / success / error states everywhere

### 1.2 Design refresh
- [ ] Make visual style cleaner and more consistent
- [ ] Use one coherent color system
- [ ] Improve spacing / card hierarchy / typography
- [ ] Improve mobile/narrow-width layout
- [x] Add plugin-specific icon/branding
- [ ] Clean up remaining legacy UnraidClaw naming

### 1.3 Frontend correctness
- [ ] Verify every button has a working backend action
- [ ] Verify every AJAX action updates UI state correctly
- [ ] Remove stale UI after operations
- [ ] Add no-reload behavior where possible

---

## Phase 2 — Browse Feature Set
**Priority: High**

This is the actual differentiator of the fork.

### Implemented
- [x] `GET /api/disks/:id/browse`
- [x] `GET /api/shares/:name/browse`
- [x] `unraid_disk_browse`
- [x] `unraid_share_browse`

### Next
- [ ] Breadcrumb navigation in UI
- [ ] Show file size / modified date / type clearly in the plugin UI
- [x] Directory-first sorting in browse API responses
- [x] Path validation / safe root enforcement
- [ ] Optional filtering by file extension
- [x] Pagination support in browse API responses

---

## Phase 3 — Permissions & Security
**Priority: High**

### 3.1 Permission model
- [ ] Separate browse permissions from generic read permissions
- [ ] Add explicit file-operation scopes before FileSync exists
- [ ] Add permission descriptions for dangerous operations
- [ ] Add permission validation on startup

### 3.2 Security controls
- [ ] IP allowlist / denylist
- [x] Basic rate limiting for browse endpoints
- [x] Better audit logging for denied browse requests
- [x] Safer path normalization for browse endpoints
- [x] Reject traversal attempts explicitly
- [x] Add security notes in repo docs (`SECURITY_REVIEW.md`)

### 3.3 Auditability
- [ ] Export logs to JSON/CSV
- [ ] Audit filters by resource/status/IP
- [ ] Show authorization failures clearly
- [ ] Add “why denied” details for 403 responses

---

## Phase 4 — Testing & Quality Gate
**Priority: High**

This should not be optional.

### 4.1 Automated checks
- [x] Unit tests for config loading
- [x] Unit tests for permission loading
- [x] Unit tests for path validation
- [ ] Unit tests for key generation/custom key flow

### 4.2 Integration / E2E
- [ ] UI button tests
- [ ] Start/stop/restart flow tests
- [ ] Save settings / save permissions tests
- [x] Browse endpoint tests (server-side/unit coverage)
- [x] Upgrade/install smoke checks scaffolded via `scripts/smoke-check.sh`

### 4.3 CI
- [x] GitHub Actions build
- [x] Typecheck
- [x] Test run
- [x] Release workflow updated for `unraidclaw-browse`
- [ ] `.plg` URL / MD5 consistency check

---

## Phase 5 — Advanced File Operations
**Priority: Medium / Security-gated**

**Do not implement until Phase 0–4 are stable.**

### FileSync / file management
- [ ] Upload from OpenClaw to Unraid
- [ ] Download from Unraid to OpenClaw
- [ ] Move files between folders
- [ ] Copy files/folders
- [ ] Create files/folders
- [ ] Rename files/folders
- [ ] Delete files/folders

### Required before enabling
- [ ] Safe root restrictions
- [ ] Explicit destructive permissions
- [ ] Dry-run support where possible
- [ ] Operation audit log
- [ ] Path sandboxing
- [ ] Large-file behavior defined

---

## Phase 6 — Platform Integrations
**Priority: Medium**

### Docker
- [ ] Docker templates list
- [ ] Create from template
- [ ] Image pull/prune
- [ ] Container resource stats history

### VM
- [ ] VM templates
- [ ] Snapshot management
- [ ] VM console access

### System
- [ ] UPS (NUT) monitoring
- [ ] SMART visualization
- [ ] Disk health history

---

## Phase 7 — Docs / DX / Distribution
**Priority: Medium**

### Docs
- [ ] Clean README
- [ ] Troubleshooting section
- [ ] Permissions reference
- [ ] “How install works” section
- [ ] Upgrade notes

### Developer experience
- [ ] OpenAPI/Swagger
- [ ] Postman/Insomnia collection
- [ ] Better release notes
- [ ] Local dev guide

### Distribution
- [ ] Stable release workflow
- [ ] Unraid CA template
- [ ] Rollback notes
- [ ] Changelog in UI

---

## Known Issues
- [ ] Some UI state still depends on client-side sync after actions
- [ ] Legacy path/name regressions can reappear during refactors
- [ ] Service state and config state need stronger reconciliation
- [ ] Key-management UX still needs simplification

---

## Recommended immediate roadmap
### Next 5 tasks only
- [ ] Fix all remaining UI state bugs
- [ ] Add automated install/restart/save smoke tests
- [ ] Finish permissions/log path cleanup everywhere
- [ ] Improve browse UX in UI
- [ ] Add CI validation for `.plg` + release artifact consistency

---

## Review Summary
- [x] The old plan had the right direction
- [x] The old plan mixed core stabilization and future expansion too early
- [x] FileSync / file operations need to be treated as security-gated work
- [x] Testing must move higher in priority
- [x] The fork should be positioned as a fork first, not as a brand-new platform yet
- [ ] Core stability is not finished yet
- [ ] UI/UX is not finished yet
- [ ] Runtime/config persistence is not fully proven yet

---

## Repository
- [x] Repository: https://github.com/oleksandrIIIradchenko/unraidclaw-browse
