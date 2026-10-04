import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthApiError, clearHistory, deleteHistoryEntry, fetchHistory } from '../../api/authClient';
import { useAuth } from '../../auth/useAuth';
import { navigate } from '../../hooks/useRoute';
import { trackEvent } from '../../utils/analytics';
import { groupHistoryByVideo, type VideoHistoryGroup } from '../../utils/historyGroups';
import { formatWhen } from '../../utils/datetime';
import { savedResultsOf } from '../../utils/savedResults';
import { buildMomentHref, buildThumbnailUrl, formatYouTubeTime } from '../../utils/youtube';
import type { HistoryEntry } from '../../types';
import { IconAlert, IconHistory, IconTrash, IconVideo } from '../icons';
import { useAuthErrorMessage } from './formHooks';
import { RouteLink } from '../RouteLink';

type LoadState = 'loading' | 'ready' | 'error';

interface PendingClear {
  kind: 'all' | 'one';
  id?: string;
}

/**
 * The caller's own search history.
 *
 * Every request here is scoped by the session cookie, so the page has no notion
 * of whose data it is showing — there is no user id to tamper with. The list is
 * cursor-paginated because a long-lived account accumulates entries for years
 * and rendering all of them at once is both slow and a privacy problem (scroll
 * position can reveal what a visitor searched months ago).
 *
 * It reads as one card per video rather than one per search. People search the
 * same video repeatedly, and a card per search restated the same title and
 * thumbnail down the whole page — the keywords they typed, which is the part
 * they would recognise, were the smallest text on it. The cards use the same
 * shape as a home-page result, so the two pages are visibly one product.
 */
interface HistoryPageProps {
  /**
   * Open a saved search on the home view: the video loaded, the player sitting
   * on the moment the keyword was found. Handed in by App, which owns that state.
   *
   * The whole entry travels rather than a few fields, because replaying needs
   * what the search found, not just where its first hit sat: every match is
   * shown again, and an entry that matched nothing has to reopen as an honest
   * "not found" rather than as a search that found something at 00:00.
   */
  onReplay: (entry: HistoryEntry) => void;
  /**
   * Open a video from its title, with no search attached. The video as a whole
   * is not one search, so it carries no keyword and no results - the keywords
   * listed underneath it are what choose a moment.
   */
  onOpenVideo: (videoId: string) => void;
}

export function HistoryPage({ onReplay, onOpenVideo }: HistoryPageProps) {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [paging, setPaging] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingClear, setPendingClear] = useState<PendingClear | null>(null);
  const describeError = useAuthErrorMessage();
  const dialogRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // The confirmation sits above the list, so a visitor who clicked delete on a
  // row far down the page is looking at the wrong part of the screen. Take them
  // to it, and put focus on it: an alertdialog that only scrolls is still a
  // keyboard dead end, with Tab continuing from wherever the trash button was.
  useEffect(() => {
    if (!pendingClear) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    dialog.focus();
  }, [pendingClear]);

  // One card per video rather than one per search. Recomputed from the whole
  // loaded list, so a video split across two pages of the cursor merges into a
  // single group on its own — no bookkeeping at the page boundary.
  const groups = useMemo(() => groupHistoryByVideo(entries), [entries]);

  // First page only. Runs once the session check has settled: loading history
  // before then would fire a request with no cookie yet and report a spurious
  // error to a signed-in visitor who simply reloaded the page. State updates
  // happen in the promise callbacks, never synchronously in the effect body, so
  // this does not trigger a cascading render.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('login');
      return;
    }
    let active = true;
    fetchHistory()
      .then((page) => {
        if (!active) return;
        setEntries(page.entries);
        setNextCursor(page.next_cursor);
        setState('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        // A 401 here means the cookie expired mid-visit. Treat it as signed out
        // rather than showing an error on a page the visitor can no longer use.
        if (error instanceof AuthApiError && error.code === 'UNAUTHENTICATED') {
          navigate('login');
          return;
        }
        setErrorText(describeError(error));
        setState('error');
      });
    return () => {
      active = false;
    };
  }, [user, authLoading, describeError]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || paging) return;
    setPaging(true);
    setErrorText(null);
    try {
      const page = await fetchHistory(nextCursor);
      setEntries((current) => [...current, ...page.entries]);
      setNextCursor(page.next_cursor);
    } catch (error) {
      setErrorText(describeError(error));
    } finally {
      setPaging(false);
    }
  }, [nextCursor, paging, describeError]);

  const confirmClear = useCallback(async () => {
    if (!pendingClear) return;
    setBusy(true);
    try {
      if (pendingClear.kind === 'all') {
        await clearHistory();
        setEntries([]);
        setNextCursor(null);
        trackEvent('history_clear');
      } else if (pendingClear.id) {
        const removed = pendingClear.id;
        await deleteHistoryEntry(removed);
        // Drop it locally rather than refetching: the page is already holding
        // the authoritative copy, and a full reload would reset the scroll and
        // throw away the entries the visitor had paged in.
        setEntries((current) => current.filter((entry) => entry.id !== removed));
        trackEvent('history_delete');
      }
      setPendingClear(null);
      // Anchor on the card heading, which is still mounted. The dialog is not:
      // the line above just unmounted it, so scrolling to it would aim at a
      // detached node and leave the viewport wherever it happened to be.
      headerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      setErrorText(describeError(error));
      setPendingClear(null);
    } finally {
      setBusy(false);
    }
  }, [pendingClear, describeError]);

  if (authLoading) {
    return (
      <div className="py-10 sm:py-14">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-8 w-48 animate-pulse rounded-md bg-surface-soft" />
            <div className="h-4 w-64 animate-pulse rounded-md bg-surface-soft" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-10 sm:py-14">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex flex-col items-center gap-4 text-center animate-fade-in">
            <IconAlert size={28} />
            <p className="text-muted">{t('auth.history.signInRequired')}</p>
            <RouteLink to="login" className="font-semibold text-action hover:underline">
              {t('auth.history.signIn')}
            </RouteLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 sm:py-14">
      <div className="mx-auto w-full max-w-3xl">
        <header
          ref={headerRef}
          className="flex flex-wrap items-start justify-between gap-4 animate-fade-in"
        >
          <div>
            <h1 className="section-title">{t('auth.history.title')}</h1>
          </div>
          {entries.length > 0 ? (
            <button
              type="button"
              onClick={() => setPendingClear({ kind: 'all' })}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-danger/40 px-4 py-2 text-sm font-semibold text-danger transition-colors duration-200 hover:bg-danger-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
            >
              <IconTrash size={16} />
              {t('auth.history.clearAll')}
            </button>
          ) : null}
        </header>

        {pendingClear ? (
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-labelledby="clear-heading"
            tabIndex={-1}
            className="mt-6 rounded-xl border border-danger/40 bg-danger-soft p-4 animate-fade-in focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          >
            <h2 id="clear-heading" className="text-base font-bold text-danger">
              {pendingClear.kind === 'all'
                ? t('auth.history.confirmClearAll')
                : t('auth.history.confirmDelete')}
            </h2>
            <p className="mt-1 text-sm text-muted-strong">{t('auth.history.confirmBody')}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void confirmClear()}
                disabled={busy}
                className="inline-flex min-h-[44px] items-center rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-danger/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {pendingClear.kind === 'all'
                  ? t('auth.history.confirmDeleteEverything')
                  : t('auth.history.confirmDelete')}
              </button>
              <button
                type="button"
                onClick={() => setPendingClear(null)}
                disabled={busy}
                className="inline-flex min-h-[44px] items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-strong transition-colors duration-200 hover:bg-surface-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-action disabled:opacity-60"
              >
                {t('auth.history.cancel')}
              </button>
            </div>
          </div>
        ) : null}

        {errorText ? (
          <p role="alert" className="mt-6 flex items-center gap-2 text-sm font-medium text-danger">
            <IconAlert size={18} />
            {errorText}
          </p>
        ) : null}

        <div className="mt-8">
          {state === 'loading' ? (
            <ul className="space-y-3" aria-busy="true">
              {[0, 1, 2].map((key) => (
                <li
                  key={key}
                  className="h-28 animate-pulse rounded-xl border border-slate-200 bg-slate-50"
                  aria-hidden="true"
                />
              ))}
            </ul>
          ) : null}

          {state === 'ready' && entries.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface-soft px-6 py-14 text-center animate-fade-in">
              <IconHistory size={28} />
              <p className="font-semibold text-muted-strong">{t('auth.history.empty')}</p>
              <p className="text-sm text-muted">{t('auth.history.emptyBody')}</p>
              <RouteLink to="home" className="text-sm font-semibold text-action hover:underline">
                {t('auth.history.startSearching')}
              </RouteLink>
            </div>
          ) : null}

          {entries.length > 0 ? (
            <ul className="space-y-3">
              {groups.map((group) => (
                <li
                  key={group.videoId}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
                >
                  <VideoHeading group={group} onOpenVideo={onOpenVideo} />
                  <ul className="border-t border-slate-100">
                    {group.entries.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 px-4 py-2.5 last:border-b-0"
                      >
                        {/* The keyword and its count travel together: the badge
                            answers "what did this phrase find?", so parked beside
                            the date it would read as a property of the row. The
                            wrapper, not the link, takes the free space — that is
                            what leaves the pair sitting at the start of the row
                            while the date and delete stay at the end. */}
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <KeywordLink entry={entry} onReplay={onReplay} />
                          <MatchCountBadge entry={entry} />
                        </div>
                        <time dateTime={entry.created_at} className="shrink-0 text-xs text-muted">
                          {formatWhen(entry.created_at, i18n.language, entry.created_at)}
                        </time>
                        <button
                          type="button"
                          onClick={() => setPendingClear({ kind: 'one', id: entry.id })}
                          aria-label={t('auth.history.deleteEntry', { keyword: entry.keyword })}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-muted transition-colors duration-200 hover:border-danger/40 hover:bg-danger-soft hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                        >
                          <IconTrash size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : null}

          {nextCursor && state === 'ready' ? (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={paging}
                className="inline-flex min-h-[44px] items-center rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-muted-strong transition-colors duration-200 hover:border-border-hover hover:bg-surface-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-action disabled:opacity-60"
              >
                {t('auth.history.loadMore')}
              </button>
            </div>
          ) : null}
        </div>

        <p className="mt-8 text-center text-xs text-muted">{t('auth.history.privacyNote')}</p>
      </div>
    </div>
  );
}

/**
 * Let the app handle a plain left click on a moment link, and leave every other
 * gesture to the browser.
 *
 * Modifier clicks and non-left buttons mean "open this somewhere else", which the
 * anchor's href already answers correctly, so hijacking them would take away
 * middle-click, ctrl-click and "open in new tab" for no gain.
 */
function onPlainClick(event: React.MouseEvent<HTMLAnchorElement>, run: () => void): void {
  if (event.defaultPrevented) return;
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return;
  event.preventDefault();
  run();
}

/**
 * The keyword, wired back to the moment it was found.
 *
 * This is the same gesture as on the home page — click the thing you searched
 * for, land on the video at that second — so a saved search is a way back to the
 * answer rather than a record to read. It stays inside the app and hands the
 * moment to App, which is the same path a shared-moment link takes, so the video
 * is loaded in the in-page player and sits on the second the quote was found.
 *
 * It is still a real anchor pointing at that deep link, so the href is a genuine
 * destination: a middle-click, a copied address or a reload all still work, and
 * the address bar ends up holding a link the visitor can share.
 *
 * A search with no recorded position still links, and opens from the top: it is
 * the honest fallback for the searches that predate the timestamp and for the
 * ones that matched nothing.
 *
 * The keyword alone is what the row shows. A second printed beside it read as
 * the one place the phrase was found, which is the opposite of the truth now
 * that every match is replayed — the position is on the link's tooltip and in
 * the accessible name, where it describes the destination instead of competing
 * with the keyword for the eye.
 */
function KeywordLink({
  entry,
  onReplay,
}: {
  entry: HistoryEntry;
  onReplay: (entry: HistoryEntry) => void;
}) {
  const { t } = useTranslation();
  const seconds = entry.progress_seconds ?? 0;
  const timed = entry.progress_seconds != null;
  const timestamp = formatYouTubeTime(seconds);
  // A search that came back empty has no moment to resume, so it must not be
  // described as if it did — see the not-found branch below.
  const empty = entry.status === 'not_found';

  return (
    <a
      // A fruitless search says so in its own href, so that reloading the link
      // or opening it in another tab lands on the same empty result this click
      // produces instead of inventing a match at 00:00.
      href={buildMomentHref(entry.video_id, seconds, { foundNothing: empty })}
      onClick={(event) => onPlainClick(event, () => onReplay(entry))}
      // The tooltip has no room for the keyword — the row already shows it — and
      // passing only `timestamp` here used to print the raw `{{keyword}}`
      // placeholder, because this and the accessible name are different strings.
      title={
        empty
          ? t('auth.history.replayNoMatchesTitle')
          : timed
            ? t('auth.history.replayAtTitle', { timestamp })
            : t('auth.history.replayFromStart')
      }
      aria-label={
        empty
          ? t('auth.history.replayNoMatches', { keyword: entry.keyword })
          : timed
            ? t('auth.history.replayAt', { keyword: entry.keyword, timestamp })
            : t('auth.history.replayFromStart', { keyword: entry.keyword })
      }
      // An empty result is not a lesser result, so the link keeps its weight and
      // underline affordance rather than being greyed into looking disabled. The
      // "found nothing" badge beside it carries that news.
      className="min-w-0 truncate rounded text-sm font-medium text-muted-strong underline-offset-2 transition-colors duration-200 hover:text-action hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
    >
      {entry.keyword}
    </a>
  );
}

/**
 * What the search actually came back with, in one glance.
 *
 * The count answers a question the keyword link alone cannot: "was this one
 * worth it?" A history is browsed, not read — somebody scanning for the phrase
 * that hit five times wants to spend their attention there, and without a count
 * the only way to find out is to open it and wait for the replay. Reading the
 * number off the row is what turns a list into something you can skim.
 *
 * Three distinct outcomes, which must not collapse into one number:
 *
 * - `[]` with `matched: false` — the search ran and found nothing. That is a
 *   real, settled answer and gets its own badge in a warning tint, because
 *   "found nothing" and "never measured" are exactly the two states a history
 *   most needs to tell apart.
 * - `null` matches — nothing was stored for this row at all, so it predates
 *   match recording. The badge is withheld entirely: this is the one case where
 *   putting something on screen would mean inventing it.
 * - `n` matches — the count itself, reusing the results page's own wording so a
 *   number here and the same number there read identically.
 */
function MatchCountBadge({ entry }: { entry: HistoryEntry }) {
  const { t } = useTranslation();
  const { matches, matched } = savedResultsOf(entry);

  // `matched: false` is the one case that earned its badge: the search ran and
  // came back empty, which is a settled answer worth marking before somebody
  // spends a click on it.
  if (!matched) {
    return (
      <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
        {t('auth.history.noMatchesBadge')}
      </span>
    );
  }

  // `matches: null` is the opposite: the row predates match recording, so there
  // is no number to show and the badge is withheld rather than guessed at.
  // Rendering "0" here — or even "found nothing" with a tooltip admitting we do
  // not know — would be a claim about the video that nobody ever measured.
  const count = matches?.length ?? 0;
  if (count === 0) return null;

  return (
    <span className="shrink-0 rounded-full bg-action/10 px-2 py-0.5 text-xs font-semibold text-action tabular-nums">
      {t('results.matchCount', { count })}
    </span>
  );
}

/**
 * The video's own frame, as the fastest way to recognise it.
 *
 * A history is a list of videos, and the title alone is a weak identifier —
 * people remember "that one video about the desk" far more reliably than the exact
 * words in its title bar, and half the time they are looking for the video rather
 * than the keyword. The picture answers "is this the one?" before the title is
 * read at all, and it is the only thing on the row that distinguishes an untitled
 * video from any other.
 *
 * It is decorative: the title beside it already names the video, so the image
 * carries an empty alt rather than repeating it to a screen reader, and it is
 * hidden from the accessibility tree along with its fallback tile. The anchor
 * around both is the target, so the thumbnail is not a separate 80px tap.
 *
 * A deleted or private video has no frame, and YouTube answers those with an
 * error rather than a placeholder — so the failure swaps in a neutral tile of
 * exactly the same box instead of leaving a broken image icon on the card.
 */
function VideoThumbnail({ videoId }: { videoId: string }) {
  const [missing, setMissing] = useState(false);
  // A viewport breakpoint rather than a named container query: this card is
  // already inside the page's single `max-w-3xl` column, so there is no narrower
  // ancestor to measure, and a `/video` variant with no `@container/video`
  // declared anywhere would simply never apply.
  const frame = 'aspect-video w-20 shrink-0 overflow-hidden rounded-md sm:w-24';

  if (missing) {
    return (
      <span
        aria-hidden="true"
        className={`${frame} grid place-items-center bg-slate-100 text-slate-400`}
      >
        <IconVideo size={18} />
      </span>
    );
  }

  return (
    <img
      src={buildThumbnailUrl(videoId)}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setMissing(true)}
      className={`${frame} bg-slate-100 object-cover`}
    />
  );
}

/**
 * The video's name, as the way back to it.
 *
 * The title is the link, not a caption under the keyword: the keywords are
 * already listed below, so a visitor returning here wants the video, and the
 * title is the only part that reads as a name rather than as something they
 * typed. The whole row is the target so it can be hit without precision.
 *
 * No timestamp here, unlike a keyword: the video as a whole is not one search,
 * so it opens from the start and lets the keywords below choose a moment.
 */
function VideoHeading({
  group,
  onOpenVideo,
}: {
  group: VideoHistoryGroup;
  onOpenVideo: (videoId: string) => void;
}) {
  const { t } = useTranslation();
  const titled = Boolean(group.title);

  return (
    <div className="flex items-center gap-3 p-4">
      <a
        href={buildMomentHref(group.videoId, 0)}
        onClick={(event) => onPlainClick(event, () => onOpenVideo(group.videoId))}
        className="group/video flex min-w-0 flex-1 items-center gap-3 rounded-lg text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
      >
        <VideoThumbnail videoId={group.videoId} />
        {titled ? (
          // `dir="auto"` so the ellipsis lands at the end of the title's own
          // script: with the row's inherited rtl direction a latin title gets
          // truncated from its *start*, losing the opening words. That then
          // resolves the box to ltr, so `rtl:text-right` re-anchors it to the
          // right edge of the row, which is where an arabic reader expects it.
          <span
            dir="auto"
            className="min-w-0 flex-1 truncate font-semibold text-text transition-colors duration-200 rtl:text-right group-hover/video:text-action-hover"
          >
            {group.title}
          </span>
        ) : (
          // Untitled videos have nothing to name them by. Showing the bare id
          // still tells the visitor which video this is, and marks it as an id
          // rather than dressing it up as a title they never gave it.
          <>
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted" dir="ltr">
              {group.videoId}
            </span>
            <span className="shrink-0 text-xs text-muted">{t('auth.history.untitled')}</span>
          </>
        )}
      </a>
    </div>
  );
}
