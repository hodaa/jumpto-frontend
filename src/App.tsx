import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError, submitSearch } from './api/client';
import { Features } from './components/Features';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import type { Phase } from './components/ResultsPanel';
import { SearchForm } from './components/SearchForm';
import type { SearchFormHandle } from './components/SearchForm';
import { SiteFooter } from './components/SiteFooter';
import { SiteHeader } from './components/SiteHeader';
import { useJobPolling } from './hooks/useJobPolling';
import type { VideoPlayerHandle } from './hooks/useYouTubePlayer';
import type { SearchMatch, StatusResponse } from './types';
import { csvCell } from './utils/csv';
import { isReadingHelp } from './utils/focus';
import { parseYouTubeId } from './utils/youtube';
import { getCachedResults, setCachedResults } from './utils/resultsCache';
import { trackEvent } from './utils/analytics';

// Lazy-load the results/status surface (ResultsPanel pulls in ResultsList,
// VideoPlayer, ResultsToolbar, StatusCard and ErrorView). It is only mounted
// once a search runs, so it stays out of the initial bundle.
const loadResultsPanel = () =>
  import('./components/ResultsPanel').then((m) => ({ default: m.ResultsPanel }));
const ResultsPanel = lazy(loadResultsPanel);

const PROGRESS_DONE_DELAY_MS = 350;
const COPY_NOTICE_MS = 2000;
const MATCH_LIMIT = 50;
const PROGRESS_INITIAL = 10; // shown the moment the user clicks Jump, before submit resolves
const PROGRESS_TICK_STEP = 10;
const PROGRESS_FALLBACK_TICK_MS = 3000; // no estimate → one step every 3s
const PROGRESS_MIN_TICK_MS = 1000; // floor so a tiny estimate doesn't spin wildly
const PROGRESS_TOTAL_STEPS = 10; // the estimate is divided into 10 equal segments
const PROGRESS_MAX = 90; // cap below 100% so we never look done before results arrive

interface ActiveJob {
  signal: AbortSignal;
  jobId: string;
  videoId: string;
  youtubeId: string;
}

interface Query {
  url: string;
  keyword: string;
}

function safeFilenamePart(value: string): string {
  const cleaned = value.replace(/[^\w\u0600-\u06FF-]+/g, '_').replace(/^_|_$/g, '');
  return cleaned.slice(0, 50) || 'results';
}

/** قفزة app: two-column split — search on the left, results on the right. */
export default function App() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('idle');
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [estimatedWait, setEstimatedWait] = useState<number | null>(null);
  const [errorText, setErrorText] = useState('');
  const [job, setJob] = useState<ActiveJob | null>(null);
  const [query, setQuery] = useState<Query>({ url: '', keyword: '' });
  // Latches true once the user edits either field after a completed search, so
  // the submit CTA can warn that the shown results are stale. Stored as a
  // boolean (not the live values) so typing doesn't re-render the whole tree
  // on every keystroke.
  const [editedSinceSubmit, setEditedSinceSubmit] = useState(false);
  const playerRef = useRef<VideoPlayerHandle | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const startedAtRef = useRef<number | null>(null);
  const estimatedWaitRef = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const formRef = useRef<SearchFormHandle>(null);
  const searchControllerRef = useRef<AbortController | null>(null);
  const [currentPlayingTimestamp, setCurrentPlayingTimestamp] = useState<number | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      searchControllerRef.current?.abort();
      if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
      if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
    },
    [],
  );

  // Warm the (lazily loaded) results chunk once the app has settled into idle,
  // so the first search doesn't stall on a network fetch of the panel. This is
  // best-effort and non-blocking — nothing depends on it completing.
  useEffect(() => {
    const preload = () => void loadResultsPanel();
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(preload);
      return () => cancelIdleCallback(id);
    }
    const id = window.setTimeout(preload, 1000);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (phase === 'idle' || isReadingHelp()) return;
    const mobile =
      typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 1023px)') : null;
    if (mobile?.matches) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      resultsRef.current?.scrollIntoView?.({
        behavior: reducedMotion ? 'instant' : 'smooth',
        block: 'start',
      });
    }
  }, [phase]);

  useEffect(() => {
    estimatedWaitRef.current = estimatedWait;
  }, [estimatedWait]);

  const clearPendingTransition = useCallback(() => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

  const scheduleCopyNotice = useCallback(() => {
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => {
      setCopied(false);
      setCopyFailed(false);
    }, COPY_NOTICE_MS);
  }, []);

  const handleSeek = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds);
  }, []);

  const handleSubmit = useCallback(
    async (url: string, keyword: string) => {
      // A signal identifies the whole search, including its polling lifecycle.
      // Even a transport that resolves after abort cannot publish stale results.
      searchControllerRef.current?.abort();
      const controller = new AbortController();
      searchControllerRef.current = controller;
      const youtubeId = parseYouTubeId(url) ?? '';
      const cached = youtubeId ? getCachedResults(youtubeId, keyword) : undefined;
      if (cached !== undefined) {
        // Same video + keyword was already searched this session: show the
        // cached results immediately instead of re-submitting and re-polling.
        trackEvent('search_submit', { source: 'cache' });
        startedAtRef.current = Date.now();
        setQuery({ url, keyword });
        setEditedSinceSubmit(false);
        setErrorText('');
        setJob(null);
        setMatches(cached);
        setCopyFailed(false);
        setCurrentPlayingTimestamp(null);
        clearPendingTransition();
        setProgress(100);
        setPhase('done');
        return;
      }
      startedAtRef.current = Date.now();
      setQuery({ url, keyword });
      setEditedSinceSubmit(false);
      setErrorText('');
      setJob(null);
      setMatches([]);
      setCopyFailed(false);
      setCurrentPlayingTimestamp(null);
      clearPendingTransition();
      // Start the progress count the moment the button is clicked, before the
      // search request resolves, so the user sees counting immediately.
      setEstimatedWait(null);
      setProgress(PROGRESS_INITIAL);
      setPhase('processing');
      try {
        const response = await submitSearch(url, keyword, controller.signal);
        if (controller.signal.aborted) return;
        trackEvent('search_submit', { source: 'network' });
        if (response.status === 'found' || response.status === 'not_found') {
          if (youtubeId) setCachedResults(youtubeId, keyword, response.results);
          setMatches(response.results);
          setProgress(100);
          setPhase('done');
          return;
        }
        setJob({
          signal: controller.signal,
          jobId: response.job_id,
          videoId: response.video_id,
          youtubeId: parseYouTubeId(url) ?? '',
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        const messageKey = error instanceof ApiError ? error.messageKey : t('error.server');
        trackEvent('search_error', { reason: messageKey });
        setErrorText(messageKey);
        setPhase('error');
      }
    },
    [t, clearPendingTransition],
  );

  const handlePollProgress = useCallback((status: StatusResponse) => {
    const serverValue = typeof status.progress === 'number' ? status.progress : null;
    const serverEta =
      typeof status.estimatedTimeSeconds === 'number' ? status.estimatedTimeSeconds : null;
    // Prefer the server-provided estimate; otherwise derive one from how
    // long the job has been running versus its reported progress.
    if (serverEta !== null) {
      setEstimatedWait(serverEta);
    } else if (serverValue !== null && serverValue > 0 && startedAtRef.current !== null) {
      const elapsed = (Date.now() - startedAtRef.current) / 1000;
      setEstimatedWait(Math.max(1, Math.round((elapsed * (100 - serverValue)) / serverValue)));
    } else {
      setEstimatedWait(null);
    }
    if (serverValue !== null) {
      // Snap the server value down to the nearest multiple of PROGRESS_TICK_STEP
      // (10, 20, … 90) AND allow it to move the counter forward by at most one
      // step per poll, so the bar always climbs strictly 10 → 20 → … → 90 and
      // never jumps (e.g. 40 → 60) even when the backend reports coarse stages.
      const serverStep =
        Math.floor(Math.min(serverValue, PROGRESS_MAX) / PROGRESS_TICK_STEP) * PROGRESS_TICK_STEP;
      setProgress((current) => {
        const base = current ?? PROGRESS_INITIAL;
        return Math.max(base, Math.min(serverStep, base + PROGRESS_TICK_STEP));
      });
    }
  }, []);

  const handlePollSuccess = useCallback(
    (value: SearchMatch[]) => {
      const youtubeId = parseYouTubeId(query.url) ?? '';
      if (youtubeId) setCachedResults(youtubeId, query.keyword, value);
      setProgress(100);
      clearPendingTransition();
      const signal = searchControllerRef.current?.signal;
      transitionTimerRef.current = window.setTimeout(() => {
        if (signal?.aborted) return;
        setMatches(value);
        setPhase('done');
      }, PROGRESS_DONE_DELAY_MS);
    },
    [query, clearPendingTransition],
  );
  const handlePollError = useCallback(
    (message: string) => {
      clearPendingTransition();
      setErrorText(message);
      setPhase('error');
    },
    [clearPendingTransition],
  );

  useJobPolling({
    signal: job?.signal,
    jobId: job?.jobId ?? '',
    videoId: job?.videoId ?? '',
    keyword: query.keyword,
    onProgress: handlePollProgress,
    onSuccess: handlePollSuccess,
    onError: handlePollError,
  });

  useEffect(() => {
    if (phase !== 'processing') return undefined;
    let timer: number | null = null;
    const scheduleNext = (current: number) => {
      if (current >= PROGRESS_MAX) return;
      const remaining = estimatedWaitRef.current;
      let delay = PROGRESS_FALLBACK_TICK_MS;
      if (remaining !== null && remaining > 1) {
        // Divide the estimated wait into 10 equal segments, one per 10% step:
        // a 60s estimate advances the bar by 10 every 6 seconds.
        delay = Math.max(PROGRESS_MIN_TICK_MS, (remaining * 1000) / PROGRESS_TOTAL_STEPS);
      }
      timer = window.setTimeout(() => {
        // Schedule the next tick here (outside the setState updater): React
        // double-invokes updaters in dev/StrictMode, and a timer scheduled from
        // inside one would fork the chain into two +10 ticks → visible 40→60
        // jumps. Threading `current` keeps the chain strictly one 10-step at a time.
        const next = Math.min(current + PROGRESS_TICK_STEP, PROGRESS_MAX);
        setProgress(next);
        scheduleNext(next);
      }, delay);
    };
    scheduleNext(PROGRESS_INITIAL);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [phase]);

  const handleCopyResults = useCallback(async () => {
    const signal = searchControllerRef.current?.signal;
    const text = matches
      .map((m) => `${m.timestamp} — ${m.text_snippet ?? t('results.noSnippet')}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      if (signal?.aborted) return;
      setCopyFailed(false);
      setCopied(true);
    } catch {
      if (signal?.aborted) return;
      setCopied(false);
      setCopyFailed(true);
    }
    scheduleCopyNotice();
  }, [matches, t, scheduleCopyNotice]);

  const handleExportResults = useCallback(() => {
    const rows = matches.map((m) => `${csvCell(m.timestamp)},${csvCell(m.text_snippet ?? '')}`);
    const csv = ['timestamp,text_snippet', ...rows];
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jumpto-results-${safeFilenamePart(query.keyword)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [matches, query.keyword]);

  const resetSearch = useCallback(() => {
    searchControllerRef.current?.abort();
    clearPendingTransition();
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    setEditedSinceSubmit(false);
    setPhase('idle');
    setMatches([]);
    setProgress(null);
    setEstimatedWait(null);
    setErrorText('');
    setJob(null);
    setCopied(false);
    setCopyFailed(false);
    setCurrentPlayingTimestamp(null);
  }, [clearPendingTransition]);

  const handleClearKeyword = useCallback(() => {
    resetSearch();
    setQuery((current) => ({ ...current, keyword: '' }));
    formRef.current?.focusKeyword(true);
  }, [resetSearch]);

  const handleNewSearch = useCallback(() => {
    resetSearch();
    formRef.current?.focusKeyword();
  }, [resetSearch]);

  const handleCancelSearch = useCallback(() => {
    trackEvent('search_cancel');
    resetSearch();
    formRef.current?.focusKeyword();
  }, [resetSearch]);

  const handleRetry = useCallback(() => {
    formRef.current?.submit();
  }, []);

  const handleSearchInput = useCallback(() => {
    setEditedSinceSubmit(true);
  }, []);

  const searching = phase === 'processing';
  // Once a search finishes, keep the Jump button latched off until the user
  // actually changes the URL or phrase — clicking it again would only replay
  // the exact same query. Retry (from an error panel) stays imperative, so it
  // is unaffected by the latch.
  const submitLocked =
    (phase === 'done' || phase === 'error') && !editedSinceSubmit;
  // Layout is state-dependent. While idle the form is the hero: it takes the
  // wider track and the placeholder preview sits in a narrower, de-emphasized
  // "empty state" column beside it. Once processing/done we flip the emphasis
  // and widen the results column so the output carries the weight.
  const resultsActive = phase === 'processing' || phase === 'done' || phase === 'error';
  const gridCols = resultsActive
    ? 'lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]'
    : 'lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)]';

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        {t('actions.skipToContent')}
      </a>
      <SiteHeader />
      <main className="app-main" id="main-content" tabIndex={-1}>
        <div className="mb-8 lg:mb-10">
          <Hero compact />
        </div>
        <div className={`grid grid-cols-1 items-stretch gap-8 ${gridCols} lg:gap-10`}>
          <section aria-labelledby="search-heading" className="min-w-0">
            <SearchForm
              ref={formRef}
              onSubmit={handleSubmit}
              disabled={searching}
              submitLocked={submitLocked}
              onChange={handleSearchInput}
              initialUrl={query.url}
              initialKeyword={query.keyword}
            />
          </section>
          <section ref={resultsRef} className="min-w-0 scroll-mt-6">
            <Suspense
              fallback={
                <div
                  aria-hidden="true"
                  className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
                />
              }
            >
              <ResultsPanel
              phase={phase}
              progress={progress}
              estimatedSeconds={estimatedWait}
              matches={matches}
              errorText={errorText}
              keyword={query.keyword}
              youtubeId={parseYouTubeId(query.url) ?? null}
              copied={copied}
              copyFailed={copyFailed}
              matchLimit={MATCH_LIMIT}
              playerRef={playerRef}
              onCopy={() => void handleCopyResults()}
              onExport={handleExportResults}
              onSeek={handleSeek}
              onPlaybackChange={setCurrentPlayingTimestamp}
              onClear={handleClearKeyword}
              onNewSearch={handleNewSearch}
              onRetry={handleRetry}
              onCancel={searching ? handleCancelSearch : undefined}
              currentPlayingTimestamp={currentPlayingTimestamp}
              />
            </Suspense>
          </section>
        </div>
        <HowItWorks />
        <Features />
      </main>
      <SiteFooter />
    </div>
  );
}
