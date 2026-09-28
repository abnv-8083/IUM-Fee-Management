import { randomBytes } from 'crypto';

/**
 * Drops Mongo internals from serialised documents so API responses look exactly
 * like the plain objects the React client already expects.
 */
const stripMongoInternals = (_doc: unknown, ret: Record<string, any>) => {
  delete ret._id;
  delete ret.__v;
  return ret;
};

/**
 * Shared options for every collection.
 *
 * - `id: false` disables Mongoose's default `_id` -> `id` virtual so our own
 *   human-readable string `id` (e.g. `fam-001`, `pay-1042`) can be defined and
 *   stays stable across migrations.
 *
 * Left un-annotated on purpose: typing this as `SchemaOptions` widens its
 * `statics`/`methods` signatures and makes it incompatible with the
 * per-model `Schema<Doc>` constructors. Inference keeps it assignable.
 */
export const baseSchemaOptions = {
  id: false,
  // `as const` matters here: without it TS widens `false` to `boolean`, but
  // Mongoose types `versionKey` as `string | false`.
  versionKey: false as const,
  timestamps: false,
  toJSON: { transform: stripMongoInternals },
  toObject: { transform: stripMongoInternals },
};

/**
 * Strips Mongo internals from a `lean()` query result.
 *
 * Mongoose only runs schema `toJSON`/`toObject` transforms on hydrated
 * documents, so anything read with `.lean()` (which we use everywhere for speed)
 * would otherwise leak `_id` into API responses. Apply this at service
 * boundaries before returning data to a controller.
 */
export function toPlain<T = any>(doc: any): T {
  if (doc === null || doc === undefined) return doc as T;
  if (Array.isArray(doc)) return doc.map((item) => toPlain(item)) as unknown as T;
  const { _id, __v, ...rest } = doc;
  return rest as T;
}

/**
 * Builds a prefixed, collision-resistant id such as `pay-m5x2k9f3a1b`.
 *
 * The legacy JSON store used `Date.now()` alone, which produced duplicate ids
 * when several records were written in the same millisecond. Random entropy is
 * added here so the `id` field can safely carry a unique index.
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
}
