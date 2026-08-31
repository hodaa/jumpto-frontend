import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError, submitSearch } from './api/client';
import { ErrorView } from './components/ErrorView';
import { Features } from './components/Features';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { ResultsList } from './components/ResultsList';
import { ResultsToolbar } from './components/ResultsToolbar';
import { SearchForm } from './components/SearchForm';
import { SiteFooter } from './components/SiteFooter';
import { SiteHeader } from './components/SiteHeader';
import { StatusCard } from './components/StatusCard';
import { VideoPlayer } from './components/VideoPlayer';
import { useJobPolling } from './hooks/useJobPolling';
import type { VideoPlayerHandle } from './hooks/useYouTubePlayer';
import type { SearchLanguage, SearchMatch } from './types';
import { parseYouTubeId } from './utils/youtube';

type Phase = 'idle' | 'processing' | 'done' | 'error' | 'mismatch';

interface ActiveJob {
  jobId: string;
  videoId: string;
  youtubeId: string;
}

interface Query {
  url: string;
  keyword: string;
  language: SearchLanguage;
}

export default function App() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('idle');
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [errorText, setErrorText] = useState('');
  const [job, setJob] = useState<ActiveJob | null>(null);
  const [query, setQuery] = useState<Query>({ url: '', keyword: '', language: 'en' });
  const playerRef = useRef<VideoPlayerHandle | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSeek = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds);
  }, []);

  const handleSubmit = useCallback(
    async (url: string, keyword: string, language: SearchLanguage) => {
      setQuery({ url, keyword, language });
      setErrorText('');
      setJob(null);
      setMatches([]);
      try {
        const response = await submitSearch(url, keyword, language);
        if (response.status === 'found') {
          setMatches(response.results);
          setPhase('done');
          return;
        }
        if (response.status === 'language_mismatch') {
          setErrorText(t('mismatch.message'));
          setPhase('mismatch');
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
    [t],
  );

  const handlePollProgress = useCallback((value: number | null) => setProgress(value), []);
  const handlePollSuccess = useCallback((value: SearchMatch[]) => {
    setMatches(value);
    setPhase('done');
  }, []);
  const handlePollError = useCallback((message: string) => {
    setErrorText(message);
    setPhase('error');
  }, []);
  const handlePollMismatch = useCallback((message: string) => {
    setErrorText(message);
    setPhase('mismatch');
  }, []);

  useJobPolling({
    jobId: job?.jobId ?? '',
    videoId: job?.videoId ?? '',
    keyword: query.keyword,
    language: query.language,
    onProgress: handlePollProgress,
    onSuccess: handlePollSuccess,
    onError: handlePollError,
    onMismatch: handlePollMismatch,
  });

  const handleCopyResults = useCallback(async () => {
    const text = matches
      .map((m) => `${m.timestamp} — ${m.text_snippet ?? t('results.noSnippet')}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorText(t('error.server'));
      setPhase('error');
    }
  }, [matches, t]);

  const handleExportResults = useCallback(() => {
    const csv = [
      'timestamp,text_snippet',
      ...matches.map((m) => `${m.timestamp},"${m.text_snippet ?? ''}"`),
    ];
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jumpto-results-${query.keyword}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [matches, query.keyword]);

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <SiteHeader />
      <main className="app-main" id="main-content">
        <div className="split-view">
          <div className="split-view__column">
            <Hero>
              <SearchForm
                onSubmit={handleSubmit}
                disabled={phase === 'processing'}
                initialUrl={query.url}
                initialKeyword={query.keyword}
              />
            </Hero>
          </div>
          <div className="split-view__column">
            <div className="results-canvas card">
              {phase === 'idle' ? (
                <div className="results-empty">
                  <div className="w-full space-y-3 opacity-40 mb-6" aria-hidden="true">
                    <div className="flex items-center gap-3 w-full">
                      <div className="h-6 w-16 bg-slate-200 rounded-md shrink-0 animate-pulse" />
                      <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center gap-3 w-full">
                      <div className="h-6 w-16 bg-slate-200 rounded-md shrink-0 animate-pulse" />
                      <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center gap-3 w-full opacity-60">
                      <div className="h-6 w-16 bg-slate-200 rounded-md shrink-0 animate-pulse" />
                      <div className="h-4 w-2/3 bg-slate-200 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="results-empty__content">
                    <div className="results-empty__icon" aria-hidden="true">
                      🎯
                    </div>
                    <p className="results-empty__title">{t('results.idleTitle')}</p>
                    <p className="results-empty__text">{t('results.idle')}</p>
                  </div>
                </div>
              ) : phase === 'processing' ? (
                <StatusCard progress={progress} />
              ) : phase === 'done' ? (
                <>
                  <div className="results-canvas__toolbar">
                    <h2>{t('results.title', { keyword: query.keyword })}</h2>
                    <ResultsToolbar
                      onCopy={handleCopyResults}
                      onExport={handleExportResults}
                      copied={copied}
                    />
                  </div>
                  {parseYouTubeId(query.url) ? (
                    <VideoPlayer ref={playerRef} videoId={parseYouTubeId(query.url) as string} />
                  ) : null}
                  <ResultsList
                    matches={matches}
                    keyword={query.keyword}
                    youtubeId={parseYouTubeId(query.url) ?? ''}
                    onSeek={handleSeek}
                  />
                </>
              ) : phase === 'error' || phase === 'mismatch' ? (
                <ErrorView
                  message={errorText}
                  onRetry={() => void handleSubmit(query.url, query.keyword, query.language)}
                />
              ) : null}
            </div>
          </div>
        </div>
        <Features />
        <HowItWorks />
      </main>
      <SiteFooter />
    </div>
  );
}
