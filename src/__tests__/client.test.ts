import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, fetchJobStatus, fetchVideoSearch, submitSearch } from '../api/client';

const { postMock, getMock, createMock } = vi.hoisted(() => {
  const postMock = vi.fn();
  const getMock = vi.fn();
  const createMock = vi.fn(() => ({ post: postMock, get: getMock }));
  return { postMock, getMock, createMock };
});

vi.mock('axios', () => ({ default: { create: createMock } }));

describe('api client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts a search request and returns data', async () => {
    postMock.mockResolvedValue({ data: { status: 'found', results: [] } });
    const result = await submitSearch('https://www.youtube.com/watch?v=abcdef12345', 'hello', 'en');
    expect(postMock).toHaveBeenCalledWith('/api/search', {
      youtube_url: 'https://www.youtube.com/watch?v=abcdef12345',
      keyword: 'hello',
      language: 'en',
    });
    expect(result).toEqual({ status: 'found', results: [] });
  });

  it('maps a 400 to an invalid-url error', async () => {
    postMock.mockRejectedValue({
      response: { status: 400, data: { error: { message: 'bad url' } } },
    });
    await expect(submitSearch('x', 'y', 'en')).rejects.toMatchObject({
      messageKey: 'error.invalidUrl',
      serverMessage: 'bad url',
    });
  });

  it('maps a 422 to a validation error', async () => {
    postMock.mockRejectedValue({ response: { status: 422, data: { detail: [] } } });
    await expect(
      submitSearch('https://www.youtube.com/watch?v=abcdef12345', '', 'en'),
    ).rejects.toMatchObject({ messageKey: 'error.validation' });
  });

  it('maps a request without a response to a network error', async () => {
    postMock.mockRejectedValue({ request: {} });
    await expect(
      submitSearch('https://www.youtube.com/watch?v=abcdef12345', 'x', 'en'),
    ).rejects.toMatchObject({ messageKey: 'error.network' });
  });

  it('maps any other status to a generic server error', async () => {
    postMock.mockRejectedValue({ response: { status: 500, data: {} } });
    await expect(
      submitSearch('https://www.youtube.com/watch?v=abcdef12345', 'x', 'en'),
    ).rejects.toMatchObject({ messageKey: 'error.server' });
  });

  it('maps an unknown error to a generic server error', async () => {
    postMock.mockRejectedValue(new Error('boom'));
    await expect(
      submitSearch('https://www.youtube.com/watch?v=abcdef12345', 'x', 'en'),
    ).rejects.toMatchObject({ messageKey: 'error.server' });
  });

  it('fetches job status', async () => {
    getMock.mockResolvedValue({
      data: { status: 'processing', video_id: 'v', progress: 10, results: null, error: null },
    });
    const result = await fetchJobStatus('job-1');
    expect(getMock).toHaveBeenCalledWith('/api/status/job-1');
    expect(result).toMatchObject({ status: 'processing' });
  });

  it('fetches video search results with keyword param', async () => {
    getMock.mockResolvedValue({ data: { status: 'found', results: [] } });
    const result = await fetchVideoSearch('vid-1', 'hello', 'en');
    expect(getMock).toHaveBeenCalledWith('/api/video/vid-1/search', {
      params: { keyword: 'hello', language: 'en' },
    });
    expect(result).toEqual({ status: 'found', results: [] });
  });

  it('exposes ApiError instances with server messages', () => {
    const err = new ApiError('error.server', 'server said no');
    expect(err.messageKey).toBe('error.server');
    expect(err.serverMessage).toBe('server said no');
  });
});
