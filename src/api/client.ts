import type { SearchResponse, StatusResponse, VideoSearchResponse } from '../types';

/** Error whose message can be shown to the user. */
export class ApiError extends Error {
  messageKey: string;
  serverMessage?: string;

  constructor(messageKey: string, serverMessage?: string) {
    super(messageKey);
    this.name = 'ApiError';
    this.messageKey = messageKey;
    this.serverMessage = serverMessage;
  }
}

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
const TIMEOUT_MS = 30_000;

interface ErrorPayload {
  error?: { message?: string };
  detail?: unknown;
}

/** Map an HTTP status (null = no response) to the matching localized error key. */
function toApiError(status: number | null, serverMessage?: string): ApiError {
  if (status === 400) return new ApiError('error.invalidUrl', serverMessage);
  if (status === 404) return new ApiError('error.jobGone', serverMessage);
  if (status === 422) return new ApiError('error.validation', serverMessage);
  if (status === null) return new ApiError('error.network');
  return new ApiError('error.server', serverMessage);
}

/**
 * Minimal fetch wrapper with a 30s timeout and user-signal cancellation,
 * replacing the (much heavier) axios dependency. Error mapping mirrors the
 * previous axios behaviour: HTTP status decides the kind of error, a network
 * failure (or timeout) surfaces as `error.network`, and a user-initiated
 * abort rethrows so callers' `signal.aborted` checks short-circuit cleanly.
 */
async function request<T>(
  path: string,
  options: { method?: string; json?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const { method, json, signal } = options;
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);
  const propagateAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', propagateAbort, { once: true });
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: method ?? (json !== undefined ? 'POST' : 'GET'),
      // The server expects JSON when a body is sent; plain GETs carry no body.
      headers: json !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: json !== undefined ? JSON.stringify(json) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    // A user-initiated abort must propagate so callers can act on signal.aborted.
    if (
      error instanceof DOMException &&
      error.name === 'AbortError' &&
      !timedOut &&
      signal?.aborted
    ) {
      throw error;
    }
    // Anything else — a network failure or the 30s timeout — is a connectivity issue.
    throw toApiError(null);
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener('abort', propagateAbort);
  }

  if (!res.ok) {
    let serverMessage: string | undefined;
    try {
      const data = (await res.json()) as ErrorPayload;
      serverMessage = data?.error?.message;
    } catch {
      // Non-JSON error body — fall back to the status-only mapping.
    }
    throw toApiError(res.status, serverMessage);
  }
  return (await res.json()) as T;
}

/** Submit a search; resolves to found results or a created job. */
export function submitSearch(
  youtubeUrl: string,
  keyword: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  return request<SearchResponse>('/api/search', {
    method: 'POST',
    json: { youtube_url: youtubeUrl, keyword },
    signal,
  });
}

/** Fetch the current status of a transcription job. */
export function fetchJobStatus(jobId: string, signal?: AbortSignal): Promise<StatusResponse> {
  return request<StatusResponse>(`/api/status/${jobId}`, { signal });
}

/** Fetch cached search results for a transcribed video. */
export function fetchVideoSearch(
  videoId: string,
  keyword: string,
  signal?: AbortSignal,
): Promise<VideoSearchResponse> {
  return request<VideoSearchResponse>(
    `/api/video/${videoId}/search?keyword=${encodeURIComponent(keyword)}`,
    { signal },
  );
}
