import { render, waitFor } from '@testing-library/react';
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
  it('renders a placeholder container for the embedded player', () => {
    const { container } = render(<VideoPlayer videoId="jNQXAC9IVRw" />);
    expect(container.querySelector('.aspect-video')).toBeInTheDocument();
    expect(container.querySelector('.overflow-hidden')).toBeInTheDocument();
  });

  it('initializes the YouTube player on mount', async () => {
    render(<VideoPlayer videoId="jNQXAC9IVRw" />);
    await waitFor(() => expect(window.YT!.Player).toHaveBeenCalled());
  });
});
