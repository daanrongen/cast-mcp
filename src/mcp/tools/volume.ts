import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect, type ManagedRuntime } from "effect";
import { z } from "zod";
import { CastClient } from "../../domain/CastClient.ts";
import type { CastError } from "../../domain/errors.ts";
import { runTool } from "../utils.ts";

export const registerVolumeTools = (
  server: McpServer,
  runtime: ManagedRuntime.ManagedRuntime<CastClient, CastError>,
) => {
  server.tool(
    "get_volume",
    "Get the current volume level (0.0–1.0) and mute state of a Cast device.",
    {
      host: z.string().describe("IP address or hostname of the Cast device"),
    },
    {
      title: "Get Volume",
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
          return yield* client.getVolume(host);
        }),
      ),
  );

  server.tool(
    "set_volume",
    "Set the volume level of a Cast device. Level must be between 0.0 (silent) and 1.0 (maximum).",
    {
      host: z.string().describe("IP address or hostname of the Cast device"),
      level: z.number().min(0).max(1).describe("Volume level between 0.0 and 1.0"),
    },
    {
      title: "Set Volume",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    ({ host, level }) =>
      runTool(
        runtime,
        Effect.gen(function* () {
          const client = yield* CastClient;
          yield* client.setVolume(host, level);
          return { ok: true, level };
        }),
      ),
  );

  server.tool(
    "mute",
    "Mute a Cast device.",
    {
      host: z.string().describe("IP address or hostname of the Cast device"),
    },
    {
      title: "Mute Device",
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
          yield* client.setMuted(host, true);
          return { ok: true, muted: true };
        }),
      ),
  );

  server.tool(
    "unmute",
    "Unmute a Cast device.",
    {
      host: z.string().describe("IP address or hostname of the Cast device"),
    },
    {
      title: "Unmute Device",
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
          yield* client.setMuted(host, false);
          return { ok: true, muted: false };
        }),
      ),
  );
};
