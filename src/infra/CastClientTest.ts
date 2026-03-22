import { Effect, Layer } from "effect";
import { CastClient } from "../domain/CastClient.ts";
import { AppInfo, CastDevice, MediaStatus, ReceiverStatus } from "../domain/models.ts";

const mockDevices = [
  new CastDevice({
    id: "device-001",
    name: "Living Room Speaker",
    host: "192.168.1.100",
    port: 8009,
    type: "audio",
    modelName: "Google Nest Audio",
    friendlyName: "Living Room Speaker",
  }),
  new CastDevice({
    id: "device-002",
    name: "Living Room TV",
    host: "192.168.1.101",
    port: 8009,
    type: "video",
    modelName: "Chromecast with Google TV",
    friendlyName: "Living Room TV",
  }),
];

const mockMediaStatus = new MediaStatus({
  playerState: "IDLE",
  currentTime: 0,
  duration: undefined,
  title: undefined,
  artist: undefined,
  albumName: undefined,
});

const mockReceiverStatus = new ReceiverStatus({
  volume: 0.5,
  muted: false,
  applications: [],
});

export const CastClientTest = Layer.succeed(CastClient, {
  discoverDevices: (_timeoutMs) => Effect.succeed(mockDevices),

  getStatus: (_host) => Effect.succeed(mockReceiverStatus),

  playMedia: (_host, contentUrl, contentType, metadata) =>
    Effect.succeed(
      new MediaStatus({
        playerState: "PLAYING",
        currentTime: 0,
        duration: undefined,
        title: (metadata as { title?: string } | undefined)?.title,
        artist: (metadata as { artist?: string } | undefined)?.artist,
        albumName: (metadata as { albumName?: string } | undefined)?.albumName,
      }),
    ),

  pauseMedia: (_host) => Effect.void,

  resumeMedia: (_host) => Effect.void,

  stopMedia: (_host) => Effect.void,

  seekMedia: (_host, _currentTime) => Effect.void,

  getMediaStatus: (_host) => Effect.succeed(mockMediaStatus),

  getVolume: (_host) => Effect.succeed({ level: 0.5, muted: false }),

  setVolume: (_host, _level) => Effect.void,

  setMuted: (_host, _muted) => Effect.void,

  launchApp: (_host, appId) =>
    Effect.succeed(
      new AppInfo({
        appId,
        displayName: "Test App",
        sessionId: "test-session-001",
      }),
    ),

  stopApp: (_host) => Effect.void,

  loadQueue: (_host, _items) => Effect.void,

  queueNext: (_host) => Effect.void,

  queuePrev: (_host) => Effect.void,
});
