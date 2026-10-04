/**
 * One place that decides how a stored timestamp is shown.
 *
 * Two callers want deliberately different things from the same `created_at`, and
 * that difference is the reason this exists rather than a bug to unify away:
 *
 * - a history row lists when somebody searched, and the time of day is part of
 *   that question — "was that this morning or last week?" is unanswerable from a
 *   bare date — so it is formatted with both parts.
 * - the account summary answers "how long have I been here?", which is a duration
 *   measured in days, and a time of day beside it is noise.
 *
 * Both read in the visitor's own language: an Arabic account should not have its
 * history stamped in US month names.
 *
 * An unparseable value returns the caller's fallback rather than an
 * "Invalid Date", because a row is better a little wrong-looking than a row that
 * shouts at the visitor.
 */
export function formatWhen(iso: string, locale: string, fallback: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

/** Date only — for facts where the time of day is beside the point. */
export function formatDay(iso: string, locale: string, fallback: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}
