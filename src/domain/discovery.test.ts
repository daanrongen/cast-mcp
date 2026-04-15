import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { CastClientTest } from "../infra/CastClientTest.ts";
import { CastClient } from "./CastClient.ts";

describe("discovery", () => {
  it("returns two mock devices by default", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* CastClient;
        return yield* client.discoverDevices();
      }).pipe(Effect.provide(CastClientTest)),
    );
    expect(result).toHaveLength(2);
  });

  it("returns devices with required fields", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* CastClient;
        return yield* client.discoverDevices(3000);
      }).pipe(Effect.provide(CastClientTest)),
    );
    for (const device of result) {
      expect(device.id).toBeTruthy();
      expect(device.name).toBeTruthy();
      expect(device.host).toBeTruthy();
      expect(device.port).toBeGreaterThan(0);
      expect(["audio", "video", "group"]).toContain(device.type);
    }
  });

  it("includes an audio device and a video device", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* CastClient;
        return yield* client.discoverDevices();
      }).pipe(Effect.provide(CastClientTest)),
    );
    const types = result.map((d) => d.type);
    expect(types).toContain("audio");
    expect(types).toContain("video");
  });
});
