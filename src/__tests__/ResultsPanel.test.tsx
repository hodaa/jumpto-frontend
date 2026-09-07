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
    expect(screen.getByText('Fetching transcript…')).toBeInTheDocument();
    expect(screen.getByText('Finding timestamps…')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
    const card = screen.getByRole('region', { name: 'Transcribing video' });
    expect(card).toHaveClass('border-slate-200');
    expect(card).not.toHaveClass('border-accent', 'border-dashed');
  });

  it('replaces the bare idle box with a labelled mock preview of the results', () => {
    const { container } = render(<ResultsPanel {...baseProps} phase="idle" />);
    expect(screen.getByText('Ready to find your moment')).toBeInTheDocument();
    expect(screen.getByText('Your matches will appear here after you search.')).toBeInTheDocument();
    const card = screen.getByRole('region', { name: 'Ready to find your moment' });
    expect(card).toHaveClass('border-dashed', 'border-accent');
    expect(card).not.toHaveClass('border-slate-200');

    // Preview: a faux player frame plus timestamped skeleton rows.
    expect(container.querySelector('.aspect-video')).toBeInTheDocument();
    expect(screen.getAllByText('04:12').length).toBeGreaterThanOrEqual(2);
    expect(container.querySelectorAll('li')).toHaveLength(3);
    // A visible caption keeps the fake rows from being read as real results.
    expect(
      screen.getByText('Illustrative preview of what a search returns'),
    ).toBeInTheDocument();

    // The mock is decorative: it must not be announced by assistive tech.
    const mock = screen.getAllByText('04:12')[0].closest('[aria-hidden="true"]');
    expect(mock).toBeInTheDocument();
  });

  it('renders matches when done', () => {
    render(<ResultsPanel {...baseProps} phase="done" />);
    expect(screen.getByText('00:05')).toBeInTheDocument();
    const watch = screen.getByRole('link', { name: 'Watch on YouTube at 00:05 (opens in a new tab)' });
    expect(watch).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abcdef12345&t=5');
  });

  it('renders the keyword inside the title without leaking [object Object]', () => {
    render(<ResultsPanel {...baseProps} phase="done" />);
    expect(screen.getByRole('heading', { name: 'Matches for “hello”' })).toBeInTheDocument();
    expect(screen.queryByText(/object Object/)).not.toBeInTheDocument();
  });

  it('shows an error view with retry', async () => {
    const user = userEvent.setup();
    render(<ResultsPanel {...baseProps} phase="error" errorText="error.network" />);
    expect(
      screen.getByText('Could not connect. Check your internet connection and try again. If it continues, please try later.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(baseProps.onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('accessible results and announcements', () => {
  it('names the card from its actual heading and gives the list a plain-text name', () => {
    render(<ResultsPanel {...baseProps} phase="done" youtubeId={null} />);
    const heading = screen.getByRole('heading', { name: 'Matches for “hello”' });
    const card = screen.getByRole('region', { name: 'Matches for “hello”' });
    expect(card).toHaveAttribute('aria-labelledby', heading.id);
    expect(screen.getByRole('region', { name: 'Matching moments for “hello”' })).toBeInTheDocument();
    for (const region of screen.getAllByRole('region')) {
      expect(region.getAttribute('aria-label') ?? '').not.toContain('<keyword>');
    }
    expect(heading.querySelector('bdi')).toHaveAttribute('dir', 'auto');
  });

  it('announces stage changes and outcomes once, without repeating percentages or ETA ticks', () => {
    const { rerender, container } = render(<ResultsPanel {...baseProps} phase="idle" />);
    const live = screen.getByRole('status', { name: 'Search status' });
    expect(live).toBeEmptyDOMElement();
    rerender(<ResultsPanel {...baseProps} phase="processing" progress={10} estimatedSeconds={100} />);
    expect(live).toHaveTextContent('Search started. Fetching the transcript.');
    rerender(<ResultsPanel {...baseProps} phase="processing" progress={40} estimatedSeconds={60} />);
    expect(live).toHaveTextContent('Search started. Fetching the transcript.');
    expect(live).not.toHaveTextContent('%');
    expect(container.querySelector('[aria-busy="true"] [aria-live]')).toBeNull();
    expect(screen.getAllByRole('status')).toHaveLength(1);
    rerender(<ResultsPanel {...baseProps} phase="processing" progress={50} />);
    expect(live).toHaveTextContent('Finding matching timestamps.');
    rerender(<ResultsPanel {...baseProps} phase="done" youtubeId={null} />);
    expect(live).toHaveTextContent('Search complete: 1 match.');
    expect(screen.getByRole('status', { name: 'Search status' })).toBe(live);
  });

  it('uses a concise failure announcement rather than a live copy of the entire error card', () => {
    render(<ResultsPanel {...baseProps} phase="error" errorText="error.network" />);
    expect(screen.getByRole('status', { name: 'Search status' })).toHaveTextContent('The search couldn’t finish. Your inputs have been kept.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveAccessibleDescription(
      'Try again uses the URL and phrase currently shown in the form.',
    );
  });
});
