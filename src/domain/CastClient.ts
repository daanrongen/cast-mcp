import { Context, type Effect } from "effect";
import type { CastError } from "./errors.ts";
import type { AppInfo, CastDevice, MediaStatus, QueueItem, ReceiverStatus } from "./models.ts";

export class CastClient extends Context.Tag("CastClient")<
  CastClient,
  {
    // Discovery
    readonly discoverDevices: (timeoutMs?: number) => Effect.Effect<CastDevice[], CastError>;

    // Receiver status
    readonly getStatus: (host: string) => Effect.Effect<ReceiverStatus, CastError>;

    // Media control
    readonly playMedia: (
      host: string,
      contentUrl: string,
      contentType: string,
      metadata?: object,
    ) => Effect.Effect<MediaStatus, CastError>;
    readonly pauseMedia: (host: string) => Effect.Effect<void, CastError>;
    readonly resumeMedia: (host: string) => Effect.Effect<void, CastError>;
    readonly stopMedia: (host: string) => Effect.Effect<void, CastError>;
    readonly seekMedia: (host: string, currentTime: number) => Effect.Effect<void, CastError>;
    readonly getMediaStatus: (host: string) => Effect.Effect<MediaStatus, CastError>;

    // Volume
    readonly getVolume: (
      host: string,
    ) => Effect.Effect<{ level: number; muted: boolean }, CastError>;
    readonly setVolume: (host: string, level: number) => Effect.Effect<void, CastError>;
    readonly setMuted: (host: string, muted: boolean) => Effect.Effect<void, CastError>;

    // Apps
    readonly launchApp: (host: string, appId: string) => Effect.Effect<AppInfo, CastError>;
    readonly stopApp: (host: string) => Effect.Effect<void, CastError>;

    // Queue
    readonly loadQueue: (host: string, items: QueueItem[]) => Effect.Effect<void, CastError>;
    readonly queueNext: (host: string) => Effect.Effect<void, CastError>;
    readonly queuePrev: (host: string) => Effect.Effect<void, CastError>;
  }
>() {}
