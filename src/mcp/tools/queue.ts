import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect, type ManagedRuntime } from "effect";
import { z } from "zod";
import { CastClient } from "../../domain/CastClient.ts";
import type { CastError } from "../../domain/errors.ts";
import { QueueItem } from "../../domain/models.ts";
import { formatError, formatSuccess } from "../utils.ts";

export const registerQueueTools = (
  server: McpServer,
  runtime: ManagedRuntime.ManagedRuntime<CastClient, CastError>,
) => {
  server.tool(
    "cast_load_queue",
    "Load a playlist of media items onto a Cast device. Items play in order.",
    {
      host: z.string().describe("IP address or hostname of the Cast device"),
      items: z
        .array(
          z.object({
            itemId: z
              .number()
              .describe("Unique integer ID for this queue item"),
            contentId: z.string().describe("Direct URL of the media"),
            contentType: z.string().describe('MIME type, e.g. "audio/mp3"'),
            title: z.string().optional().describe("Track title"),
            artist: z.string().optional().describe("Artist name"),
          }),
        )
        .min(1)
        .describe("Array of media items to load into the queue"),
    },
    {
      title: "Load Queue",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async ({ host, items }) => {
      const queueItems = items.map(
        (item) =>
          new QueueItem({
            itemId: item.itemId,
            media: {
              contentId: item.contentId,
              contentType: item.contentType,
              metadata:
                item.title || item.artist
                  ? { title: item.title, artist: item.artist }
                  : undefined,
            },
          }),
      );

      const result = await runtime.runPromiseExit(
        Effect.gen(function* () {
          const client = yield* CastClient;
          yield* client.loadQueue(host, queueItems);
        }),
      );
      if (result._tag === "Failure") return formatError(result.cause);
      return formatSuccess({ ok: true, itemCount: items.length });
    },
  );

  server.tool(
    "cast_queue_next",
    "Skip to the next item in the queue on a Cast device.",
    {
      host: z.string().describe("IP address or hostname of the Cast device"),
    },
    {
      title: "Queue Next",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async ({ host }) => {
      const result = await runtime.runPromiseExit(
        Effect.gen(function* () {
          const client = yield* CastClient;
          yield* client.queueNext(host);
        }),
      );
      if (result._tag === "Failure") return formatError(result.cause);
      return formatSuccess({ ok: true });
    },
  );

  server.tool(
    "cast_queue_prev",
    "Go to the previous item in the queue on a Cast device.",
    {
      host: z.string().describe("IP address or hostname of the Cast device"),
    },
    {
      title: "Queue Previous",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async ({ host }) => {
      const result = await runtime.runPromiseExit(
        Effect.gen(function* () {
          const client = yield* CastClient;
          yield* client.queuePrev(host);
        }),
      );
      if (result._tag === "Failure") return formatError(result.cause);
      return formatSuccess({ ok: true });
    },
  );
};
