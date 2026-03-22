import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect, type ManagedRuntime } from "effect";
import { z } from "zod";
import { CastClient } from "../../domain/CastClient.ts";
import type { CastError } from "../../domain/errors.ts";
import { formatError, formatSuccess } from "../utils.ts";

export const registerDiscoveryTools = (
  server: McpServer,
  runtime: ManagedRuntime.ManagedRuntime<CastClient, CastError>,
) => {
  server.tool(
    "cast_discover_devices",
    "Scan the local network for Cast-enabled devices (Google Home, Chromecast, Nest Audio, etc.). Returns a list of devices with their name, host, port, type (audio/video/group), and model.",
    {
      timeoutMs: z
        .number()
        .optional()
        .describe(
          "How long to listen for mDNS responses in milliseconds (default: 5000)",
        ),
    },
    {
      title: "Discover Cast Devices",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async ({ timeoutMs }) => {
      const result = await runtime.runPromiseExit(
        Effect.gen(function* () {
          const client = yield* CastClient;
          return yield* client.discoverDevices(timeoutMs);
        }),
      );
      if (result._tag === "Failure") return formatError(result.cause);
      return formatSuccess(result.value);
    },
  );
};
