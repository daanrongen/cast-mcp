# cast-mcp

MCP server for [Google Cast](https://developers.google.com/cast) — discover devices, play media, control volume, launch apps, and manage queues over stdio.

## Installation

```bash
npx -y @daanrongen/cast-mcp
```

## Tools (17 total)

| Domain        | Tools                                                            | Coverage                                              |
| ------------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| **Discovery** | `discover_devices`                                               | Scan local network for Cast-enabled devices via mDNS  |
| **Media**     | `play_media`, `pause`, `resume`, `stop`, `seek`, `get_media_status` | Playback control and media status                 |
| **Queue**     | `load_queue`, `queue_next`, `queue_prev`                         | Playlist queuing and navigation                       |
| **Apps**      | `get_status`, `launch_app`, `stop_app`                           | Application lifecycle on Cast receivers               |
| **Volume**    | `get_volume`, `set_volume`, `mute`, `unmute`                     | Volume and mute control                               |

## Setup

No environment variables are required. The server discovers Cast devices automatically via mDNS on the local network.

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cast": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@daanrongen/cast-mcp"]
    }
  }
}
```

Or via the CLI:

```bash
claude mcp add cast -- npx -y @daanrongen/cast-mcp
```

## Development

```bash
bun install
bun run dev        # run with --watch
bun test           # run test suite
bun run build      # bundle to dist/main.js
bun run inspect    # open MCP Inspector in browser
```

## Inspecting locally

`bun run inspect` launches the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) against the local build:

```bash
bun run build && bun run inspect
```

This opens the Inspector UI in your browser where you can call any tool interactively and inspect request/response shapes.

## Architecture

```
src/
├── config.ts               # (no env config required)
├── main.ts                 # Entry point — ManagedRuntime + StdioServerTransport
├── domain/
│   ├── CastClient.ts       # Context.Tag service interface
│   ├── errors.ts           # CastError, DeviceNotFoundError
│   └── models.ts           # Schema.Class models (CastDevice, MediaStatus, …)
├── infra/
│   ├── CastClientLive.ts   # Layer.scoped — mDNS discovery + castv2 connections
│   └── CastClientTest.ts   # In-memory test adapter
└── mcp/
    ├── server.ts           # McpServer wired to ManagedRuntime
    ├── utils.ts            # formatSuccess, formatError
    └── tools/              # discovery.ts, media.ts, queue.ts, apps.ts, volume.ts
```
