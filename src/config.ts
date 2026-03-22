import { Config } from "effect";

// Discovery timeout in milliseconds. Defaults to 5000.
export const DiscoveryTimeoutConfig = Config.number(
  "CAST_DISCOVERY_TIMEOUT_MS",
).pipe(Config.withDefault(5000));
