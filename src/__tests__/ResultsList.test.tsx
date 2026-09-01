import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ResultsList } from '../components/ResultsList';
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
    expect(snippet).toHaveAttribute('dir', 'rtl');
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
    expect(screen.queryByText('Watch on YouTube')).not.toBeInTheDocument();
  });

  it('adds a Watch on YouTube link per match when the video id is known', () => {
    render(
      <ResultsList
        matches={matches}
        keyword="hello world"
        onSeek={vi.fn()}
        youtubeId="dQw4w9WgXcQ"
      />,
    );
    const links = screen.getAllByRole('link', { name: 'Watch on YouTube' });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3s',
    );
    expect(links[1]).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=75s',
    );
  });

  it('caps the visible matches and reveals more on demand', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 3 }, (_, i) => ({
      timestamp: `00:0${i}`,
      progress_seconds: i,
      text_snippet: `match ${i}`,
    }));
    render(<ResultsList matches={many} keyword="match" onSeek={vi.fn()} matchLimit={2} />);
    expect(screen.getByRole('button', { name: 'Show 1 more matches' })).toBeInTheDocument();
    expect(screen.queryByText('match 2')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show 1 more matches' }));
    expect(screen.getByRole('button', { name: 'Play at 00:02 — match 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show all 3 matches' })).toBeInTheDocument();
  });

  it('shows an empty state when there are no matches', () => {
    render(<ResultsList matches={[]} keyword="zzz" onSeek={vi.fn()} />);
    expect(screen.getByText('No exact matches found. Try a different phrase.')).toBeInTheDocument();
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
