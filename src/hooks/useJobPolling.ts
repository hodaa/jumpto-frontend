import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError, fetchJobStatus, fetchVideoSearch } from '../api/client';
import type { SearchMatch, StatusResponse } from '../types';

// Poll cadence backs off as the job ages, so fast jobs update quickly while
// long jobs (e.g. AI transcription) don't hammer the status endpoint.
const POLL_INTERVALS_MS = [2000, 3000, 5000, 8000];
const RETRY_DELAY_MS = 250;
const MAX_CONSECUTIVE_FAILURES = 2;
const POLL_MAX_DURATION_MS = Number(import.meta.env.VITE_POLL_TIMEOUT_MS) || 5 * 60_000;

interface PollCallbacks {
  onProgress: (status: StatusResponse) => void;
  onSuccess: (matches: SearchMatch[]) => void;
  onError: (message: string) => void;
}

interface PollInput extends PollCallbacks {
  jobId: string;
  videoId: string;
  keyword: string;
  signal?: AbortSignal;
}

/** Poll a job until it reaches a terminal state, ignoring obsolete requests. */
export function useJobPolling({
  jobId,
  videoId,
  keyword,
  signal,
  onProgress,
  onSuccess,
  onError,
}: PollInput): void {
  const { t } = useTranslation();

  useEffect(() => {
    if (!jobId || signal?.aborted) return;
    const controller = new AbortController();
    let timerId: number | undefined;
    let failures = 0;
    let pollSteps = 0;
    const startedAt = Date.now();
    const cancelled = () => controller.signal.aborted || signal?.aborted;
    const cancel = () => {
      controller.abort();
      if (timerId !== undefined) window.clearTimeout(timerId);
    };
    // Cancel synchronously with the user's action, not only at effect cleanup.
    signal?.addEventListener('abort', cancel, { once: true });

    const tick = async (): Promise<void> => {
      if (cancelled()) return;
      try {
        if (Date.now() - startedAt >= POLL_MAX_DURATION_MS) {
          onError(t('error.timeout'));
          return;
        }
        const status = await fetchJobStatus(jobId, controller.signal);
        if (cancelled()) return;
        onProgress(status);
        if (status.status === 'failed') {
          onError(status.error ?? t('error.server'));
          return;
        }
        if (status.status === 'completed') {
          const video = await fetchVideoSearch(videoId, keyword, controller.signal);
          if (cancelled()) return;
          onSuccess(video.results);
          return;
        }
        failures = 0;
        if (!cancelled()) {
          pollSteps += 1;
          const interval = POLL_INTERVALS_MS[Math.min(pollSteps - 1, POLL_INTERVALS_MS.length - 1)];
          timerId = window.setTimeout(() => void tick(), interval);
        }
      } catch (error) {
        if (cancelled()) return;
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
      signal?.removeEventListener('abort', cancel);
      cancel();
    };
  }, [jobId, videoId, keyword, signal, onProgress, onSuccess, onError, t]);
}
