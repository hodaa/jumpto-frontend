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
    expect(screen.getByText('Illustrative preview of what a search returns')).toBeInTheDocument();

    // The mock is decorative: it must not be announced by assistive tech.
    const mock = screen.getAllByText('04:12')[0].closest('[aria-hidden="true"]');
    expect(mock).toBeInTheDocument();
  });

  it('renders matches when done', () => {
    render(<ResultsPanel {...baseProps} phase="done" />);
    expect(screen.getByText('00:05')).toBeInTheDocument();
    const watch = screen.getByRole('link', {
      name: 'Watch on YouTube at 00:05 (opens in a new tab)',
    });
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
      screen.getByText(
        'Could not connect. Check your internet connection and try again. If it continues, please try later.',
      ),
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
    expect(
      screen.getByRole('region', { name: 'Matching moments for “hello”' }),
    ).toBeInTheDocument();
    for (const region of screen.getAllByRole('region')) {
      expect(region.getAttribute('aria-label') ?? '').not.toContain('<keyword>');
    }
    expect(heading.querySelector('bdi')).toHaveAttribute('dir', 'auto');
  });

  it('announces stage changes and outcomes once, without repeating percentages or ETA ticks', () => {
    const { rerender, container } = render(<ResultsPanel {...baseProps} phase="idle" />);
    const live = screen.getByRole('status');
    expect(live).toBeEmptyDOMElement();
    expect(live).not.toHaveAttribute('aria-label');
    rerender(<ResultsPanel {...baseProps} phase="processing" progress={10} />);
    expect(live).toHaveTextContent('Search started. Fetching the transcript.');
    rerender(<ResultsPanel {...baseProps} phase="processing" progress={40} />);
    expect(live).toHaveTextContent('Search started. Fetching the transcript.');
    expect(live).not.toHaveTextContent('%');
    expect(container.querySelector('[aria-busy="true"] [aria-live]')).toBeNull();
    expect(screen.getAllByRole('status')).toHaveLength(1);
    rerender(<ResultsPanel {...baseProps} phase="processing" progress={50} />);
    expect(live).toHaveTextContent('Finding matching timestamps.');
    rerender(<ResultsPanel {...baseProps} phase="done" youtubeId={null} />);
    expect(live).toHaveTextContent('Search complete: 1 match.');
    // The live region stays unnamed: naming it can suppress content announcements in NVDA/JAWS.
    expect(live).not.toHaveAttribute('aria-label');
  });

  it('uses a concise failure announcement rather than a live copy of the entire error card', () => {
    render(<ResultsPanel {...baseProps} phase="error" errorText="error.network" />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'The search couldn’t finish. Your inputs have been kept.',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveAccessibleDescription(
      'Try again uses the URL and phrase currently shown in the form.',
    );
  });
});

describe('ResultsPanel replaying a saved search', () => {
  const THREE = [
    { timestamp: '00:30', progress_seconds: 30, text_snippet: 'first sighting' },
    { timestamp: '02:00', progress_seconds: 120, text_snippet: 'second sighting' },
    { timestamp: '05:00', progress_seconds: 300, text_snippet: 'third sighting' },
  ];

  const shared = {
    phase: 'done' as const,
    sharedSeconds: 120,
    sharedKeyword: 'sighting',
    matches: [],
  };

  it('lists every saved match rather than the one it opens on', () => {
    render(<ResultsPanel {...baseProps} {...shared} sharedMatches={THREE} youtubeId={null} />);

    // The stored result set, all three of it. Trimming to the moment the player
    // opens on would make a keyword that occurs all over a video look like it
    // occurred once.
    expect(screen.getByRole('button', { name: /Play at 00:30/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Play at 02:00/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Play at 05:00/i })).toBeInTheDocument();
  });

  it('marks only the moment the player is parked on as current', () => {
    render(<ResultsPanel {...baseProps} {...shared} sharedMatches={THREE} youtubeId={null} />);

    // aria-current is the screen-reader half of the accent ring: without it the
    // list reads as three undifferentiated matches with no indication of where
    // the video actually is.
    expect(screen.getByRole('button', { name: /Play at 02:00/i })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(screen.getByRole('button', { name: /Play at 00:30/i })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('shows one row for a bare moment link that knows of nothing else', () => {
    // ?v=&t= carries a second and nothing else. The single row is the honest
    // rendering of that, and must not be mistaken for a one-result search.
    render(<ResultsPanel {...baseProps} {...shared} sharedMatches={null} youtubeId={null} />);

    expect(screen.getByRole('button', { name: /Play at 02:00/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Play at 00:30/i })).not.toBeInTheDocument();
  });

  it('names a bare moment link\u2019s row instead of labelling it with an empty phrase', () => {
    // ?v=&t= with no history entry carries no keyword. ResultsList names the list
    // after the keyword it is given, so an empty one leaves a label reading
    // "Matching moments for \u201C\u201D" \u2014 strictly worse than naming the moment itself.
    render(
      <ResultsPanel
        {...baseProps}
        phase="done"
        keyword=""
        matches={[]}
        sharedSeconds={754}
        sharedKeyword={null}
        sharedMatches={null}
        youtubeId={null}
      />,
    );

    expect(screen.getByRole('region', { name: 'The saved moment' })).toBeInTheDocument();
  });

  it('lays a replayed result out exactly as a fresh search result is laid out', () => {
    // The rows decide row-vs-column with a container query against the wrapper
    // ResultsList puts around them. Rendering the replay with its own markup left
    // that wrapper out, and every replayed match pushed its share and YouTube
    // buttons onto a second line while the search it replays kept them inline.
    const listOf = (element: HTMLElement) => element.querySelector('ol')!.closest('section')!;
    const rowsOf = (element: HTMLElement) => element.querySelectorAll<HTMLElement>('ol > li > div');

    const replayed = render(
      <ResultsPanel
        {...baseProps}
        phase="done"
        keyword="sighting"
        matches={[]}
        sharedSeconds={30}
        sharedKeyword="sighting"
        sharedMatches={THREE}
        youtubeId="abcdef12345"
      />,
    );
    const searched = render(
      <ResultsPanel {...baseProps} phase="done" matches={THREE} youtubeId="abcdef12345" />,
    );

    // Same list wrapper, same row markup, same inline action buttons: the replay is
    // the search, re-shown.
    expect(listOf(replayed.container).className).toBe(listOf(searched.container).className);
    expect(listOf(replayed.container).tagName).toBe(listOf(searched.container).tagName);
    expect(rowsOf(replayed.container)[0].className).toBe(rowsOf(searched.container)[0].className);
    expect(replayed.container.querySelectorAll('[aria-label^="Share"]').length).toBe(
      searched.container.querySelectorAll('[aria-label^="Share"]').length,
    );
    expect(replayed.container.querySelectorAll('[aria-label^="Watch"]').length).toBe(
      searched.container.querySelectorAll('[aria-label^="Watch"]').length,
    );
  });

  it('shows the original empty result for a saved search that found nothing', () => {
    render(
      <ResultsPanel
        {...baseProps}
        {...shared}
        sharedMatches={[]}
        sharedMatched={false}
        youtubeId={null}
      />,
    );

    // Not a moment panel with a row in it. This search matched nothing, and the
    // replay has to say that with the same copy a live no-match search uses.
    expect(
      screen.getByText('No exact matches found. Try a different word or phrase.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Play at/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Saved moment/i)).not.toBeInTheDocument();
  });
});
