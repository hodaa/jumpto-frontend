import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ResultsList } from '../components/ResultsList';

const matches = [
  { timestamp: '00:03', progress_seconds: 3, text_snippet: 'hello world here' },
  { timestamp: '01:15', progress_seconds: 75, text_snippet: null },
];

describe('ResultsList', () => {
  it('renders match count and timestamps', () => {
    render(<ResultsList matches={matches} keyword="hello world" onSeek={vi.fn()} />);
    expect(screen.getByText('2 matches')).toBeInTheDocument();
    expect(screen.getByText('00:03')).toBeInTheDocument();
    expect(screen.getByText('hello world here')).toBeInTheDocument();
    expect(screen.getByText('Exact match')).toBeInTheDocument();
  });

  it('calls onSeek with the right second when a match is clicked', async () => {
    const user = userEvent.setup();
    const onSeek = vi.fn();
    render(<ResultsList matches={matches} keyword="hello world" onSeek={onSeek} />);
    await user.click(screen.getByText('hello world here'));
    expect(onSeek).toHaveBeenCalledWith(3);
  });

  it('keeps match rows clean with a play icon and no external link', () => {
    render(<ResultsList matches={matches} keyword="hello world" onSeek={vi.fn()} />);
    const playIcons = screen.getAllByText('▶');
    expect(playIcons).toHaveLength(2);
    expect(screen.queryByText('Watch on YouTube')).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no matches', () => {
    render(<ResultsList matches={[]} keyword="zzz" onSeek={vi.fn()} />);
    expect(screen.getByText('No exact matches found. Try a different phrase.')).toBeInTheDocument();
  });
});
