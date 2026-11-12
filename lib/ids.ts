// Postgres rejects a malformed uuid with an error (supabase-js returned null).
// Check route params before querying so bad links 404 instead of 500.
export const isUuid = (s: string | null | undefined): s is string =>
  !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
