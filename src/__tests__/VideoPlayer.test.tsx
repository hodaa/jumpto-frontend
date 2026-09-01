import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoPlayer } from '../components/VideoPlayer';

beforeEach(() => {
  window.YT = {
    Player: vi.fn().mockImplementation(() => ({
      seekTo: vi.fn(),
      destroy: vi.fn(),
    })),
  } as unknown as typeof window.YT;
});

describe('VideoPlayer', () => {
  it('renders the player placeholder and note', () => {
    render(<VideoPlayer videoId="jNQXAC9IVRw" />);
    expect(
      screen.getByText('Click a match below to jump to that moment in the video.'),
    ).toBeInTheDocument();
  });

  it('initializes the YouTube player on mount', async () => {
    render(<VideoPlayer videoId="jNQXAC9IVRw" />);
    await waitFor(() => expect(window.YT!.Player).toHaveBeenCalled());
  });
});
