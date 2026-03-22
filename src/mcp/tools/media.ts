import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect, type ManagedRuntime } from "effect";
import { z } from "zod";
import { CastClient } from "../../domain/CastClient.ts";
import type { CastError } from "../../domain/errors.ts";
import { formatError, formatSuccess } from "../utils.ts";

export const registerMediaTools = (
  server: McpServer,
  runtime: ManagedRuntime.ManagedRuntime<CastClient, CastError>,
) => {
  server.tool(
    "cast_play_media",
    "Play a media URL on a Cast device. Provide the device host (IP or hostname), a direct URL to the media, its MIME type, and optional metadata.",
    {
      host: z.string().describe("IP address or hostname of the Cast device"),
      contentUrl: z.string().describe("Direct URL of the media to play"),
      contentType: z
        .string()
        .describe('MIME type, e.g. "audio/mp3" or "video/mp4"'),
      title: z.string().optional().describe("Track or video title"),
      artist: z.string().optional().describe("Artist name"),
      albumName: z.string().optional().describe("Album name"),
    },
    {
      title: "Play Media",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async ({ host, contentUrl, contentType, title, artist, albumName }) => {
      const metadata: Record<string, string> = {};
      if (title) metadata.title = title;
      if (artist) metadata.artist = artist;
      if (albumName) metadata.albumName = albumName;

      const result = await runtime.runPromiseExit(
        Effect.gen(function* () {
          const client = yield* CastClient;
          return yield* client.playMedia(
            host,
            contentUrl,
            contentType,
            Object.keys(metadata).length > 0 ? metadata : undefined,
          );
        }),
      );
      if (result._tag === "Failure") return formatError(result.cause);
      return formatSuccess(result.value);
    },
  );

  server.tool(
    "cast_pause",
    "Pause the currently playing media on a Cast device.",
    {
      host: z.string().describe("IP address or hostname of the Cast device"),
    },
    {
      title: "Pause Media",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ host }) => {
      const result = await runtime.runPromiseExit(
        Effect.gen(function* () {
          const client = yield* CastClient;
          yield* client.pauseMedia(host);
        }),
      );
      if (result._tag === "Failure") return formatError(result.cause);
      return formatSuccess({ ok: true });
    },
  );

  server.tool(
    "cast_resume",
    "Resume paused media on a Cast device.",
    {
      host: z.string().describe("IP address or hostname of the Cast device"),
    },
    {
      title: "Resume Media",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ host }) => {
      const result = await runtime.runPromiseExit(
        Effect.gen(function* () {
          const client = yield* CastClient;
          yield* client.resumeMedia(host);
        }),
      );
      if (result._tag === "Failure") return formatError(result.cause);
      return formatSuccess({ ok: true });
    },
  );

  server.tool(
    "cast_stop",
    "Stop the current media session on a Cast device.",
    {
      host: z.string().describe("IP address or hostname of the Cast device"),
    },
    {
      title: "Stop Media",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ host }) => {
      const result = await runtime.runPromiseExit(
        Effect.gen(function* () {
          const client = yield* CastClient;
          yield* client.stopMedia(host);
        }),
      );
      if (result._tag === "Failure") return formatError(result.cause);
      return formatSuccess({ ok: true });
    },
  );

  server.tool(
    "cast_seek",
    "Seek to a position in the currently playing media on a Cast device.",
    {
      host: z.string().describe("IP address or hostname of the Cast device"),
      currentTime: z.number().describe("Position to seek to, in seconds"),
    },
    {
      title: "Seek Media",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async ({ host, currentTime }) => {
      const result = await runtime.runPromiseExit(
        Effect.gen(function* () {
          const client = yield* CastClient;
          yield* client.seekMedia(host, currentTime);
        }),
      );
      if (result._tag === "Failure") return formatError(result.cause);
      return formatSuccess({ ok: true });
    },
  );

  server.tool(
    "cast_get_media_status",
    "Get the current media playback state on a Cast device (player state, position, duration, title, etc.).",
    {
      host: z.string().describe("IP address or hostname of the Cast device"),
    },
    {
      title: "Get Media Status",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ host }) => {
      const result = await runtime.runPromiseExit(
        Effect.gen(function* () {
          const client = yield* CastClient;
          return yield* client.getMediaStatus(host);
        }),
      );
      if (result._tag === "Failure") return formatError(result.cause);
      return formatSuccess(result.value);
    },
  );
};
