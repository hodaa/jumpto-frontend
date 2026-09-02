import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError, submitSearch } from './api/client';
import { Features } from './components/Features';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { ResultsPanel } from './components/ResultsPanel';
import type { Phase } from './components/ResultsPanel';
import { SearchForm } from './components/SearchForm';
import { SiteFooter } from './components/SiteFooter';
import { SiteHeader } from './components/SiteHeader';
import { useJobPolling } from './hooks/useJobPolling';
import type { VideoPlayerHandle } from './hooks/useYouTubePlayer';
import type { SearchMatch } from './types';
import { csvCell } from './utils/csv';
import { parseYouTubeId } from './utils/youtube';

const PROGRESS_DONE_DELAY_MS = 350;
const COPY_NOTICE_MS = 2000;
const MATCH_LIMIT = 50;

interface ActiveJob {
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

/** JumpTo app: two-column split — search on the left, results on the right. */
export default function App() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('idle');
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [errorText, setErrorText] = useState('');
  const [job, setJob] = useState<ActiveJob | null>(null);
  const [query, setQuery] = useState<Query>({ url: '', keyword: '' });
  const playerRef = useRef<VideoPlayerHandle | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [currentPlayingTimestamp, setCurrentPlayingTimestamp] = useState<number | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
      if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (phase === 'idle') return;
    const mobile =
      typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 1023px)') : null;
    if (mobile?.matches) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [phase]);

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
    setCurrentPlayingTimestamp(seconds);
    playerRef.current?.seekTo(seconds);
  }, []);

  const handleSubmit = useCallback(
    async (url: string, keyword: string) => {
      setQuery({ url, keyword });
      setErrorText('');
      setJob(null);
      setMatches([]);
      setProgress(null);
      setCopyFailed(false);
      setCurrentPlayingTimestamp(null);
      clearPendingTransition();
      try {
        const response = await submitSearch(url, keyword);
        if (response.status === 'found' || response.status === 'not_found') {
          setMatches(response.results);
          setProgress(100);
          setPhase('done');
          return;
        }
        setJob({
          jobId: response.job_id,
          videoId: response.video_id,
          youtubeId: parseYouTubeId(url) ?? '',
        });
        setPhase('processing');
      } catch (error) {
        setErrorText(error instanceof ApiError ? error.messageKey : t('error.server'));
        setPhase('error');
      }
    },
    [t, clearPendingTransition],
  );

  const handlePollProgress = useCallback((value: number | null) => setProgress(value), []);
  const handlePollSuccess = useCallback(
    (value: SearchMatch[]) => {
      setProgress(100);
      clearPendingTransition();
      transitionTimerRef.current = window.setTimeout(() => {
        setMatches(value);
        setPhase('done');
      }, PROGRESS_DONE_DELAY_MS);
    },
    [clearPendingTransition],
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
    jobId: job?.jobId ?? '',
    videoId: job?.videoId ?? '',
    keyword: query.keyword,
    onProgress: handlePollProgress,
    onSuccess: handlePollSuccess,
    onError: handlePollError,
  });

  const handleCopyResults = useCallback(async () => {
    const text = matches
      .map((m) => `${m.timestamp} — ${m.text_snippet ?? t('results.noSnippet')}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopyFailed(false);
      setCopied(true);
    } catch {
      setCopyFailed(false);
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

  const handleClearKeyword = useCallback(() => {
    clearPendingTransition();
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    setPhase('idle');
    setMatches([]);
    setProgress(null);
    setErrorText('');
    setJob(null);
    setCopied(false);
    setCopyFailed(false);
    setCurrentPlayingTimestamp(null);
    setFormKey((k) => k + 1);
  }, [clearPendingTransition]);

  const handleNewSearch = useCallback(() => {
    clearPendingTransition();
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    setPhase('idle');
    setMatches([]);
    setProgress(null);
    setErrorText('');
    setJob(null);
    setCopied(false);
    setCopyFailed(false);
    setCurrentPlayingTimestamp(null);
  }, [clearPendingTransition]);

  const handleCancelSearch = useCallback(() => {
    clearPendingTransition();
    setPhase('idle');
    setProgress(null);
    setJob(null);
    setCurrentPlayingTimestamp(null);
  }, [clearPendingTransition]);

  const handleRetry = useCallback(
    () => void handleSubmit(query.url, query.keyword),
    [handleSubmit, query],
  );

  const searching = phase === 'processing';
  const showMarketing = phase === 'idle';

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        {t('actions.skipToContent')}
      </a>
      <SiteHeader />
      <main className="app-main" id="main-content">
        <div className="mb-8 lg:mb-10">
          <Hero compact />
        </div>
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-10">
          <section aria-labelledby="search-heading" className="min-w-0">
            <SearchForm
              key={formKey}
              onSubmit={handleSubmit}
              onCancel={searching ? handleCancelSearch : undefined}
              disabled={searching}
              initialUrl={query.url}
              initialKeyword={query.keyword}
            />
          </section>
          <section ref={resultsRef} className="min-w-0 scroll-mt-6">
            <ResultsPanel
              phase={phase}
              progress={progress}
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
              onClear={handleClearKeyword}
              onNewSearch={handleNewSearch}
              onRetry={handleRetry}
              currentPlayingTimestamp={currentPlayingTimestamp}
            />
          </section>
        </div>
        {showMarketing ? (
          <>
            <HowItWorks />
            <Features />
          </>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}