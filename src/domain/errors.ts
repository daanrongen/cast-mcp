import { Data } from "effect";

export class CastConnectionError extends Data.TaggedError("CastConnectionError")<{
  readonly host: string;
  readonly cause?: unknown;
}> {}

export class CastUnsupportedCapabilityError extends Data.TaggedError(
  "CastUnsupportedCapabilityError",
)<{
  readonly deviceType: string;
  readonly capability: string;
}> {}

export class CastMediaError extends Data.TaggedError("CastMediaError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export type CastError = CastConnectionError | CastUnsupportedCapabilityError | CastMediaError;
