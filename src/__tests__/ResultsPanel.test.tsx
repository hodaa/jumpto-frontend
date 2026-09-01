import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ResultsPanel } from '../components/ResultsPanel';
import type { SearchMatch } from '../types';

const RESULTS: SearchMatch[] = [{ timestamp: '00:05', progress_seconds: 5, text_snippet: null }];

const baseProps = {
  progress: 40,
  matches: RESULTS,
  errorText: '',
  keyword: 'hello',
  youtubeId: 'abcdef12345',
  copied: false,
  playerRef: { current: null },
  onCopy: vi.fn(),
  onExport: vi.fn(),
  onSeek: vi.fn(),
  onClear: vi.fn(),
  onRetry: vi.fn(),
};

describe('ResultsPanel', () => {
  it('renders the status stepper while processing', () => {
    render(<ResultsPanel {...baseProps} phase="processing" />);
    expect(screen.getByText('Fetching transcript...')).toBeInTheDocument();
    expect(screen.getByText('Finding timestamps...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
  });

  it('renders matches when done', () => {
    render(<ResultsPanel {...baseProps} phase="done" />);
    expect(screen.getByText('00:05')).toBeInTheDocument();
  });

  it('renders the keyword inside the title without leaking [object Object]', () => {
    render(<ResultsPanel {...baseProps} phase="done" />);
    expect(screen.getByRole('heading', { name: 'Matches for "hello"' })).toBeInTheDocument();
    expect(screen.queryByText(/object Object/)).not.toBeInTheDocument();
  });

  it('shows an error view with retry', async () => {
    const user = userEvent.setup();
    render(<ResultsPanel {...baseProps} phase="error" errorText="error.network" />);
    expect(
      screen.getByText('Could not reach the server. Check that the backend is running.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(baseProps.onRetry).toHaveBeenCalledTimes(1);
  });
});
