import type { Cause, Effect, ManagedRuntime } from "effect";
import { Cause as CauseModule } from "effect";
import type { CastClient } from "../domain/CastClient.ts";
import type { CastError } from "../domain/errors.ts";

export const formatSuccess = (data: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
    },
  ],
});

export const formatError = (cause: Cause.Cause<unknown>) => ({
  content: [
    {
      type: "text" as const,
      text: `Error: ${CauseModule.pretty(cause)}`,
    },
  ],
  isError: true as const,
});

export const runTool = async <A>(
  runtime: ManagedRuntime.ManagedRuntime<CastClient, CastError>,
  effect: Effect.Effect<A, CastError, CastClient>,
) => {
  const result = await runtime.runPromiseExit(effect);
  if (result._tag === "Failure") return formatError(result.cause);
  return formatSuccess(result.value);
};
