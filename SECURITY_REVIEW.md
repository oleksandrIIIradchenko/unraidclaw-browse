# UnraidClaw Browse — Security Review Notes

## Scope
Current review focused on read-only browse endpoints:
- `GET /api/disks/:id/browse`
- `GET /api/shares/:name/browse`

## Current protections
- [x] Permission gate required (`disk:read` / `share:read`)
- [x] Browse root restricted to `/mnt/<disk>` or `/mnt/user/<share>`
- [x] Path traversal via `..` rejected
- [x] Backslash traversal variants rejected
- [x] Resolved real path must stay inside root
- [x] Symlink escapes outside root rejected
- [x] Limit clamped to `1..1000`
- [x] Hidden files opt-in only (`includeHidden=true`)

## Remaining hardening ideas
- [ ] Add explicit max path length guard
- [ ] Add rate limiting for browse endpoints
- [ ] Add audit reason for denied browse attempts
- [ ] Consider separate `browse:read` permission scope from generic `disk:read` / `share:read`
- [ ] Consider configurable safe roots if file operations are added later

## Notes
The current browse implementation is much safer than before because path traversal and symlink escape cases are now covered by tests.
