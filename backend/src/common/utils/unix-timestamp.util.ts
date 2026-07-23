import { ValueTransformer } from 'typeorm';

/**
 * MySQL returns BIGINT as a string (to avoid precision loss for values beyond
 * Number.MAX_SAFE_INTEGER). Unix seconds never get anywhere near that range,
 * so it's safe to transform to/from a plain JS number here.
 */
export const unixTimestampTransformer: ValueTransformer = {
  to: (value?: number | null) => value ?? undefined,
  from: (value: string | number | null) =>
    value === null ? null : Number(value),
};

export function nowUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
