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
</p>

---

## 📋 About

**UnraidClaw Browse** is a **custom fork** of [UnraidClaw](https://github.com/emaspa/unraidclaw) by [@emaspa](https://github.com/emaspa).

**🧠 Code written by AI** (Claude / GPT) — this plugin was created and customized using artificial intelligence.

This fork adds **read-only browse APIs** for disks and shares, allowing AI agents to explore the filesystem hierarchy on your Unraid server.

All other features are identical to the original UnraidClaw.

### 🆕 What's added in this fork

| Tool | Description |
|------|-------------|
| `unraid_disk_browse` | Browse disk filesystem hierarchy (read-only) |
| `unraid_share_browse` | Browse share filesystem hierarchy (read-only) |

---

## Features (from UnraidClaw)

- **43 tools** across 11 categories: Docker, VMs, Array, Disks, Shares, System, Notifications, Network, Users, Logs
- **22 permission keys** in a resource:action matrix, configurable from the WebGUI
- **HTTPS** with auto-generated self-signed TLS certificate
- **SHA-256 API key** authentication
- **Activity logging** with JSONL format
- **OpenClaw plugin** available on npm

---

## Requirements

- **Unraid 7.0.0+** (Node.js 22 is built-in)

---

## Installation

### Manual install

```bash
# Download and install the plugin
plugin install https://raw.githubusercontent.com/oleksandrIIIradchenko/unraidclaw-browse/main/packages/unraid-plugin/unraidclaw-browse.plg
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

Returns directory listing with file sizes and modification times.

**Permission:** `disk:read`

### Browse Share Filesystem

```
GET /api/shares/:name/browse?path=<directory>
```

Returns directory listing with file sizes and modification times.

**Permission:** `share:read`

---

## Original UnraidClaw Documentation

For full API reference, OpenClaw plugin setup, and architecture details, see the [original UnraidClaw README](https://github.com/emaspa/unraidclaw).

---

## License

MIT — same as the original UnraidClaw project.
