import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ManagedRuntime } from "effect";
import type { CastClient } from "../domain/CastClient.ts";
import type { CastError } from "../domain/errors.ts";
import { registerAppTools } from "./tools/apps.ts";
import { registerDiscoveryTools } from "./tools/discovery.ts";
import { registerMediaTools } from "./tools/media.ts";
import { registerQueueTools } from "./tools/queue.ts";
import { registerVolumeTools } from "./tools/volume.ts";

export const createMcpServer = (
  runtime: ManagedRuntime.ManagedRuntime<CastClient, CastError>,
): McpServer => {
  const server = new McpServer({
    name: "cast-mcp-server",
    version: "1.0.0",
  });

  registerDiscoveryTools(server, runtime);
  registerMediaTools(server, runtime);
  registerVolumeTools(server, runtime);
  registerAppTools(server, runtime);
  registerQueueTools(server, runtime);

  return server;
};
