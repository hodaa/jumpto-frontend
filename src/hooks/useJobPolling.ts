import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError, fetchJobStatus, fetchVideoSearch } from '../api/client';
import type { SearchMatch } from '../types';

const POLL_INTERVAL_MS = 2000;
const RETRY_DELAY_MS = 250;
const MAX_CONSECUTIVE_FAILURES = 2;
const POLL_MAX_DURATION_MS =
  Number(import.meta.env.VITE_POLL_TIMEOUT_MS) || 5 * 60_000;

interface PollCallbacks {
  onSuccess: (matches: SearchMatch[]) => void;
  onError: (message: string) => void;
}

interface PollInput extends PollCallbacks {
  jobId: string;
  videoId: string;
  keyword: string;
}

/** Poll a job until it reaches a terminal state, then fetch its results. */
export function useJobPolling({
  jobId,
  videoId,
  keyword,
  onSuccess,
  onError,
}: PollInput): void {
  const { t } = useTranslation();
  const handle = useCallback(async (): Promise<boolean> => {
    const status = await fetchJobStatus(jobId);
    if (status.status === 'pending' || status.status === 'processing') {
      return true;
    }
    if (status.status === 'failed') {
      onError(status.error ?? t('error.server'));
      return false;
    }
    const video = await fetchVideoSearch(videoId, keyword);
    onSuccess(video.results);
    return false;
  }, [jobId, videoId, keyword, onError, onSuccess, t]);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let timerId: number | undefined;
    let failures = 0;
    const startedAt = Date.now();

    const tick = async (): Promise<void> => {
      try {
        if (Date.now() - startedAt >= POLL_MAX_DURATION_MS) {
          onError(t('error.timeout'));
          return;
        }
        const keepPolling = await handle();
        failures = 0;
        if (keepPolling && !cancelled) {
          timerId = window.setTimeout(() => void tick(), POLL_INTERVAL_MS);
        }
      } catch (error) {
        if (cancelled) return;
        failures += 1;
        if (failures > MAX_CONSECUTIVE_FAILURES) {
          onError(error instanceof ApiError ? error.messageKey : t('error.server'));
        } else {
          timerId = window.setTimeout(() => void tick(), RETRY_DELAY_MS);
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