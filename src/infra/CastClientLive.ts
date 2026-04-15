import { Effect, Layer, Ref } from "effect";
import MulticastDNS from "multicast-dns";
import { CastClient } from "../domain/CastClient.ts";
import { CastConnectionError, CastMediaError } from "../domain/errors.ts";
import {
  AppInfo,
  CastDevice,
  MediaStatus,
  type QueueItem,
  ReceiverStatus,
} from "../domain/models.ts";

// castv2-client has no TypeScript types — import as plain JS modules.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client, DefaultMediaReceiver } = require("castv2-client") as {
  // biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
  Client: new () => any;
  // biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
  DefaultMediaReceiver: any;
};

// Resolve device type from castv2 capability bitmask.
// ca & 2048 = audio group, ca & 4 = video capable, else audio-only.
const resolveDeviceType = (ca: number): "audio" | "video" | "group" => {
  if (ca & 2048) return "group";
  if (ca & 4) return "video";
  return "audio";
};

// Parse TXT record buffer array into a key-value map.
const parseTxt = (txt: Buffer[]): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const buf of txt) {
    const str = buf.toString("utf8");
    const eq = str.indexOf("=");
    if (eq !== -1) {
      result[str.slice(0, eq)] = str.slice(eq + 1);
    }
  }
  return result;
};

// Connect a PlatformSender (castv2-client Client) to a Cast device.
const connectPlatform = (
  host: string,
  port = 8009,
  // biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
): Effect.Effect<any, CastConnectionError> =>
  Effect.tryPromise({
    try: () =>
      // biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
      new Promise<any>((resolve, reject) => {
        const client = new Client();
        client.connect({ host, port }, () => resolve(client));
        client.on("error", (err: unknown) => reject(err));
      }),
    catch: (e) => new CastConnectionError({ host, cause: e }),
  });

// Launch DefaultMediaReceiver on an already-connected PlatformSender.
const launchReceiver = (
  // biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
  client: any,
  host: string,
  // biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
): Effect.Effect<any, CastConnectionError> =>
  Effect.tryPromise({
    try: () =>
      // biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
      new Promise<any>((resolve, reject) => {
        client.launch(
          DefaultMediaReceiver,
          // biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
          (err: Error | null, player: any) => {
            if (err) reject(err);
            else resolve(player);
          },
        );
      }),
    catch: (e) => new CastConnectionError({ host, cause: e }),
  });

// biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
const mediaStatusFrom = (status: any): MediaStatus =>
  new MediaStatus({
    playerState: status?.playerState ?? "IDLE",
    currentTime: status?.currentTime ?? 0,
    duration: status?.media?.duration,
    title: status?.media?.metadata?.title,
    artist: status?.media?.metadata?.artist,
    albumName: status?.media?.metadata?.albumName,
  });

export const CastClientLive = Layer.scoped(
  CastClient,
  Effect.gen(function* () {
    // Connection pool: host → { client (PlatformSender), player (DefaultMediaReceiver) }
    const poolRef = yield* Ref.make<
      // biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
      Map<string, { client: any; player: any }>
    >(new Map());

    const evict = (host: string) =>
      Ref.update(poolRef, (m) => {
        const next = new Map(m);
        next.delete(host);
        return next;
      });

    const getConn = (host: string, port = 8009) =>
      Effect.gen(function* () {
        const pool = yield* Ref.get(poolRef);
        const existing = pool.get(host);
        if (existing) return existing;

        const client = yield* connectPlatform(host, port);
        const player = yield* launchReceiver(client, host);
        const conn = { client, player };
        yield* Ref.update(poolRef, (m) => new Map(m).set(host, conn));

        // Evict dead connections so the next call reconnects automatically.
        client.on("error", () => Effect.runFork(evict(host)));
        client.on("close", () => Effect.runFork(evict(host)));

        return conn;
      });

    // Close all open connections on scope exit.
    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        const pool = yield* Ref.get(poolRef);
        for (const { client } of pool.values()) {
          try {
            client.close();
          } catch {
            // ignore close errors during teardown
          }
        }
      }),
    );

    return {
      discoverDevices: (timeoutMs = 5000) =>
        Effect.tryPromise({
          try: () =>
            new Promise<CastDevice[]>((resolve) => {
              const mdns = MulticastDNS();
              const devices = new Map<string, CastDevice>();
              const pending = new Map<
                string,
                { txt: Record<string, string>; host: string; port: number }
              >();

              const timer = setTimeout(() => {
                mdns.destroy();
                resolve([...devices.values()]);
              }, timeoutMs);

              // Unref so it doesn't block process exit
              if (typeof timer.unref === "function") timer.unref();

              mdns.on(
                "response",
                (response: {
                  answers: Array<{
                    type: string;
                    name: string;
                    data: unknown;
                  }>;
                  additionals: Array<{
                    type: string;
                    name: string;
                    data: unknown;
                  }>;
                }) => {
                  const all = [...response.answers, ...response.additionals];

                  for (const record of all) {
                    if (record.type === "TXT") {
                      const txt = parseTxt(record.data as Buffer[]);
                      const id = txt.id ?? record.name;
                      if (!pending.has(id)) {
                        pending.set(id, { txt, host: "", port: 8009 });
                      }
                    }

                    if (record.type === "SRV") {
                      const srvData = record.data as {
                        target: string;
                        port: number;
                      };
                      // Try to fill in host/port for pending TXT entries
                      for (const [, p] of pending.entries()) {
                        if (!p.host) {
                          p.host = srvData.target;
                          p.port = srvData.port;
                        }
                      }
                    }
                  }

                  // Build devices from fully resolved pending entries
                  for (const [id, p] of pending.entries()) {
                    if (!p.host || devices.has(id)) continue;
                    const ca = Number.parseInt(p.txt.ca ?? "0", 10);
                    devices.set(
                      id,
                      new CastDevice({
                        id,
                        name: p.txt.fn ?? id,
                        host: p.host,
                        port: p.port,
                        type: resolveDeviceType(ca),
                        modelName: p.txt.md ?? "Unknown",
                        friendlyName: p.txt.fn ?? id,
                      }),
                    );
                  }
                },
              );

              mdns.query({
                questions: [{ name: "_googlecast._tcp.local", type: "PTR" }],
              });
            }),
          catch: (e) => new CastConnectionError({ host: "mdns", cause: e }),
        }),

      getStatus: (host) =>
        Effect.gen(function* () {
          const conn = yield* getConn(host);
          return yield* Effect.tryPromise({
            try: () =>
              new Promise<ReceiverStatus>((resolve, reject) => {
                conn.client.getStatus(
                  // biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
                  (err: Error | null, status: any) => {
                    if (err) {
                      reject(err);
                      return;
                    }
                    resolve(
                      new ReceiverStatus({
                        volume: status?.volume?.level ?? 0.5,
                        muted: status?.volume?.muted ?? false,
                        applications: (status?.applications ?? []).map(
                          // biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
                          (app: any) =>
                            new AppInfo({
                              appId: app.appId,
                              displayName: app.displayName,
                              sessionId: app.sessionId,
                            }),
                        ),
                      }),
                    );
                  },
                );
              }),
            catch: (e) => new CastConnectionError({ host, cause: e }),
          });
        }),

      playMedia: (host, contentUrl, contentType, metadata) =>
        Effect.gen(function* () {
          const conn = yield* getConn(host);
          return yield* Effect.tryPromise({
            try: () =>
              new Promise<MediaStatus>((resolve, reject) => {
                const media = {
                  contentId: contentUrl,
                  contentType,
                  streamType: "BUFFERED",
                  metadata: metadata ?? {},
                };
                conn.player.load(
                  media,
                  { autoplay: true },
                  // biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
                  (err: Error | null, status: any) => {
                    if (err) reject(err);
                    else resolve(mediaStatusFrom(status));
                  },
                );
              }),
            catch: (e) =>
              new CastMediaError({
                message: `playMedia on ${host} failed`,
                cause: e,
              }),
          });
        }),

      pauseMedia: (host) =>
        Effect.gen(function* () {
          const conn = yield* getConn(host);
          yield* Effect.tryPromise({
            try: () =>
              new Promise<void>((resolve, reject) => {
                conn.player.pause((err: Error | null) => {
                  if (err) reject(err);
                  else resolve();
                });
              }),
            catch: (e) =>
              new CastMediaError({
                message: `pauseMedia on ${host} failed`,
                cause: e,
              }),
          });
        }),

      resumeMedia: (host) =>
        Effect.gen(function* () {
          const conn = yield* getConn(host);
          yield* Effect.tryPromise({
            try: () =>
              new Promise<void>((resolve, reject) => {
                conn.player.play((err: Error | null) => {
                  if (err) reject(err);
                  else resolve();
                });
              }),
            catch: (e) =>
              new CastMediaError({
                message: `resumeMedia on ${host} failed`,
                cause: e,
              }),
          });
        }),

      stopMedia: (host) =>
        Effect.gen(function* () {
          const conn = yield* getConn(host);
          yield* Effect.tryPromise({
            try: () =>
              new Promise<void>((resolve, reject) => {
                conn.player.stop((err: Error | null) => {
                  if (err) reject(err);
                  else resolve();
                });
              }),
            catch: (e) =>
              new CastMediaError({
                message: `stopMedia on ${host} failed`,
                cause: e,
              }),
          });
        }),

      seekMedia: (host, currentTime) =>
        Effect.gen(function* () {
          const conn = yield* getConn(host);
          yield* Effect.tryPromise({
            try: () =>
              new Promise<void>((resolve, reject) => {
                conn.player.seek(currentTime, (err: Error | null) => {
                  if (err) reject(err);
                  else resolve();
                });
              }),
            catch: (e) =>
              new CastMediaError({
                message: `seekMedia on ${host} failed`,
                cause: e,
              }),
          });
        }),

      getMediaStatus: (host) =>
        Effect.gen(function* () {
          const conn = yield* getConn(host);
          return yield* Effect.tryPromise({
            try: () =>
              new Promise<MediaStatus>((resolve, reject) => {
                conn.player.getStatus(
                  // biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
                  (err: Error | null, status: any) => {
                    if (err) reject(err);
                    else resolve(mediaStatusFrom(status));
                  },
                );
              }),
            catch: (e) =>
              new CastMediaError({
                message: `getMediaStatus on ${host} failed`,
                cause: e,
              }),
          });
        }),

      getVolume: (host) =>
        Effect.gen(function* () {
          const conn = yield* getConn(host);
          return yield* Effect.tryPromise({
            try: () =>
              new Promise<{ level: number; muted: boolean }>((resolve, reject) => {
                conn.client.getStatus(
                  // biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
                  (err: Error | null, status: any) => {
                    if (err) reject(err);
                    else
                      resolve({
                        level: status?.volume?.level ?? 0.5,
                        muted: status?.volume?.muted ?? false,
                      });
                  },
                );
              }),
            catch: (e) => new CastConnectionError({ host, cause: e }),
          });
        }),

      setVolume: (host, level) =>
        Effect.gen(function* () {
          const conn = yield* getConn(host);
          yield* Effect.tryPromise({
            try: () =>
              new Promise<void>((resolve, reject) => {
                conn.client.setVolume({ level }, (err: Error | null) => {
                  if (err) reject(err);
                  else resolve();
                });
              }),
            catch: (e) => new CastConnectionError({ host, cause: e }),
          });
        }),

      setMuted: (host, muted) =>
        Effect.gen(function* () {
          const conn = yield* getConn(host);
          yield* Effect.tryPromise({
            try: () =>
              new Promise<void>((resolve, reject) => {
                conn.client.setVolume({ muted }, (err: Error | null) => {
                  if (err) reject(err);
                  else resolve();
                });
              }),
            catch: (e) => new CastConnectionError({ host, cause: e }),
          });
        }),

      launchApp: (host, appId) =>
        Effect.gen(function* () {
          const conn = yield* getConn(host);
          return yield* Effect.tryPromise({
            try: () =>
              new Promise<AppInfo>((resolve, reject) => {
                // Launch an arbitrary app by appId via a synthetic Application class.
                // castv2-client has no type definitions — using any is unavoidable here.
                // biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
                const AppClass: any = function (
                  // biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
                  this: any,
                  // biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
                  client: any,
                  // biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
                  session: any,
                ) {
                  DefaultMediaReceiver.call(this, client, session);
                };
                AppClass.APP_ID = appId;
                Object.setPrototypeOf(
                  AppClass.prototype,
                  // biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
                  (DefaultMediaReceiver as any).prototype,
                );

                conn.client.launch(
                  AppClass,
                  // biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
                  (err: Error | null, app: any) => {
                    if (err) {
                      reject(err);
                      return;
                    }
                    const session = app?.session ?? {};
                    resolve(
                      new AppInfo({
                        appId: session.appId ?? appId,
                        displayName: session.displayName ?? appId,
                        sessionId: session.sessionId ?? "",
                      }),
                    );
                  },
                );
              }),
            catch: (e) => new CastConnectionError({ host, cause: e }),
          });
        }),

      stopApp: (host) =>
        Effect.gen(function* () {
          const conn = yield* getConn(host);
          yield* Effect.tryPromise({
            try: () =>
              new Promise<void>((resolve, reject) => {
                conn.client.stop(conn.player, (err: Error | null) => {
                  if (err) reject(err);
                  else resolve();
                });
              }),
            catch: (e) => new CastConnectionError({ host, cause: e }),
          });
        }),

      loadQueue: (host, items: QueueItem[]) =>
        Effect.gen(function* () {
          const conn = yield* getConn(host);
          yield* Effect.tryPromise({
            try: () =>
              new Promise<void>((resolve, reject) => {
                const queueItems = items.map((item) => ({
                  media: {
                    contentId: item.media.contentId,
                    contentType: item.media.contentType,
                    streamType: "BUFFERED",
                    metadata: item.media.metadata ?? {},
                  },
                }));
                conn.player.queueLoad(
                  queueItems,
                  { startIndex: 0, repeatMode: "REPEAT_OFF" },
                  (err: Error | null) => {
                    if (err) reject(err);
                    else resolve();
                  },
                );
              }),
            catch: (e) =>
              new CastMediaError({
                message: `loadQueue on ${host} failed`,
                cause: e,
              }),
          });
        }),

      // queueNext/queuePrev are implemented via queueUpdate with currentItemId jump.
      // The media controller's currentSession tracks the active item.
      queueNext: (host) =>
        Effect.gen(function* () {
          const conn = yield* getConn(host);
          yield* Effect.tryPromise({
            try: () =>
              new Promise<void>((resolve, reject) => {
                // biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
                const currentSession = conn.player.media?.currentSession as any;
                const currentId: number | undefined = currentSession?.currentItemId;
                const items: Array<{ itemId: number }> = currentSession?.items ?? [];
                const idx = items.findIndex((i) => i.itemId === currentId);
                const next = items[idx + 1];
                if (!next) {
                  resolve();
                  return;
                }
                conn.player.media.request(
                  { type: "QUEUE_UPDATE", currentItemId: next.itemId },
                  (err: Error | null) => {
                    if (err) reject(err);
                    else resolve();
                  },
                );
              }),
            catch: (e) =>
              new CastMediaError({
                message: `queueNext on ${host} failed`,
                cause: e,
              }),
          });
        }),

      queuePrev: (host) =>
        Effect.gen(function* () {
          const conn = yield* getConn(host);
          yield* Effect.tryPromise({
            try: () =>
              new Promise<void>((resolve, reject) => {
                // biome-ignore lint/suspicious/noExplicitAny: castv2-client has no type definitions
                const currentSession = conn.player.media?.currentSession as any;
                const currentId: number | undefined = currentSession?.currentItemId;
                const items: Array<{ itemId: number }> = currentSession?.items ?? [];
                const idx = items.findIndex((i) => i.itemId === currentId);
                const prev = items[idx - 1];
                if (!prev) {
                  resolve();
                  return;
                }
                conn.player.media.request(
                  { type: "QUEUE_UPDATE", currentItemId: prev.itemId },
                  (err: Error | null) => {
                    if (err) reject(err);
                    else resolve();
                  },
                );
              }),
            catch: (e) =>
              new CastMediaError({
                message: `queuePrev on ${host} failed`,
                cause: e,
              }),
          });
        }),
    };
  }),
);
