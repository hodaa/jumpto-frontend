import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { ApiError, fetchJobStatus, fetchVideoSearch, submitSearch } from '../api/client';
import { clearResultsCache } from '../utils/resultsCache';
import type { SearchMatch, SearchResponse } from '../types';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    submitSearch: vi.fn(),
    fetchJobStatus: vi.fn(),
    fetchVideoSearch: vi.fn(),
  };
});

const mockSubmit = vi.mocked(submitSearch);
const mockStatus = vi.mocked(fetchJobStatus);
const mockVideoSearch = vi.mocked(fetchVideoSearch);

const URL = 'https://www.youtube.com/watch?v=abcdef12345';
const RESULTS: SearchMatch[] = [{ timestamp: '00:05', progress_seconds: 5, text_snippet: null }];

async function fillAndSubmit(): Promise<void> {
  const user = userEvent.setup();
  render(<App />);
  await user.type(screen.getByLabelText('Video URL'), URL);
  await user.type(screen.getByLabelText('Word or phrase'), 'hello world');
  await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearResultsCache();
  });

  it('shows cached results when the video is already transcribed', async () => {
    mockSubmit.mockResolvedValue({ status: 'found', results: RESULTS });
    await fillAndSubmit();
    expect(await screen.findByText('00:05')).toBeInTheDocument();
    expect(screen.getAllByText('▶')).toHaveLength(RESULTS.length);
  });

  it('disables toolbar actions and offers Clear keyword when there are no matches', async () => {
    mockSubmit.mockResolvedValue({ status: 'found', results: [] });
    await fillAndSubmit();
    expect(await screen.findByText(/No exact matches found/)).toBeInTheDocument();

    const user = userEvent.setup();
    expect(screen.getByRole('button', { name: 'Copy all' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(await screen.findByText('Ready to find your moment')).toBeInTheDocument();
  });

  it('shows the empty state for a not_found cached response instead of spinning forever', async () => {
    mockSubmit.mockResolvedValue({ status: 'not_found', results: [] });
    await fillAndSubmit();
    expect(await screen.findByText(/No exact matches found/)).toBeInTheDocument();
    expect(screen.queryByText('Transcribing video')).not.toBeInTheDocument();
  });

  it('polls the job and shows results once it completes', async () => {
    mockSubmit.mockResolvedValue({ status: 'processing', job_id: 'job-1', video_id: 'vid-1' });
    mockStatus.mockResolvedValue({
      status: 'completed',
      video_id: 'vid-1',
      progress: 100,
      results: null,
      error: null,
      video_language: null,
    });
    mockVideoSearch.mockResolvedValue({ status: 'found', results: RESULTS });

    await fillAndSubmit();
    expect(await screen.findByText('Exact match')).toBeInTheDocument();
    expect(mockVideoSearch).toHaveBeenCalledWith('vid-1', 'hello world');
  });

  it('shows the failure message reported by the job', async () => {
    mockSubmit.mockResolvedValue({ status: 'processing', job_id: 'job-1', video_id: 'vid-1' });
    mockStatus.mockResolvedValue({
      status: 'failed',
      video_id: 'vid-1',
      progress: null,
      results: null,
      error: 'Assembly API quota exceeded',
      video_language: null,
    });

    await fillAndSubmit();
    expect(await screen.findByText('Assembly API quota exceeded')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('shows a localized error when polling fails', async () => {
    mockSubmit.mockResolvedValue({ status: 'processing', job_id: 'job-1', video_id: 'vid-1' });
    mockStatus.mockRejectedValue(new ApiError('error.network'));

    await fillAndSubmit();
    expect(
      await screen.findByText('Could not reach the server. Check that the backend is running.'),
    ).toBeInTheDocument();
  });

  it('shows a validation error with retry', async () => {
    mockSubmit.mockRejectedValue(new ApiError('error.validation'));
    await fillAndSubmit();
    expect(await screen.findByText('Please enter a video URL and a word or phrase.')).toBeInTheDocument();
    const user = userEvent.setup();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(2));
  });

  it('shows a local time-based progress indicator before completion', async () => {
    mockSubmit.mockResolvedValue({ status: 'processing', job_id: 'job-1', video_id: 'vid-1' });
    mockStatus
      .mockResolvedValueOnce({
        status: 'processing',
        video_id: 'vid-1',
        progress: null,
        results: null,
        error: null,
        video_language: null,
      })
      .mockResolvedValueOnce({
        status: 'completed',
        video_id: 'vid-1',
        progress: null,
        results: null,
        error: null,
        video_language: null,
      });
    mockVideoSearch.mockResolvedValue({ status: 'found', results: RESULTS });

    await fillAndSubmit();
    expect(await screen.findByText('Transcribing video')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('00:05')).toBeInTheDocument(), { timeout: 5000 });
  });

  it('starts counting progress the moment Jump is clicked, before the request resolves', async () => {
    mockSubmit.mockImplementation(() => new Promise<SearchResponse>(() => {}));

    await fillAndSubmit();

    expect(await screen.findByRole('progressbar')).toHaveAttribute('aria-valuenow', '10');
    expect(screen.getByText('Transcribing video')).toBeInTheDocument();
  });

  it('serves repeat searches for the same video/keyword from the in-memory cache', async () => {
    mockSubmit.mockResolvedValue({ status: 'found', results: RESULTS });
    await fillAndSubmit();
    await screen.findByText('00:05');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(await screen.findByText('00:05')).toBeInTheDocument();
    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });

  it('uses the real progress reported by the backend while processing', async () => {
    mockSubmit.mockResolvedValue({ status: 'processing', job_id: 'job-1', video_id: 'vid-1' });
    mockStatus.mockResolvedValue({
      status: 'processing',
      video_id: 'vid-1',
      progress: 10,
      results: null,
      error: null,
      video_language: null,
    });

    await fillAndSubmit();
    const bar = await screen.findByRole('progressbar');
    await waitFor(() =>
      expect(Number(bar.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(10),
    );
  });

  it('shows an estimated wait derived from backend progress', async () => {
    mockSubmit.mockResolvedValue({ status: 'processing', job_id: 'job-1', video_id: 'vid-1' });
    mockStatus.mockResolvedValue({
      status: 'processing',
      video_id: 'vid-1',
      progress: 10,
      results: null,
      error: null,
      video_language: null,
    });

    await fillAndSubmit();
    expect(await screen.findByText(/Estimated time remaining/)).toBeInTheDocument();
  });

  it('prefers a server-provided estimated time over the computed estimate', async () => {
    mockSubmit.mockResolvedValue({ status: 'processing', job_id: 'job-1', video_id: 'vid-1' });
    mockStatus.mockResolvedValue({
      status: 'processing',
      video_id: 'vid-1',
      progress: 10,
      results: null,
      error: null,
      video_language: null,
      estimatedTimeSeconds: 42,
    });

    await fillAndSubmit();
    expect(await screen.findByText('Estimated time remaining: ~42s')).toBeInTheDocument();
  });

  it('cancels an in-progress search and returns to the idle state', async () => {
    mockSubmit.mockImplementation(() => new Promise<SearchResponse>(() => {}));

    await fillAndSubmit();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Cancel search' }));
    expect(await screen.findByText('Ready to find your moment')).toBeInTheDocument();
  });

  it('copies all results to the clipboard', async () => {
    mockSubmit.mockResolvedValue({ status: 'found', results: RESULTS });

    await fillAndSubmit();
    await screen.findByText('00:05');

    const user = userEvent.setup();

    // userEvent.setup() installs a navigator.clipboard getter stub, so we
    // must define our mock AFTER setup has run.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    await user.click(screen.getByRole('button', { name: 'Copy all' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeInTheDocument();
  });

  it('reports a copy failure when the clipboard write rejects', async () => {
    mockSubmit.mockResolvedValue({ status: 'found', results: RESULTS });

    await fillAndSubmit();
    await screen.findByText('00:05');

    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    await user.click(screen.getByRole('button', { name: 'Copy all' }));
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(
      'Could not copy results to the clipboard. Please try again.',
    );
    expect(screen.queryByRole('button', { name: 'Copied!' })).not.toBeInTheDocument();
  });

  it('starts a new search from the results toolbar', async () => {
    mockSubmit.mockResolvedValue({ status: 'found', results: RESULTS });

    await fillAndSubmit();
    await screen.findByText('00:05');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'New search' }));
    expect(await screen.findByText('Ready to find your moment')).toBeInTheDocument();
  });
});
