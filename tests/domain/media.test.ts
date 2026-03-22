import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { CastClient } from "../../src/domain/CastClient.ts";
import { CastClientTest } from "../../src/infra/CastClientTest.ts";

describe("media", () => {
  const host = "192.168.1.100";

  it("playMedia returns PLAYING state", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* CastClient;
        return yield* client.playMedia(host, "https://example.com/audio.mp3", "audio/mp3");
      }).pipe(Effect.provide(CastClientTest)),
    );
    expect(result.playerState).toBe("PLAYING");
    expect(result.currentTime).toBe(0);
  });

  it("playMedia forwards metadata title", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* CastClient;
        return yield* client.playMedia(host, "https://example.com/audio.mp3", "audio/mp3", {
          title: "My Track",
          artist: "Artist Name",
        });
      }).pipe(Effect.provide(CastClientTest)),
    );
    expect(result.title).toBe("My Track");
    expect(result.artist).toBe("Artist Name");
  });

  it("pauseMedia completes without error", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* CastClient;
        return yield* client.pauseMedia(host);
      }).pipe(Effect.provide(CastClientTest)),
    );
    expect(result).toBeUndefined();
  });

  it("resumeMedia completes without error", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* CastClient;
        return yield* client.resumeMedia(host);
      }).pipe(Effect.provide(CastClientTest)),
    );
    expect(result).toBeUndefined();
  });

  it("stopMedia completes without error", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* CastClient;
        return yield* client.stopMedia(host);
      }).pipe(Effect.provide(CastClientTest)),
    );
    expect(result).toBeUndefined();
  });

  it("seekMedia completes without error", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* CastClient;
        return yield* client.seekMedia(host, 42);
      }).pipe(Effect.provide(CastClientTest)),
    );
    expect(result).toBeUndefined();
  });

  it("getMediaStatus returns IDLE by default", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* CastClient;
        return yield* client.getMediaStatus(host);
      }).pipe(Effect.provide(CastClientTest)),
    );
    expect(result.playerState).toBe("IDLE");
    expect(result.currentTime).toBe(0);
  });
});
