import { render, waitFor } from '@testing-library/react';
import { vi, it, beforeEach, expect } from 'vitest';
import { VideoPlayer } from '../components/VideoPlayer';

beforeEach(() => {
  window.YT = {
    Player: vi.fn(() => ({ destroy: vi.fn(), seekTo: vi.fn() })),
  } as unknown as typeof window.YT;
});

it('renders the player', async () => {
  const { unmount } = render(<VideoPlayer videoId="x" />);
  const yt = window.YT as { Player: unknown };
  await waitFor(() => expect(yt.Player).toHaveBeenCalled());
  unmount();
});
