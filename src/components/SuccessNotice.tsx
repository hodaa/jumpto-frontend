import type { ReactNode } from 'react';
import { IconCheck } from './icons';

/**
 * The "that worked" note that follows a successful action.
 *
 * Four pages confirm something the same way — a green-tinted strip with a tick
 * and one line of prose — and the styling is the point of having one: a
 * confirmation that looks different from the form it sits under is the part the
 * visitor actually notices when the page does not move. Written out four times it
 * was already drifting, so the tint, the padding and the icon size are decided
 * here once.
 *
 * The message arrives as children rather than a translated key, because each of
 * these is a different sentence in a different place on the page and none of them
 * needs interpolating against anything this component knows about.
 *
 * The icon is decorative either way — `IconCheck` and friends already carry
 * `aria-hidden` — so the sentence beside it is the whole announcement, and a
 * custom icon inherits that rather than needing `aria-hidden` at each call site.
 */
export function SuccessNotice({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-success/40 bg-success-soft px-3.5 py-3 text-sm font-medium text-success">
      {icon ?? <IconCheck size={18} />}
      <span>{children}</span>
    </div>
  );
}
