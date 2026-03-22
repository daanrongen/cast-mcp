import { Schema } from "effect";

export class AppInfo extends Schema.Class<AppInfo>("AppInfo")({
  appId: Schema.String,
  displayName: Schema.String,
  sessionId: Schema.String,
}) {}

export class CastDevice extends Schema.Class<CastDevice>("CastDevice")({
  id: Schema.String,
  name: Schema.String,
  host: Schema.String,
  port: Schema.Number,
  type: Schema.Union(Schema.Literal("audio"), Schema.Literal("video"), Schema.Literal("group")),
  modelName: Schema.String,
  friendlyName: Schema.String,
}) {}

export class MediaStatus extends Schema.Class<MediaStatus>("MediaStatus")({
  playerState: Schema.String,
  currentTime: Schema.Number,
  duration: Schema.optional(Schema.Number),
  title: Schema.optional(Schema.String),
  artist: Schema.optional(Schema.String),
  albumName: Schema.optional(Schema.String),
}) {}

export class ReceiverStatus extends Schema.Class<ReceiverStatus>("ReceiverStatus")({
  volume: Schema.Number,
  muted: Schema.Boolean,
  applications: Schema.Array(AppInfo),
}) {}

export class QueueItem extends Schema.Class<QueueItem>("QueueItem")({
  itemId: Schema.Number,
  media: Schema.Struct({
    contentId: Schema.String,
    contentType: Schema.String,
    metadata: Schema.optional(Schema.Unknown),
  }),
}) {}
