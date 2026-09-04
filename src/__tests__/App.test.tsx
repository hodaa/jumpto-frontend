import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { ApiError, fetchJobStatus, fetchVideoSearch, submitSearch } from '../api/client';
import type { SearchMatch } from '../types';

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
  await user.type(screen.getByLabelText('Keyword or phrase'), 'hello world');
  await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    await user.click(screen.getByRole('button', { name: 'Clear keyword' }));
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
    expect(await screen.findByText('Please enter a Video URL and a keyword.')).toBeInTheDocument();
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

  });
