# cast-mcp

MCP server for [Google Cast](https://developers.google.com/cast) — discover devices on your local network via mDNS, play media, control volume, launch apps, and manage queues, all over stdio. No environment variables or API keys required; the server connects directly to Cast receivers using the castv2 protocol.

## Installation

```bash
bunx @daanrongen/cast-mcp
```

## Tools (17 total)

| Domain        | Tools                                                               | Coverage                                             |
| ------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| **Discovery** | `discover_devices`                                                  | Scan local network for Cast-enabled devices via mDNS |
| **Media**     | `play_media`, `pause`, `resume`, `stop`, `seek`, `get_media_status` | Playback control and media status                    |
| **Queue**     | `load_queue`, `queue_next`, `queue_prev`                            | Playlist queuing and navigation                      |
| **Apps**      | `get_status`, `launch_app`, `stop_app`                              | Application lifecycle on Cast receivers              |
| **Volume**    | `get_volume`, `set_volume`, `mute`, `unmute`                        | Volume and mute control                              |

## Setup

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cast": {
      "type": "stdio",
      "command": "bunx",
      "args": ["@daanrongen/cast-mcp"]
    }
  }
}
```

### Claude Code CLI

```bash
claude mcp add cast -- bunx @daanrongen/cast-mcp
```

## Development

```bash
bun install
bun run dev        # run with --watch
bun test           # run test suite
bun run typecheck  # type check without emitting
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
├── config.ts                   # (no env config required)
├── main.ts                     # Entry point — ManagedRuntime + StdioServerTransport
├── domain/
│   ├── CastClient.ts           # Context.Tag service interface (port)
│   ├── errors.ts               # CastError, DeviceNotFoundError
│   ├── models.ts               # Schema.Class models (CastDevice, MediaStatus, …)
│   ├── discovery.test.ts       # Discovery domain tests
│   ├── media.test.ts           # Media domain tests
│   └── volume.test.ts          # Volume domain tests
├── infra/
│   ├── CastClientLive.ts       # Layer.scoped — mDNS discovery + castv2 connections
│   └── CastClientTest.ts       # In-memory test adapter
└── mcp/
    ├── server.ts               # McpServer wired to ManagedRuntime
    ├── utils.ts                # formatSuccess, formatError
    └── tools/                  # discovery.ts, media.ts, queue.ts, apps.ts, volume.ts
```

## License

MIT
