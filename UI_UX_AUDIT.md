# JumpTo Form UI/UX Audit

**Audit date:** 6 September 2026  
**Scope:** Landing page, YouTube phrase-search form, processing/error/result states, responsive behavior, English/Arabic directionality, and accessibility.  
**Method:** Heuristic review of the running Vite UI plus source-level inspection of interaction states and responsive rules. The backend was not available, so processing and result-state observations are based on the implemented components and state logic. Automated project checks were also run.

## Executive summary

JumpTo has a clear, focused proposition and a sensible two-field task. The form has persistent labels, a prominent action, useful empty/results states, keyboard focus styling, reduced-motion support, and thoughtful English/Arabic foundations. It is already stronger than a typical early-stage utility UI.

The largest risks are not visual polish; they are **mobile header fit, RTL handling of the URL, trust in the synthetic progress indicator, and edge cases around cancellation and validation**. Addressing the first six findings below should materially improve completion rate and confidence.

**Overall UX assessment: 7/10** — good structure and accessibility intent, with several high-impact interaction issues to resolve before broad release.

---

## What is working well

- **Simple task model:** URL + phrase + one primary action is easy to understand.
- **Strong CTA hierarchy:** “Jump to the moment” is specific and outcome-oriented.
- **Persistent labels:** Inputs do not rely on placeholders alone.
- **Helpful empty state:** The right panel explains where output will appear rather than showing a blank surface.
- **Good feedback architecture:** Dedicated idle, processing, done, no-match, and error states exist.
- **Accessible foundations:** Skip link, visible focus rings, `aria-invalid`, associated labels, progress semantics, result-heading focus, and reduced-motion handling are present.
- **Useful recovery:** Retry, cancel, clear, and no-match guidance are implemented.
- **Bilingual intent:** Document language/direction is updated and Arabic uses an appropriate font stack.
- **Result utility:** Search terms are highlighted; matches expose timestamp, snippet, embedded seek, copy, CSV export, and YouTube fallback.
- **Responsive main content:** The search/results split stacks below the large breakpoint rather than squeezing both columns.

---

## Prioritized findings

### P1 — High impact

#### 1. The header is likely to overflow or become crowded on narrow screens

**Status:** Resolved on `arena/01a07895-jumpto-frontend`: the logo and language control remain on the first row, while marketing links move to a dedicated second row below 640 px.

**Evidence:** `src/components/SiteHeader.tsx:19-37` keeps a 100 px logo, two navigation links, gaps, and a padded language control in one non-wrapping flex row. The mobile content width is only about 288 px on a 320 px viewport (`src/index.css:253-256`). Arabic labels are longer and increase the risk.

**User impact:** Content may wrap unpredictably, collide, or create horizontal scrolling before users reach the form.

**Recommendation:** At small widths, hide the marketing anchors behind a compact menu or move them below the logo row. Keep logo + language control in the first row. Test at 320, 360, and 390 px in both languages.

#### 2. The URL field incorrectly switches to RTL

**Evidence:** The URL input uses `dir={keywordDir}` and the keyword’s alignment styles (`src/components/SearchForm.tsx:39-44, 125-136`). In Arabic UI—or whenever the phrase contains Arabic—the URL is right-aligned and RTL.

**User impact:** URLs are intrinsically LTR. Reversing their visual flow makes editing, caret movement, error spotting, and pasting harder, especially with query parameters.

**Recommendation:** Always render the URL input as `dir="ltr"` and left-aligned. Keep auto/RTL direction only for the phrase field. The icon can remain on the locale-appropriate side if desired, but the URL text itself must remain LTR.

#### 3. “Cancel search” may not reliably cancel an in-flight initial request

**Evidence:** The cancel handler clears local job state (`src/App.tsx:295-302`), but the original asynchronous `submitSearch` can still resolve afterward and call `setJob` (`src/App.tsx:142-147`). There is no abort signal or request-generation guard.

**User impact:** A user can cancel, return to idle, and still have the old job resume or replace later content. This breaks the mental model of cancellation.

**Recommendation:** Abort the submit request with `AbortController`, or attach a request token and ignore stale responses. Also prevent stale polling callbacks from changing the current phase.

#### 4. The progress UI communicates false precision

**Evidence:** Progress begins at 10%, then increases by 10 points on a timer and caps at 90%, even without server progress (`src/App.tsx:15-21, 199-234`). A remaining-time estimate may also be derived from elapsed time and a single progress value.

**User impact:** A fabricated “90%” that stalls can reduce trust more than an honest indeterminate state. “A few minutes,” a percentage, an ETA, a spinner, and a two-step status are also competing signals.

**Recommendation:** Use determinate percentage/ETA only when backed by meaningful server stages. Otherwise use an indeterminate bar with a plain message such as “Transcribing—this usually takes 1–3 minutes.” If stages are real, show the current stage rather than simulated percentages.

#### 5. Browser validation and custom localized validation can conflict

**Evidence:** The URL is `type="url"`, but the form does not use `noValidate` (`src/components/SearchForm.tsx:110-113, 125-136`). Browser validation can block the submit event before the localized `parseYouTubeId` error is rendered. Errors also remain visible while users edit because `onChange` does not clear or revalidate them (`:130, :164`).

**User impact:** Users may see inconsistent browser-language tooltips instead of the designed inline errors, and corrected values can still look invalid until another submit.

**Recommendation:** Choose one validation strategy. For consistent bilingual behavior, add `noValidate`, retain custom validation, focus the first invalid field after submit, and clear/revalidate a field’s error as it is corrected. Add a visible red border/icon as well as error text.

#### 6. The pre-search visual hierarchy gives the empty results panel more weight than the task

**Evidence:** Desktop columns are approximately 41% form / 59% results (`src/App.tsx:322`), while the form has the main interaction and the larger panel is only an idle placeholder.

**User impact:** The eye is pulled toward an inactive surface. The long URL field gets less horizontal room than the blank destination panel.

**Recommendation:** Preserve the required split layout, but use equal columns or slightly favor the form while idle. Reduce the idle panel’s contrast/shadow and restore results emphasis only during processing/results. This can be state-dependent without collapsing the split.

### P2 — Medium impact

#### 7. Input guidance overpromises supported sources

**Evidence:** The hero says YouTube, the form label says generic “Video URL,” and “How it works” says “Any Video URL” (`src/i18n/locales/en.json:10-11, 25, 35-40`). Validation is based on `parseYouTubeId`, so support is YouTube-specific.

**User impact:** Users may try Vimeo, TikTok, or arbitrary video links and interpret rejection as product failure.

**Recommendation:** Use “YouTube URL” consistently. Replace “Any Video URL” with “Any public YouTube video.” Add concise helper text covering accepted YouTube formats and any limitations (private, age-restricted, live, or missing-caption videos).

#### 8. The form misses low-effort speed and reassurance affordances

**Observation:** Pasting is the dominant URL action, but there is no paste button. There is also no note about whether links/search terms are stored or how long transcription can take before submission.

**User impact:** Mobile pasting takes extra effort, and users may hesitate to submit unfamiliar or sensitive links.

**Recommendation:** Consider an inline “Paste” action using the Clipboard API with graceful fallback. Add one short helper line: accepted source + expected wait + privacy statement, based on actual product behavior.

#### 9. Copy failure is never surfaced

**Evidence:** The clipboard catch block calls `setCopyFailed(false)` instead of `true` (`src/App.tsx:240-246`). The toolbar has a designed failure message, but it cannot be reached.

**User impact:** Copy can silently fail, especially on restricted browsers or non-secure contexts.

**Recommendation:** Set failure state to `true`; offer select/copy fallback if practical.

#### 10. A “New search” action is passed but not rendered

**Evidence:** `onNewSearch` exists in `ResultsToolbar` props but is omitted from destructuring and UI (`src/components/ResultsToolbar.tsx:4-17`). The parent creates and passes the callback (`src/App.tsx:281-293`; `ResultsPanel.tsx`).

**User impact:** After results, the next-step path is less explicit. Users must infer that editing the existing form and resubmitting starts over.

**Recommendation:** Render a clear secondary “New search” action in the results toolbar or focus/select the phrase field when invoked. Decide whether it preserves the current URL; for repeat searches, keeping the URL and clearing/selecting the phrase is likely fastest.

#### 11. Status announcements may be too verbose for screen-reader users

**Evidence:** The whole processing section is `aria-live="polite"` and `aria-atomic="true"`; percentage updates can occur every few seconds (`src/components/StatusCard.tsx:58-64`).

**User impact:** The complete status block may be re-announced repeatedly, interrupting navigation.

**Recommendation:** Keep the visual updates, but use one concise, non-atomic live region. Announce stage changes and coarse milestones (for example every 25%), not every timer tick.

#### 12. English microcopy needs a consistency pass

**Evidence:** “Paste a YouTube link, enter a phrase, find the exact moment. jump there instantly.” has a lowercase sentence start; “Any Video URL.” has inconsistent capitalization (`src/i18n/locales/en.json:11, 25`). Several labels alternate between video URL, YouTube link, keyword, and phrase.

**Recommendation:** Suggested hero subtitle: **“Paste a YouTube link, enter a word or phrase, and jump straight to every matching moment.”** Standardize on “YouTube URL” and “word or phrase.”

### P3 — Polish

#### 13. Brand color roles are inconsistent

**Evidence:** `primary` is dark navy (`src/index.css:3-5`), while the main CTA and title accent use separate hard-coded cyan values. Progress, links, highlights, and CTA therefore use different interpretations of “primary.”

**Recommendation:** Define semantic tokens such as `brand`, `action`, `action-hover`, `focus`, `success`, and `danger`; remove hard-coded near-duplicates. Ensure text/background combinations meet WCAG AA contrast.

#### 14. The font stack references a font that is not loaded

**Evidence:** `Barlow Condensed ExtraBold` is first in the stack (`src/index.css:32-34`), but only Cairo and Plus Jakarta Sans are requested in `index.html`.

**Recommendation:** Remove the unused face or load it intentionally for a defined display role. Avoid depending on silent fallback for brand typography.

#### 15. “Clear and start over” appears dynamically and shifts the form

**Observation:** The text-only action is inserted only after input exists (`src/components/SearchForm.tsx:201-209`). This changes card height and is unusually prominent wording for clearing two fields.

**Recommendation:** Use small per-field clear controls, or reserve stable space and shorten to “Clear fields.” Do not clear automatically without user activation.

---

## Suggested ideal form flow

1. **URL field:** “YouTube URL” + LTR input + optional Paste action.  
2. **Phrase field:** “Word or phrase” + `dir="auto"`; helper such as “Use the exact words spoken.”  
3. **Primary CTA:** “Find matching moments.” (“Jump” is better once a result exists.)  
4. **Submit validation:** Inline localized errors, first invalid field focused, errors clear when corrected.  
5. **Processing:** Honest stage/indeterminate feedback, realistic duration, reliable cancel.  
6. **Results:** Count and first match visible quickly; clear “New search” path; preserve URL for another phrase.  
7. **No results:** Keep the current URL, focus/select phrase, and suggest a shorter phrase.

## Recommended implementation order

### Quick wins (under one day)

1. Force URL to LTR.
2. Fix copy-failure state.
3. Correct and standardize English copy.
4. Change all source guidance to “YouTube URL.”
5. Render the existing New search action.
6. Resolve the mobile header at 320–390 px.

### Next iteration

1. Unify custom validation and first-error focus.
2. Add stale-request/abort protection for cancel and retry.
3. Replace synthetic progress with trustworthy feedback.
4. Rebalance idle desktop hierarchy while preserving the split view.
5. Test keyboard + VoiceOver/NVDA in English and Arabic.

### Validation plan

Track:

- Form start → valid submit rate.
- Error rate by field and error type.
- Time from page load to submit.
- Cancellation rate and stale-result incidents.
- No-match rate and repeat-search rate.
- Result click/seek rate.
- Mobile horizontal overflow at 320/360/390 px.
- Completion and error parity between English and Arabic.

Run task tests with at least five English-speaking and five Arabic-speaking participants: paste a URL, correct an invalid URL, search Arabic text, cancel a long transcription, recover from no matches, and start a second search on the same video.

---

## Engineering health checked during the audit

- `npm test -- --run`: **82 tests passed**.
- `npm run build`: **passed**.
- `npm run lint`: **passed**.
- Existing automated tests provide good regression coverage, but they do not replace viewport, real-browser validation, assistive-technology, or backend-integrated usability testing.
