import { Data } from "effect";

export class CastDeviceNotFoundError extends Data.TaggedError("CastDeviceNotFoundError")<{
  readonly deviceId?: string;
  readonly message: string;
}> {}

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

export type CastError =
  | CastDeviceNotFoundError
  | CastConnectionError
  | CastUnsupportedCapabilityError
  | CastMediaError;
