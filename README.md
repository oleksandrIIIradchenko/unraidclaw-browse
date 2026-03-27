<p align="center">
  <img src="README_logo.png" width="96" alt="UnraidClaw Browse logo" />
</p>

<h1 align="center">UnraidClaw Browse</h1>

<p align="center">
  AI Agent Gateway for Unraid with extended browse APIs — permission-enforcing REST API for managing your server.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/unraid-7.0%2B-orange" alt="Unraid 7.0+" />
  <img src="https://img.shields.io/badge/node-22%2B-green" alt="Node 22+" />
  <a href="https://github.com/oleksandrIIIradchenko/unraidclaw-browse/releases"><img src="https://img.shields.io/github/v/release/oleksandrIIIradchenko/unraidclaw-browse" alt="Release" /></a>
  <a href="https://donatello.to/oleksandrIIIradchenko"><img src="https://img.shields.io/badge/Donate-Buy%20me%20a%20coffee-ff5f5f5?style=flat&logo=buy-me-a-coffee" alt="Donate" /></a>
</p>

---

## 📋 About

**UnraidClaw Browse** is a **custom fork** of [UnraidClaw](https://github.com/emaspa/unraidclaw) by [@emaspa](https://github.com/emaspa).

**🧠 Code written by AI** (Claude / GPT) — this plugin was created and customized using artificial intelligence.

This fork adds **read-only browse APIs** for disks and shares, allowing AI agents to explore the filesystem hierarchy on your Unraid server.

All other features are identical to the original UnraidClaw.

### 🆕 What's added in this fork

| Tool / API | Description |
|------|-------------|
| `unraid_disk_browse` | Browse disk filesystem hierarchy (read-only) |
| `unraid_share_browse` | Browse share filesystem hierarchy (read-only) |
| `GET /api/disks/:id/browse` | Browse disk contents with sorting / pagination metadata |
| `GET /api/shares/:name/browse` | Browse share contents with sorting / pagination metadata |

---

## Features

- **43+ tools** across Docker, VMs, Array, Disks, Shares, System, Notifications, Network, Users, Logs
- **Browse APIs** for disks and shares with:
  - breadcrumbs metadata
  - sorting (`name`, `size`, `mtime`)
  - pagination (`limit`, `offset`)
  - richer browse response metadata (`total`, `truncated`, etc.)
- **22 permission keys** in a resource:action matrix, configurable from the WebGUI
- **HTTPS** with auto-generated self-signed TLS certificate
- **SHA-256 API key** authentication
- **Activity logging** with JSONL format
- **Basic browse hardening**:
  - path traversal rejection
  - symlink escape rejection
  - max path length guard
  - basic browse rate limiting
- **Unit tests + smoke checks + CI workflows** are now included
- **OpenClaw plugin** available on npm

---

## Requirements

- **Unraid 7.0.0+** (Node.js 22 is built-in)

---

## Installation

### Via WebGUI
1. Go to **Settings → Plugin Management**
2. Click **Install** and paste this URL:
```
https://raw.githubusercontent.com/oleksandrIIIradchenko/unraidclaw-browse/main/packages/unraid-plugin/unraidclaw-browse.plg
```

### Via Console

```bash
wget https://raw.githubusercontent.com/oleksandrIIIradchenko/unraidclaw-browse/main/packages/unraid-plugin/unraidclaw-browse.plg -O /tmp/unraidclaw-browse.plg
installplg /tmp/unraidclaw-browse.plg
```

### Setup

1. Go to **Settings > Management Access** in the Unraid WebGUI, scroll to the API section, and copy your Unraid API key (must have **ADMIN** role)
2. Go to **Settings > UnraidClaw Browse**, paste the Unraid API key into the **Unraid API Key** field
3. Generate an API key (it's hashed with SHA-256; save it, it won't be shown again)
4. Configure permissions on the **Permissions** tab
5. Set Service to **Enabled** and click Apply

The server starts on port `9876` over HTTPS by default.

---

## New Browse APIs

### Browse Disk Filesystem

```
GET /api/disks/:id/browse?path=<directory>
```

Returns directory listing with file sizes, modification times, breadcrumbs, sorting info, pagination info, and total entry counts.

Supported query params:
- `path`
- `limit`
- `offset`
- `sortBy=name|size|mtime`
- `order=asc|desc`
- `includeHidden=true|false`
- `dirsOnly=true|false`

**Permission:** `disk:read`

### Browse Share Filesystem

```
GET /api/shares/:name/browse?path=<directory>
```

Returns directory listing with file sizes, modification times, breadcrumbs, sorting info, pagination info, and total entry counts.

Supported query params:
- `path`
- `limit`
- `offset`
- `sortBy=name|size|mtime`
- `order=asc|desc`
- `includeHidden=true|false`
- `dirsOnly=true|false`

**Permission:** `share:read`

---

## Original UnraidClaw Documentation

For full API reference, OpenClaw plugin setup, and architecture details, see the [original UnraidClaw README](https://github.com/emaspa/unraidclaw).

---

## 💛 Support

If this plugin was useful to you, consider buying me a coffee:

👉 https://donatello.to/oleksandrIIIradchenko

<img src="donate-qr.png" width="200" alt="Donate QR Code" />

---

## License

MIT — same as the original UnraidClaw project.
