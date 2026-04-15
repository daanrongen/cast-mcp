import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect, type ManagedRuntime } from "effect";
import { z } from "zod";
import { CastClient } from "../../domain/CastClient.ts";
import type { CastError } from "../../domain/errors.ts";
import { runTool } from "../utils.ts";

export const registerAppTools = (
  server: McpServer,
  runtime: ManagedRuntime.ManagedRuntime<CastClient, CastError>,
) => {
  server.tool(
    "get_status",
    "Get the receiver status of a Cast device: active application, volume, session info.",
    {
      host: z.string().describe("IP address or hostname of the Cast device"),
    },
    {
      title: "Get Receiver Status",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    ({ host }) =>
      runTool(
        runtime,
        Effect.gen(function* () {
          const client = yield* CastClient;
          return yield* client.getStatus(host);
        }),
      ),
  );

  server.tool(
    "launch_app",
    'Launch an app on a Cast device by its appId. Common app IDs: "CC1AD845" (Default Media Receiver), "YouTube" (YouTube), "233637DE" (Google Play Music).',
    {
      host: z.string().describe("IP address or hostname of the Cast device"),
      appId: z
        .string()
        .describe('Cast app ID, e.g. "CC1AD845" for Default Media Receiver or "YouTube"'),
    },
    {
      title: "Launch App",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    ({ host, appId }) =>
      runTool(
        runtime,
        Effect.gen(function* () {
          const client = yield* CastClient;
          return yield* client.launchApp(host, appId);
        }),
      ),
  );

  server.tool(
    "stop_app",
    "Stop the currently running app on a Cast device.",
    {
      host: z.string().describe("IP address or hostname of the Cast device"),
    },
    {
      title: "Stop App",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    ({ host }) =>
      runTool(
        runtime,
        Effect.gen(function* () {
          const client = yield* CastClient;
          yield* client.stopApp(host);
          return { ok: true };
        }),
      ),
  );
};
