# UnraidClaw Browse - Custom Build

Custom build of [UnraidClaw](https://github.com/emaspa/unraidclaw) with additional browse APIs.

## Features

All features from the original UnraidClaw plus:
- **Read-only browse APIs** for disks and shares
- OpenClaw tools: `unraid_disk_browse` and `unraid_share_browse`

## Installation

### Via Unraid WebGUI

1. Go to **Settings → Plugin Management**
2. Click **Install** next to the plugin URL field
3. Paste this URL:
   ```
   https://raw.githubusercontent.com/oleksandrIIIradchenko/unraidclaw-custom/main/packages/unraid-plugin/unraidclaw-browse.plg
   ```
4. Follow the prompts

### Via Console

```bash
wget https://raw.githubusercontent.com/oleksandrIIIradchenko/unraidclaw-custom/main/packages/unraid-plugin/unraidclaw-browse.plg -O /tmp/unraidclaw-browse.plg
installplg /tmp/unraidclaw-browse.plg
```

## Version

**0.1.28-browse1**

See [CHANGELOG](./CHANGELOG.md) for full version history.

## Requirements

- Unraid 6.12.0+
- Node.js 22+ (built-in on Unraid 7.x)

## Configuration

After installation, access the plugin at:
**Settings → unraidclaw-browse**

Configure your Unraid API key and permissions from the WebGUI.

## Support

For issues with this custom build, contact the maintainer.
