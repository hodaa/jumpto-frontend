# JumpTo / قفزة — UI/UX audit checklist

**Reviewed:** 7 September 2026<br>
**Checkout:** `616f1a6`, branch `arena/01a07c27-jumpto-frontend`<br>
**Scope:** Landing page, search form, processing, results, no-match and error states; English/Arabic; mobile and desktop; accessibility and recovery flows.

## Implementation follow-up — 7 September 2026

**Final branding:** Arabic uses “قفزة”; English uses “Qfza” throughout the interface and page metadata. The English logo places the original icon on the left of the wordmark; the Arabic artwork keeps its icon on the right. Neither icon is mirrored. English SVG and transparent PNG exports are included.

**Final branch validation after the branding follow-ups:** 185 tests pass; lint, typecheck and production build pass.

Implemented the seven requested **Fix first** items: **01–05, 07 and 08**. Item **06 (trustworthy progress)** was explicitly excluded; its percentage algorithm, stage thresholds, timing constants and status copy remain unchanged.

- URL validation styling and control padding are independent of the phrase field. **Subsequent requested adjustment:** URL text, placeholder and controls follow the UI locale—RTL/right-aligned in Arabic, LTR/left-aligned in English—without changing the URL value or following the phrase’s script.
- Cancellation aborts frontend requests and rejects late submit/poll/result callbacks; it does not claim to cancel work on the unavailable backend.
- Container-responsive help text and full-width results feedback stay within their panels.
- No-match clearing preserves the URL; New search selects the existing phrase. Both restore focus and scroll position without remounting the form.
- Player loading, API/iframe timeout, embed error and blocked-autoplay states have localized feedback and timestamped YouTube links. Early clicks queue the latest seek; only player playback events activate the match.
- Actionable text contrast is strengthened for hover highlights, empty-state guidance and footer text. **Subsequent requested adjustment:** the step circles use `main`’s original bright orange (`bg-accent`) again; their white numerals retain the original contrast. All other contrast fixes remain in place.

**Pre-P2 verification:** 130 tests passed; lint, typecheck and build passed. Chromium checks found no horizontal overflow in idle/results/copy-error states at all eight audited widths in both languages, or with long unbroken result text. Disclosure bounds, mobile recovery focus, delayed cancellation and controlled player events passed. Targeted axe scans of English/Arabic idle and hovered-results states plus the no-match state reported no violations. This does not replace real-device or screen-reader testing, and real transcription/playback still needs a connected backend and unrestricted YouTube access.

**Reading this document:** The evidence and line references below record the original audit baseline. P1 work and the P2 follow-up below supersede that baseline. P2 items 12 and 15 remain unchecked only for real screen-reader/native-language validation, not missing frontend fixes.

## P2 implementation follow-up — 7 September 2026

Implemented the frontend changes for **09–15**, preserving the requested bright-orange step circles and dashed idle border, Arabic URL alignment, brand spelling and the existing progress percentages/timing/stage logic.

- **09 — Supported sources:** Both languages now consistently say YouTube. Accepted HTTP(S) watch/share links are distinguished from malformed links, unsupported sources and unsupported path formats. Shorts/live/embed links receive watch/share correction instructions; they are not advertised as newly supported. Timing copy distinguishes first-time processing from faster cached searches.
- **10 — Editing and retry:** URL/phrase fields are read-only while processing, with an explanation and an active Cancel action. Retry runs the form’s current values through its existing validation, preserving edits and focusing the first invalid field. Network errors use end-user recovery instructions.
- **11 — Navigation:** Both help targets stay mounted in every phase. Reading help is non-destructive, and late results/errors do not pull focus away from an anchored help section.
- **12 — Accessibility implementation:** Result cards are named by their visible headings; list names use plain text. One persistent search live region announces stages/outcomes outside the busy card, without percentage/ETA chatter. Language-menu keyboard focus and reduced-motion scrolling are covered by tests. **Still required:** VoiceOver/NVDA announcement and focus validation.
- **13 — Result browsing:** Correct “Show fewer” labels and expanded/control associations, focus on newly revealed rows, query-specific expansion reset, timestamp-aware YouTube link names/new-tab cues, a visible zero-result count, and normal page scrolling below the desktop breakpoint.
- **14 — Touch and clipboard:** Paste/clear targets are 44×44 px. URL clear moves to the label row to leave enough typing space. Denied, missing and empty clipboard cases preserve input and explain phone long-press/keyboard paste. Delayed clipboard responses cannot overwrite a locked search. The enlarged help disclosure flips above/below its trigger and is height-bounded to the viewport.
- **15 — Arabic implementation:** Added all six Arabic plural categories, localized navigation labels and language-option pronunciation hints, corrected awkward error/fallback copy, and isolated mixed-script result text/timestamps. The existing phrase-field direction contract remains explicit and tested. **Still required:** Native Arabic proofreading and usability review.

**Verification:** 182 tests pass; lint, typecheck, production build and whitespace checks pass. Chromium checks cover 320/360/390/640/768/1024/1280/1440 px in English and Arabic, clipboard/error states, 55-result expansion/collapse focus, retry with edits, persistent help, keyboard language switching, and reduced-motion scrolling. No horizontal overflow or page errors appeared in the checked cases. Targeted axe scans of the changed form/results regions reported no violations; the intentionally restored orange step-number contrast is outside that claim. Tests used controlled API responses, blocked YouTube and locally served fonts—not real transcription/playback, native screen readers or physical mobile devices.

## Summary

The app has a good foundation: a focused two-field task, a recognizable primary action, persistent labels, bilingual support, and dedicated feedback states. **Prioritize reliable interactions and responsive layouts before a visual redesign.** The biggest problems are incorrect URL-field styling, canceled requests returning results, cramped help text, overflowing result actions, and recovery actions that do not return users to editing.

This is a fresh review of the current checkout, not a repetition of `UI_UX_AUDIT.md`. Some findings in that older report have been fixed; others remain or have regressed.

### Method and limits

- Inspected the source and exercised the running Vite app in Chromium.
- Checked English and Arabic layouts at **320, 360, 390, 640, 768, 1024, 1280 and 1440 CSS pixels**.
- Used controlled API responses to exercise success, no matches, errors, delayed submissions, polling and cancellation. The local backend was unavailable; these are **frontend interaction checks, not a successful backend-integrated search test**.
- Tested the blocked-YouTube-script case. Actual video playback and transcription quality were not verified.
- Supplied the declared Cairo and Plus Jakarta Sans fonts locally in the audit browser because external font downloads were restricted. Production font delivery was not verified.
- Ran targeted axe accessibility scans plus source/interaction checks. No real-device, screen-reader or participant usability testing was performed. Passing automated checks is not a WCAG conformance assessment.

**Evidence labels:** **Browser** = reproduced in the running frontend, using fixtures where needed; **Source** = confirmed in implementation; **Recommendation** = a design improvement to validate rather than a proven usability failure.

---

## P1 — Fix first

- [x] **01. Give the URL field its own direction, validation styling and control spacing**

**Evidence — Browser + failing tests:** Typing Arabic changes the URL's computed direction to RTL even though its HTML attribute says `dir="ltr"`. The URL border follows the **keyword's** error state: a valid URL turns red when the phrase is missing, while a URL-only error lacks the intended red border. Its trailing padding also follows the keyword rather than the URL's Paste/clear/error controls.

**Change:** Keep URL text and its layout LTR; derive its border and reserved control space from URL state only. Keep phrase direction handling independent.

**Done when:** Both locales and both phrase scripts preserve LTR URL editing; URL-only and phrase-only errors style only the correct field; long URLs never render underneath the in-field controls.

**Where:** `src/components/SearchForm.tsx:349–422`.

- [x] **02. Make cancellation ignore every late response**

**Evidence — Browser:** After canceling, releasing either a delayed initial response or an in-flight polling response makes results appear again. Local state resets, but asynchronous callbacks can still update it.

**Change:** Abort requests where supported and/or use a search-generation token to reject stale responses, including polling completion and delayed transitions. Distinguish stopping the UI from canceling server work if the backend cannot cancel jobs.

**Done when:** Cancel → late success/error stays idle. Cancel → start another search cannot let the old response overwrite the new search.

**Where:** `src/App.tsx:106–155, 181–209, 296–303`; `src/hooks/useJobPolling.ts:35–87`.

- [x] **03. Reflow the help block at narrow container widths**

**Evidence — Browser:** At 390 px in English, the help bullets get only about **106 px of width** and occupy about **266 px vertically**, because the privacy trigger stays beside them. At 320 px, that trigger also spills outside the card, producing approximately 323 px document width. The same cramped pattern occurs in the narrow desktop form column during results.

**Change:** Put the disclosure below the bullets when the **form container** is narrow, not only at a viewport breakpoint. Shorten the trigger and supporting copy where practical.

**Done when:** Help text uses the available card width, all controls stay inside the card, and there is no horizontal overflow at 320 px or in the active desktop split.

**Where:** `src/components/SearchForm.tsx:546–580`; `src/App.tsx:312–331`.

- [x] **04. Make the results heading, toolbar and copy error wrap safely**

**Evidence — Browser:** At 1024 px, a copy failure expands the document to roughly **1194 px**, overlaps the heading and pushes actions outside the panel. Even without an error, a reasonable longer phrase makes the heading about **252 px tall** in a roughly 104 px-wide strip beside the toolbar.

**Change:** Give the heading adequate width; move actions to their own row when the panel is narrow. Place feedback in a full-width status row rather than inside a non-shrinking horizontal toolbar. Handle long unbroken text too.

**Done when:** Long phrases, translated actions and copy errors remain readable without overlap or horizontal scrolling at every tested width.

**Where:** `src/components/ResultsPanel.tsx:174–200`; `src/components/ResultsToolbar.tsx:21–60`.

- [x] **05. Make “Clear search” and “New search” return users to the task**

**Evidence — Browser:** The no-match “Clear search” action restores the same phrase rather than clearing it. “New search” is now rendered, but leaves focus on the document body. On mobile, it can leave the phrase field more than 500 px above the visible viewport.

**Change:** Preserve the URL for repeat searches. Clear or select the phrase intentionally, focus its field and bring the form into view. Define the distinction between clearing fields, editing the phrase and resetting results.

**Done when:** After no matches or successful results, users can immediately type another phrase without scrolling back or re-pasting the URL.

**Where:** `src/App.tsx:267–294, 333–340`; `src/components/ResultsList.tsx:71–95`.

- [ ] **06. Make progress and stage labels trustworthy — explicitly deferred by request**

**Evidence — Browser + Source:** Progress advances while the server reports no progress. “Fetching transcript” is marked complete at a percentage threshold, not a confirmed server stage. This gives users precision the frontend does not actually have.

**Change:** Prefer indeterminate feedback when real progress is unknown. Only show a determinate percentage, ETA or completed stage when supported by meaningful backend information. Keep one clear timing message and an accessible cancel action near the status on mobile.

**Done when:** A delayed request cannot appear nearly complete or claim a completed stage solely because time passed. Cancel remains discoverable after the automatic scroll to processing.

**Implementation note:** This would change the progress behavior currently prescribed in `AGENTS.md` and pinned by tests; agree on that product/engineering contract before implementing it.

**Where:** `src/App.tsx:19–26, 73–80, 160–177, 212–238`; `src/components/StatusCard.tsx:38–119`.

- [x] **07. Explain player loading/failure instead of leaving a silent black area**

**Evidence — Browser failure case + Source:** Blocking the YouTube script leaves a black player region with no explanation. Player initialization failures are swallowed; match clicks can update the selected timestamp even when playback cannot start. Per-result external video links already exist, but the player does not explain that fallback.

**Change:** Add loading, ready and unavailable states; handle early seeks deliberately; promote the existing “Open on YouTube” fallback when embedding fails.

**Done when:** Slow or blocked embeds, player errors and clicks before readiness always produce understandable feedback. Never imply playback started solely because a row was clicked.

**Where:** `src/components/VideoPlayer.tsx:14–20`; `src/hooks/useYouTubePlayer.ts:25–75`; `src/App.tsx:101–104`.

- [x] **08. Fix meaningful text contrast in every interaction state**

**Evidence — Browser/axe:** Highlighted result text on hover is white on orange at about **3.55:1**; no-match helper text is about **2.63:1** on white. Both are normal-size text and fall below the 4.5:1 AA threshold. The white step numbers also use the same orange background at only 17.6 px bold.

**Change:** Use a darker highlight background or dark text; strengthen no-match guidance and review small secondary/footer text. Test rendered combinations, not just individual token definitions.

**Done when:** Meaningful normal-size text reaches 4.5:1 in default, hover, focus and error states. Review focus indicators separately. Treat the decorative mock preview as decorative rather than prioritizing it above actionable text.

**Where:** `src/components/ResultsList.tsx:42–45, 83–85`; `src/components/SiteFooter.tsx:12`; `src/index.css:215–225`.

---

## P2 — Improve clarity and usability next

- [x] **09. Make the supported-source promise precise**

**Evidence — Browser + Source:** Copy says “Any public video link,” but validation is YouTube-specific. `/shorts/`, `/live/` and `/embed/` path formats are rejected; watch-query and `youtu.be` links are accepted.

**Change / acceptance:** Use “YouTube URL” consistently in both languages. Explain accepted formats and unsupported content. Either support additional YouTube formats end to end or give a specific correction—not a generic “valid video URL” error. Separate first-time processing from genuinely fast repeat searches.

**Where:** `src/utils/youtube.ts:8–24`; both locale files, especially `hero`, `steps`, `form` and `error`.

- [x] **10. Keep editable fields, the active query and retry behavior consistent**

**Evidence — Browser:** Fields remain editable during processing although submit is disabled. After an error, changing the phrase and clicking “Try again” submits the previous phrase, not the visible edit. The network error also asks ordinary users to check whether “the backend is running.”

**Change / acceptance:** Either lock fields during processing or clearly distinguish draft edits from the active search. Retry should validate current edits, or explicitly say it retries the previous query. Use end-user recovery instructions and preserve user input.

**Where:** `src/components/SearchForm.tsx:369–385, 446–463`; `src/App.tsx:305–307`; locale key `error.network`.

- [x] **11. Keep header navigation valid after searching**

**Evidence — Browser:** “How it works” and “Why قفزة?” remain in the header, but their target sections are unmounted outside the idle phase.

**Change / acceptance:** Keep the targets available, provide a non-destructive way to reveal them, or adapt navigation to the current state. Every visible anchor must resolve during processing, results and errors—not just on first load.

**Where:** `src/components/SiteHeader.tsx:43–52`; `src/App.tsx:311, 365–370`.

- [ ] **12. Clean up accessible names and verify status announcements**

**Follow-up:** Frontend fixes and automated keyboard/accessibility checks are complete. Real screen-reader verification remains open.

**Evidence — Browser + Source:** Result-region labels literally contain `<keyword>…</keyword>` because the rich-text translation is reused in an `aria-label`. The processing block is atomic, live and continuously busy; actual announcement behavior needs screen-reader testing.

**Change / acceptance:** Use a plain-text translation or `aria-labelledby` for result regions. Use one concise live region for important stage/outcome changes, rather than the entire changing status card. Verify focus restoration, error announcements and language-menu keyboard behavior with a real screen reader.

**Where:** `src/components/ResultsPanel.tsx:176–190`; `src/components/ResultsList.tsx:75, 105`; `src/components/StatusCard.tsx:50–54`; `src/components/LanguageToggle.tsx`.

- [x] **13. Make result browsing and expansion predictable**

**Evidence — Browser:** After expanding 55 results, the collapse button says **“Show all 55 matches”** but reduces the list back to 50. Each row also has a generic “Watch video” link, and the list uses a nested 60vh scroll area on mobile.

**Change / acceptance:** Correct “Show fewer” wording in both languages and expose expanded state. Give external links distinct timestamp-aware names and indicate their destination/new-tab behavior. Validate mobile scrolling; consider normal page scrolling at small widths. Keep the result count easy to discover, including when no matches exist.

**Where:** `src/components/ResultsList.tsx:100–186`; locale key `results.showLess`.

- [x] **14. Make small controls and clipboard recovery touch-friendly**

**Evidence — Source + Recommendation:** In-field Paste/clear controls are 32×32 px. The manual-paste fallback explains Ctrl/⌘+V but not mobile long-press paste.

**Change / acceptance:** Aim for approximately 44×44 px comfortable touch areas without crowding the text. Provide mobile-appropriate paste instructions and verify denial/empty-clipboard recovery. This is an ergonomic recommendation, not a claim that 32 px targets automatically fail WCAG's 24 px minimum.

**Where:** `src/components/SearchForm.tsx:71–82, 103–130, 200–246`; locale key `form.pasteBlocked`.

- [ ] **15. Finish the Arabic and mixed-language content pass**

**Follow-up:** Translation/plural/accessibility-label and mixed-direction fixes are implemented. Native Arabic review remains open; input direction continues to follow the explicit field contracts.

**Evidence — Source:** Arabic match counts only define `one` and `other`; navigation accessible labels include hard-coded English. Some Arabic error/fallback wording needs proofreading, and English phrases inherit RTL in Arabic mode regardless of their script.

**Change / acceptance:** Have a native Arabic reviewer check phrasing, terminology and plural forms for 0, 1, 2, 3, 11 and 100 results. Localize accessible labels. Test Arabic UI with English phrases, English UI with Arabic phrases, mixed punctuation and LTR timestamps. Keep existing field-direction regression requirements explicit when changing behavior.

**Where:** `src/i18n/locales/ar.json`; `src/components/SearchForm.tsx:250–252`; `src/components/SiteHeader.tsx:12, 45`; `src/components/ResultsList.tsx:121–158`.

---

## P3 — Polish after the core fixes

- [ ] **16. Make copied/exported results useful outside the app**

**Evidence — Source + Recommendation:** Copy and CSV export contain timestamps/snippets but no video URL or deep link.

**Change / acceptance:** Consider per-match “Copy timestamp link,” plus video/query context and deep links in exports. Verify Arabic CSVs in common spreadsheet apps. Make copy failures readable long enough to act on; the current notice disappears after two seconds.

**Where:** `src/App.tsx:20, 93–99, 240–265`.

- [ ] **17. Add an optional real example to explain the result**

**Evidence — Recommendation:** The decorative preview explains the layout but not the experience of finding a spoken phrase.

**Change / acceptance:** Consider a clearly labeled “Try an example” that fills a known URL/phrase. Show a representative timestamp/snippet rather than more decorative UI. Test whether this helps first-time visitors; do not assume a conversion benefit without measurement.

**Where:** `src/components/ResultsPanel.tsx:45–100, 134–158`; `src/components/SearchForm.tsx`.

- [ ] **18. Simplify visual styling and make typography intentional**

**Evidence — Source + Recommendation:** The font stack references `Barlow Condensed ExtraBold`, but the page only loads Cairo and Plus Jakarta Sans. Non-interactive feature cards and the form also use several elevation/hover effects.

**Change / acceptance:** Remove the unused font reference or load it for an intentional role. Use consistent button/card/focus treatments and avoid hover effects that imply static content is clickable. Preserve the improved idle hierarchy: the form already receives more width than the illustrative results panel.

**Where:** `src/index.css:46–48`; `index.html:14–17`; `src/components/Features.tsx:19–24`; `src/components/SearchForm.tsx:354`.

- [ ] **19. Avoid unnecessary form-height changes while typing**

**Evidence — Source:** “Clear fields” is conditionally inserted after users enter input, despite the existing per-field clear controls.

**Change / acceptance:** Reserve stable space for the action, or simplify the clear-control pattern. Keep destructive clearing explicit and ensure focus returns to the intended field.

**Where:** `src/components/SearchForm.tsx:499–531`.

---

## Launch verification — not established by this frontend audit

- [ ] **20. Verify privacy claims with the backend/product owner — release priority**

The interface claims that nothing is written to a database and the phrase is “never stored.” This repository cannot establish server retention, logging or third-party processing. The frontend itself temporarily retains the phrase in state and in its in-memory cache key, so “never stored” is too absolute unless carefully qualified.

**Acceptance:** Document the actual handling of links, phrases, transcripts, caches and logs; align both translations with that policy. Explain relevant third-party services, including YouTube and external fonts, and make the privacy information discoverable. This is a trust/content verification item, **not a finding that the unavailable backend violates a policy**.

**Where:** Locale keys `form.helperPrivacy`, `form.helperDetails`; `src/utils/resultsCache.ts:3–7`; `src/api/client.ts:46–51`; `index.html:12–17`.

- [ ] **21. Validate real supported content, timing and recovery**

With a connected backend, test a fresh transcript, repeat searches for the same and different phrases, long videos, unsupported/private/restricted content, no matches, network interruption and timeout. Verify exact-match behavior for English and Arabic and calibrate timing claims against observations.

- [ ] **22. Run the final device/accessibility/task checklist**

- [ ] No horizontal page scrolling at 320/360/390/640/768/1024/1280/1440 px in either language, including errors, open disclosures and long content.
- [ ] Complete the task with keyboard only; visible focus throughout; no lost focus after cancel, clear, retry or new search.
- [ ] Test VoiceOver/Safari and NVDA/Firefox or Chrome, including result names and live announcements.
- [ ] Test 200% zoom, 320 CSS px reflow, increased text size and reduced-motion preferences. Explicit JavaScript smooth scrolling also needs a reduced-motion check.
- [ ] Test real iOS Safari and Android Chrome: software keyboard, paste permissions, tap targets, scrolling and embedded playback.
- [ ] Test slow, blocked and unavailable third-party resources without leaving unexplained blank states.
- [ ] Observe English- and Arabic-speaking users attempting a first search, correcting a URL, canceling, recovering from no matches and searching the same video again.

## What is already working — preserve it

- [x] Persistent field labels and a clear primary action.
- [x] Custom localized validation with `noValidate`, first-invalid-field focus and revalidation while correcting errors. **URL visual styling still needs item 01.**
- [x] Mobile header separates marketing links from logo/language controls; it fits the tested narrow viewports.
- [x] Idle desktop layout favors the form and de-emphasizes the illustrative results panel.
- [x] Copy failures now have visible feedback, and “New search” is rendered. **Layout/recovery still need items 04–05.**
- [x] Document language/direction switching, skip link, explicit feedback states and CSS reduced-motion foundations are present.

## Engineering checks

Original pre-implementation baseline (the two failures are now resolved; see the follow-up above):

| Check | Result |
| --- | --- |
| `npm test` | **98 passed, 2 failed** |
| `npm run lint` | Passed |
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed |

The two existing failures are in `src/__tests__/SearchForm.test.tsx`:

1. `switches only the keyword input to RTL when Arabic text is typed`
2. `marks the invalid field with a red border and exposes the error to AT`

They support item 01. Existing cancel/new-search tests mostly assert the immediate state change; add coverage for late responses, actual field contents and focus, not only the presence of the idle panel.

**Suggested order:** Form correctness and narrow layouts → cancellation/recovery → results/player/accessibility → truthful source/progress/privacy copy → optional visual polish.

**Change scope:** The initial audit added only this checklist. Follow-ups implement the seven requested P1 items, subsequent visual/spelling preferences, and P2 frontend fixes with regression tests. P1 item 06 and P3 remain out of scope. No dependency manifests were changed. `UI_UX_AUDIT.md` remains intact.
