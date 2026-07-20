/**
 * Buckets backend validation messages (e.g. "Password must be at least 8
 * characters long") under the field they mention, falling back to a general
 * bucket for anything that doesn't match a known field name.
 */
export function groupFieldErrors(
  messages: string[],
  fields: string[],
): Record<string, string[]> {
  const grouped: Record<string, string[]> = { general: [] };
  for (const field of fields) grouped[field] = [];

  for (const message of messages) {
    const lower = message.toLowerCase();
    const match = fields.find((field) => lower.includes(field.toLowerCase()));
    grouped[match ?? 'general'].push(message);
  }

  return grouped;
}
