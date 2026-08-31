import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError, fetchJobStatus, fetchVideoSearch } from '../api/client';
import type { SearchLanguage, SearchMatch } from '../types';

const POLL_INTERVAL_MS = 2000;

interface PollCallbacks {
  onProgress: (progress: number | null) => void;
  onSuccess: (matches: SearchMatch[]) => void;
  onError: (message: string) => void;
  onMismatch: (message: string) => void;
}

interface PollInput extends PollCallbacks {
  jobId: string;
  videoId: string;
  keyword: string;
  language: SearchLanguage;
}

/** Poll a job until it reaches a terminal state, then fetch its results. */
export function useJobPolling({
  jobId,
  videoId,
  keyword,
  language,
  onProgress,
  onSuccess,
  onError,
  onMismatch,
}: PollInput): void {
  const { t } = useTranslation();
  const handle = useCallback(async (): Promise<boolean> => {
    const status = await fetchJobStatus(jobId);
    if (status.status === 'pending' || status.status === 'processing') {
      onProgress(status.progress);
      return true;
    }
    if (status.status === 'failed') {
      onError(status.error ?? t('error.server'));
      return false;
    }
    const video = await fetchVideoSearch(videoId, keyword, language);
    if (video.status === 'language_mismatch') {
      onMismatch(t('mismatch.message'));
    } else {
      onSuccess(video.results);
    }
    return false;
  }, [jobId, videoId, keyword, language, onError, onMismatch, onProgress, onSuccess, t]);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let timerId: number | undefined;

    const tick = async (): Promise<void> => {
      try {
        const keepPolling = await handle();
        if (keepPolling && !cancelled) {
          timerId = window.setTimeout(() => void tick(), POLL_INTERVAL_MS);
        }
      } catch (error) {
        if (!cancelled) {
          onError(error instanceof ApiError ? error.messageKey : t('error.server'));
        }
      }
    };

    void tick();

    return () => {
      cancelled = true;
      if (timerId !== undefined) window.clearTimeout(timerId);
    };
  }, [handle, jobId, onError, t]);

  return undefined;
}
