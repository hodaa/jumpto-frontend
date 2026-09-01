const CSV_FORBIDDEN_START = /^[=+\-@]/u;

/** Wrap a value as a CSV cell: quote always, double inner quotes, guard injection. */
export function csvCell(value: string): string {
  const guarded = CSV_FORBIDDEN_START.test(value) ? `'${value}` : value;
  return `"${guarded.replace(/"/g, '""')}"`;
}