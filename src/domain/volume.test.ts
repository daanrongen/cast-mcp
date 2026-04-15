import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { CastClientTest } from "../infra/CastClientTest.ts";
import { CastClient } from "./CastClient.ts";

describe("volume", () => {
  const host = "192.168.1.100";

  it("getVolume returns level and muted flag", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* CastClient;
        return yield* client.getVolume(host);
      }).pipe(Effect.provide(CastClientTest)),
    );
    expect(result.level).toBe(0.5);
    expect(result.muted).toBe(false);
  });

  it("setVolume completes without error", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* CastClient;
        return yield* client.setVolume(host, 0.8);
      }).pipe(Effect.provide(CastClientTest)),
    );
    expect(result).toBeUndefined();
  });

  it("setMuted to true completes without error", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* CastClient;
        return yield* client.setMuted(host, true);
      }).pipe(Effect.provide(CastClientTest)),
    );
    expect(result).toBeUndefined();
  });

  it("setMuted to false completes without error", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* CastClient;
        return yield* client.setMuted(host, false);
      }).pipe(Effect.provide(CastClientTest)),
    );
    expect(result).toBeUndefined();
  });

  it("getStatus returns receiver status with volume and apps array", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* CastClient;
        return yield* client.getStatus(host);
      }).pipe(Effect.provide(CastClientTest)),
    );
    expect(result.volume).toBe(0.5);
    expect(result.muted).toBe(false);
    expect(Array.isArray(result.applications)).toBe(true);
  });
});
