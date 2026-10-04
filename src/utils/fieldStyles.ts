/**
 * The border, tint and focus ring an input wears in each of its two states.
 *
 * Contact and search forms are the same control with different labels, and an
 * invalid one has to look invalid in both — a field outlined in red next to an
 * identical field outlined in grey reads as a mistake in the app rather than in
 * the visitor's typing. Keeping the pair in one place is what stops the two forms
 * drifting apart over time.
 *
 * Only the state-dependent part lives here: the rest of an input's styling
 * (width, padding, placeholder colour) differs between the two forms and is
 * declared at each call site.
 */
export function fieldStateClass(hasError: boolean): string {
  return hasError
    ? 'border-danger bg-danger-soft focus:border-danger focus:ring-danger'
    : 'border-slate-200 bg-slate-50 focus:border-action focus:ring-action';
}
