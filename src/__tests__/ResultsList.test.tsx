import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ResultsList } from '../components/ResultsList';
import { setLanguage } from '../i18n';
import { formatYouTubeTime } from '../utils/youtube';

const matches = [
  { timestamp: '00:03', progress_seconds: 3, text_snippet: 'hello world here' },
  { timestamp: '01:15', progress_seconds: 75, text_snippet: null },
];

describe('ResultsList', () => {
  it('renders match count and formatted player-style timestamps', () => {
    render(<ResultsList matches={matches} keyword="hello world" onSeek={vi.fn()} />);
    expect(screen.getByText('2 matches')).toBeInTheDocument();
    expect(screen.getByText('00:03')).toBeInTheDocument();
    expect(screen.getByText('01:15')).toBeInTheDocument();
    expect(screen.getByText('Exact match')).toBeInTheDocument();
  });

  it('highlights the searched keyword inside the snippet', () => {
    render(<ResultsList matches={matches} keyword="hello world" onSeek={vi.fn()} />);
    const mark = screen.getByText('hello world', { selector: 'mark' });
    expect(mark).toBeInTheDocument();
    expect(mark).toHaveTextContent('hello world');
  });

  it('formats long durations to YouTube player HH:MM:SS format', () => {
    const long = [{ timestamp: '6943', progress_seconds: 6943, text_snippet: null }];
    render(<ResultsList matches={long} keyword="x" onSeek={vi.fn()} />);
    expect(screen.getByText('1:55:43')).toBeInTheDocument();
  });

  it('renders an Arabic snippet inside an RTL container', () => {
    const arabic = [
      {
        timestamp: '00:01',
        progress_seconds: 1,
        text_snippet: 'الله يحب المتقين في كل مكان',
      },
    ];
    const { container } = render(<ResultsList matches={arabic} keyword="الله" onSeek={vi.fn()} />);
    const snippet = container.querySelector('.match-card__snippet');
    expect(snippet).toHaveAttribute('dir', 'auto');
  });

  it('calls onSeek with the right second when a match is clicked', async () => {
    const user = userEvent.setup();
    const onSeek = vi.fn();
    render(<ResultsList matches={matches} keyword="hello world" onSeek={onSeek} />);
    await user.click(screen.getByText('01:15'));
    expect(onSeek).toHaveBeenCalledWith(75);
  });

  it('keeps match rows clean with a prominent play button and no external link', () => {
    render(<ResultsList matches={matches} keyword="hello world" onSeek={vi.fn()} />);
    const playIcons = screen.getAllByText('▶');
    expect(playIcons).toHaveLength(2);
    expect(screen.queryByRole('link', { name: /Watch on YouTube at/ })).not.toBeInTheDocument();
  });

  it('opens each match on YouTube at its timestamp when a video id is known', () => {
    render(<ResultsList matches={matches} keyword="hello world" onSeek={vi.fn()} youtubeId="abc123" />);
    const watch = screen.getAllByRole('link', { name: /Watch on YouTube at/ });
    expect(watch).toHaveLength(2);
    expect(watch[0]).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abc123&t=3');
    expect(watch[0]).toHaveAttribute('target', '_blank');
    expect(watch[1]).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abc123&t=75');
  });

  it('caps the visible matches and reveals more on demand', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 3 }, (_, i) => ({
      timestamp: `00:0${i}`,
      progress_seconds: i,
      text_snippet: `match ${i}`,
    }));
    render(<ResultsList matches={many} keyword="match" onSeek={vi.fn()} matchLimit={2} />);
    expect(screen.getByRole('button', { name: 'Show 1 more match' })).toBeInTheDocument();
    expect(screen.queryByText('match 2')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show 1 more match' }));
    expect(screen.getByRole('button', { name: 'Play at 00:02 — match 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show fewer matches' })).toBeInTheDocument();
  });

  it('shows an empty state when there are no matches', () => {
    render(<ResultsList matches={[]} keyword="zzz" onSeek={vi.fn()} />);
    expect(screen.getByText('No exact matches found. Try a different word or phrase.')).toBeInTheDocument();
  });
});

describe('formatYouTubeTime', () => {
  it('formats zero and small values as MM:SS', () => {
    expect(formatYouTubeTime(0)).toBe('00:00');
    expect(formatYouTubeTime(5)).toBe('00:05');
    expect(formatYouTubeTime(75)).toBe('01:15');
    expect(formatYouTubeTime(3599)).toBe('59:59');
  });

  it('formats values of an hour or more as HH:MM:SS', () => {
    expect(formatYouTubeTime(3600)).toBe('1:00:00');
    expect(formatYouTubeTime(6943)).toBe('1:55:43');
    expect(formatYouTubeTime(7325)).toBe('2:02:05');
  });

  it('falls back to 00:00 for invalid input', () => {
    expect(formatYouTubeTime(NaN)).toBe('00:00');
    expect(formatYouTubeTime(-5)).toBe('00:00');
    expect(formatYouTubeTime(Infinity)).toBe('00:00');
  });
});

const manyMatches = (count: number) => Array.from({ length: count }, (_, i) => ({
  timestamp: formatYouTubeTime(i), progress_seconds: i, text_snippet: `hello moment ${i}`,
}));

describe('predictable result browsing', () => {
  it.each([
    { language: 'en' as const, more: 'Show 5 more matches', less: 'Show fewer matches' },
    { language: 'ar' as const, more: 'عرض 5 نتائج إضافية', less: 'عرض نتائج أقل' },
  ])('expands and collapses 55 results with correct labels, state and focus in $language', async ({ language, more, less }) => {
    const user = userEvent.setup();
    await act(async () => setLanguage(language));
    render(<ResultsList matches={manyMatches(55)} keyword="hello" onSeek={vi.fn()} />);
    const toggle = screen.getByRole('button', { name: more });
    expect(screen.getAllByRole('listitem')).toHaveLength(50);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toBe(screen.getByRole('list'));
    await user.click(toggle);
    expect(screen.getAllByRole('listitem')).toHaveLength(55);
    expect(toggle).toHaveAccessibleName(less);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(screen.getByText('00:50').closest('button')).toHaveFocus());
    await user.click(toggle);
    expect(screen.getAllByRole('listitem')).toHaveLength(50);
    expect(toggle).toHaveAccessibleName(more);
    await waitFor(() => expect(toggle).toHaveFocus());
  });

  it('collapses a newly selected video even when the search phrase is unchanged', async () => {
    const user = userEvent.setup();
    const results = manyMatches(55);
    const { rerender } = render(<ResultsList matches={results} keyword="hello" youtubeId="first" onSeek={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Show 5 more matches' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(55);
    rerender(<ResultsList matches={results} keyword="hello" youtubeId="second" onSeek={vi.fn()} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(50);
    expect(screen.getByRole('button', { name: 'Show 5 more matches' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows the count for an empty result set as well', () => {
    render(<ResultsList matches={[]} keyword="missing" onSeek={vi.fn()} />);
    expect(screen.getByText('0 matches')).toBeInTheDocument();
  });

  it.each([
    [0, 'لا توجد نتائج'], [1, 'نتيجة واحدة'], [2, 'نتيجتان'],
    [3, '3 نتائج'], [11, '11 نتيجة'], [100, '100 نتيجة'],
  ] as const)('uses the Arabic plural form for %i results', async (count, label) => {
    await act(async () => setLanguage('ar'));
    render(<ResultsList matches={manyMatches(count)} keyword="hello" onSeek={vi.fn()} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('gives every external result link a distinct timestamp and a new-tab cue', () => {
    render(<ResultsList matches={matches} keyword="hello" youtubeId="abcdef12345" onSeek={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Watch on YouTube at 00:03 (opens in a new tab)' }))
      .toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: 'Watch on YouTube at 01:15 (opens in a new tab)' }))
      .toHaveAttribute('href', 'https://www.youtube.com/watch?v=abcdef12345&t=75');
  });

  it('lets mixed-language snippets determine their own direction and keeps timestamps LTR', async () => {
    await act(async () => setLanguage('ar'));
    const { container } = render(<ResultsList matches={matches} keyword="hello" onSeek={vi.fn()} />);
    for (const snippet of container.querySelectorAll('.match-card__snippet')) {
      expect(snippet).toHaveAttribute('dir', 'auto');
    }
    expect(screen.getByText('00:03')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByRole('list')).toHaveClass('lg:max-h-[60vh]', 'lg:overflow-y-auto');
    expect(screen.getByRole('list')).not.toHaveClass('max-h-[60vh]');
    expect(screen.getByRole('list')).not.toHaveClass('overflow-y-auto');
  });
});
