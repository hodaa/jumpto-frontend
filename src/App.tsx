import { useCallback, useRef, useState } from 'react';
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
import type { SearchLanguage, SearchMatch } from './types';
import { parseYouTubeId } from './utils/youtube';

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

/** JumpTo app: centered landing when idle, full-width results panel once a search runs. */
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
  const [formKey, setFormKey] = useState(0);

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
        if (response.status === 'found' || response.status === 'not_found') {
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

  const handleClear = useCallback(() => {
    setPhase('idle');
    setMatches([]);
    setProgress(null);
    setErrorText('');
    setJob(null);
    setQuery({ url: '', keyword: '', language: 'en' });
    setCopied(false);
    setFormKey((k) => k + 1);
  }, []);

  const handleRetry = useCallback(
    () => void handleSubmit(query.url, query.keyword, query.language),
    [handleSubmit, query],
  );

  const searching = phase === 'processing';

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <SiteHeader />
      <main className="app-main" id="main-content">
        <Hero />
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <SearchForm
              key={formKey}
              onSubmit={handleSubmit}
              disabled={searching}
              initialUrl={query.url}
              initialKeyword={query.keyword}
            />
          </div>
          <div className="lg:col-span-7">
            <ResultsPanel
              phase={phase}
              progress={progress}
              matches={matches}
              errorText={errorText}
              keyword={query.keyword}
              youtubeId={parseYouTubeId(query.url) ?? null}
              copied={copied}
              playerRef={playerRef}
              onCopy={() => void handleCopyResults()}
              onExport={handleExportResults}
              onSeek={handleSeek}
              onClear={handleClear}
              onRetry={handleRetry}
            />
          </div>
        </div>
        <HowItWorks />
        <Features />
      </main>
      <SiteFooter />
    </div>
  );
}
