import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, fetchJobStatus, fetchVideoSearch, submitSearch } from '../api/client';

function jsonResponse(data: unknown, status = 200, ok = true): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
  } as unknown as Response;
}

/** The prefix the client applies from VITE_API_BASE_URL before the /api path. */
function pathOf(call: [string, RequestInit]): string {
  const url = call[0];
  const apiIndex = url.indexOf('/api');
  return apiIndex === -1 ? url : url.slice(apiIndex);
}

describe('api client', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  it('posts a search request and returns data', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 'found', results: [] }));
    const result = await submitSearch('https://www.youtube.com/watch?v=abcdef12345', 'hello');
    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(pathOf(call)).toBe('/api/search');
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body as string)).toEqual({
      youtube_url: 'https://www.youtube.com/watch?v=abcdef12345',
      keyword: 'hello',
    });
    expect(call[1].headers).toEqual({ 'Content-Type': 'application/json' });
    expect(result).toEqual({ status: 'found', results: [] });
  });

  it('maps a 400 to an invalid-url error', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { message: 'bad url' } }, 400, false),
    );
    await expect(submitSearch('x', 'y')).rejects.toMatchObject({
      messageKey: 'error.invalidUrl',
      serverMessage: 'bad url',
    });
  });

  it('maps a 422 to a validation error', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: [] }, 422, false));
    await expect(
      submitSearch('https://www.youtube.com/watch?v=abcdef12345', ''),
    ).rejects.toMatchObject({ messageKey: 'error.validation' });
  });

  it('maps a network failure to a network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(
      submitSearch('https://www.youtube.com/watch?v=abcdef12345', 'x'),
    ).rejects.toMatchObject({ messageKey: 'error.network' });
  });

  it('maps any other status to a generic server error', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500, false));
    await expect(
      submitSearch('https://www.youtube.com/watch?v=abcdef12345', 'x'),
    ).rejects.toMatchObject({ messageKey: 'error.server' });
  });

  it('fetches job status', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        status: 'processing',
        video_id: 'v',
        progress: 10,
        results: null,
        error: null,
        video_language: null,
      }),
    );
    const result = await fetchJobStatus('job-1');
    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(pathOf(call)).toBe('/api/status/job-1');
    expect(result).toMatchObject({ status: 'processing' });
  });

  it('fetches video search results with keyword param', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 'found', results: [] }));
    const result = await fetchVideoSearch('vid-1', 'hello');
    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(pathOf(call)).toBe('/api/video/vid-1/search?keyword=hello');
    expect(result).toEqual({ status: 'found', results: [] });
  });

  it('forwards cancellation signals through all three calls', async () => {
    const { signal } = new AbortController();
    fetchMock.mockResolvedValue(jsonResponse({ status: 'not_found', results: [] }));
    await submitSearch('https://youtu.be/abcdef12345', 'hello', signal);
    await fetchJobStatus('job-1', signal);
    await fetchVideoSearch('vid-1', 'hello', signal);
    for (const call of fetchMock.mock.calls as [string, RequestInit][]) {
      expect(call[1].signal).toBeDefined();
      expect(call[1].signal).not.toBe(signal);
    }
  });

  it('rethrows a user-initiated abort so callers can short-circuit', async () => {
    fetchMock.mockRejectedValue(new DOMException('Aborted', 'AbortError'));
    const controller = new AbortController();
    controller.abort();
    await expect(
      submitSearch('https://youtu.be/abcdef12345', 'hello', controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('maps a timeout to a network error', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          (init.signal as AbortSignal).addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    // Attach the rejection handler up front so advancing the timer can't
    // produce an unhandled rejection.
    const pending = submitSearch('https://youtu.be/abcdef12345', 'hello');
    const result = pending.then(
      () => {
        throw new Error('timeout test should not resolve');
      },
      (error: unknown) => error,
    );
    await vi.advanceTimersByTimeAsync(31_000);
    expect(await result).toMatchObject({ messageKey: 'error.network' });
    vi.useRealTimers();
  });

  it('exposes ApiError instances with server messages', () => {
    const err = new ApiError('error.server', 'server said no');
    expect(err.messageKey).toBe('error.server');
    expect(err.serverMessage).toBe('server said no');
  });
});
