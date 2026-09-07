import { StrictMode, createRef } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoPlayer } from '../components/VideoPlayer';
import type { VideoPlayerHandle } from '../hooks/useYouTubePlayer';
import { setLanguage } from '../i18n';

interface Instance {
  options: YTPlayerOptions;
  player: YTPlayer;
  iframe: HTMLIFrameElement;
}
let instances: Instance[];
const construct = vi.fn(function (element: HTMLElement, options: YTPlayerOptions): YTPlayer {
  const iframe = document.createElement('iframe');
  element.replaceWith(iframe);
  const player: YTPlayer = {
    seekTo: vi.fn(),
    playVideo: vi.fn(),
    destroy: vi.fn(() => iframe.remove()),
  };
  instances.push({ options, player, iframe });
  return player;
});

function ready(index = 0) {
  const { player, options } = instances[index];
  act(() => options.events?.onReady?.({ target: player }));
}

beforeEach(() => {
  instances = [];
  construct.mockClear();
  document.getElementById('youtube-iframe-api')?.remove();
  vi.stubGlobal('YT', { Player: construct });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.getElementById('youtube-iframe-api')?.remove();
});

describe('VideoPlayer', () => {
  it('shows a loading skeleton and a usable fallback until the player is ready', async () => {
    render(<VideoPlayer videoId="abcdef12345" />);
    expect(screen.getByText('Loading video preview…')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open on YouTube/ })).toHaveAttribute(
      'href', 'https://www.youtube.com/watch?v=abcdef12345&t=0',
    );
    await waitFor(() => expect(construct).toHaveBeenCalledOnce());
    ready();
    expect(screen.queryByText('Loading video preview…')).not.toBeInTheDocument();
    expect(screen.getByTitle('Video preview')).toBeInTheDocument();
  });

  it('queues only the latest early seek and waits for real playback before activating a match', async () => {
    const ref = createRef<VideoPlayerHandle>();
    const onPlaybackChange = vi.fn();
    render(<VideoPlayer ref={ref} videoId="abcdef12345" onPlaybackChange={onPlaybackChange} />);
    await waitFor(() => expect(construct).toHaveBeenCalledOnce());
    act(() => { ref.current?.seekTo(5); ref.current?.seekTo(75); });
    expect(instances[0].player.seekTo).not.toHaveBeenCalled();
    expect(screen.getByText('Loading video — we’ll jump to 01:15 when it’s ready.')).toBeInTheDocument();
    ready();
    expect(instances[0].player.seekTo).toHaveBeenCalledExactlyOnceWith(75, true);
    expect(instances[0].player.playVideo).toHaveBeenCalledOnce();
    expect(onPlaybackChange).not.toHaveBeenCalledWith(75);
    act(() => instances[0].options.events?.onStateChange?.({ target: instances[0].player, data: 1 }));
    expect(onPlaybackChange).toHaveBeenLastCalledWith(75);
    act(() => instances[0].options.events?.onStateChange?.({ target: instances[0].player, data: 2 }));
    expect(onPlaybackChange).toHaveBeenLastCalledWith(null);
  });

  it('shows an unavailable state immediately when the API script fails', async () => {
    vi.stubGlobal('YT', undefined);
    const ref = createRef<VideoPlayerHandle>();
    render(<VideoPlayer videoId="abcdef12345" ref={ref} />);
    act(() => document.getElementById('youtube-iframe-api')?.dispatchEvent(new Event('error')));
    expect(await screen.findByText('Video preview unavailable')).toBeInTheDocument();
    act(() => ref.current?.seekTo(83));
    const link = screen.getByRole('link', { name: /Open 01:23 on YouTube/ });
    expect(link).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abcdef12345&t=83');
    expect(link).toHaveAttribute('target', '_blank');
    expect(construct).not.toHaveBeenCalled();
  });

  it('times out an API script that never becomes ready and clears its timers', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('YT', undefined);
    render(<VideoPlayer videoId="abcdef12345" />);
    await act(async () => vi.advanceTimersByTime(8000));
    expect(screen.getByText('Video preview unavailable')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('also times out an iframe that never fires onReady, and ignores a late ready event', async () => {
    vi.useFakeTimers();
    render(<VideoPlayer videoId="abcdef12345" />);
    await act(async () => {});
    expect(construct).toHaveBeenCalledOnce();
    await act(async () => vi.advanceTimersByTime(8000));
    expect(screen.getByText('Video preview unavailable')).toBeInTheDocument();
    expect(instances[0].player.destroy).toHaveBeenCalledOnce();
    ready();
    expect(screen.getByText('Video preview unavailable')).toBeInTheDocument();
  });

  it('preserves the selected fallback timestamp on an embed error', async () => {
    const ref = createRef<VideoPlayerHandle>();
    render(<VideoPlayer ref={ref} videoId="abcdef12345" />);
    await waitFor(() => expect(construct).toHaveBeenCalledOnce());
    ready();
    act(() => ref.current?.seekTo(65));
    act(() => instances[0].options.events?.onError?.({ data: 101 }));
    expect(screen.getByText('Video preview unavailable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open 01:05 on YouTube/ })).toHaveAttribute(
      'href', 'https://www.youtube.com/watch?v=abcdef12345&t=65',
    );
  });

  it('explains blocked autoplay without claiming the requested match is playing', async () => {
    const ref = createRef<VideoPlayerHandle>();
    const onPlaybackChange = vi.fn();
    render(<VideoPlayer ref={ref} videoId="abcdef12345" onPlaybackChange={onPlaybackChange} />);
    await waitFor(() => expect(construct).toHaveBeenCalledOnce());
    ready();
    act(() => ref.current?.seekTo(65));
    act(() => instances[0].options.events?.onAutoplayBlocked?.({ target: instances[0].player }));
    expect(screen.getByText(/Playback didn’t start/)).toBeInTheDocument();
    expect(screen.getByTitle('Video preview')).toBeInTheDocument();
    expect(onPlaybackChange).not.toHaveBeenCalledWith(65);
  });

  it('handles player-construction errors', async () => {
    construct.mockImplementationOnce(function () { throw new Error('blocked'); });
    render(<VideoPlayer videoId="abcdef12345" />);
    expect(await screen.findByText('Video preview unavailable')).toBeInTheDocument();
  });

  it('resets state and queued seeks when the video changes, without replacing React-owned DOM', async () => {
    const ref = createRef<VideoPlayerHandle>();
    const { rerender } = render(<VideoPlayer videoId="first-video" ref={ref} />);
    await waitFor(() => expect(construct).toHaveBeenCalledOnce());
    act(() => ref.current?.seekTo(120));
    rerender(<VideoPlayer videoId="second-video" ref={ref} />);
    await waitFor(() => expect(construct).toHaveBeenCalledTimes(2));
    expect(instances[0].player.destroy).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: /Open on YouTube/ })).toHaveAttribute(
      'href', 'https://www.youtube.com/watch?v=second-video&t=0',
    );
    ready(0); // Stale first-video events must not change the second player.
    expect(screen.getByText('Loading video preview…')).toBeInTheDocument();
    ready(1);
    expect(instances[1].player.seekTo).not.toHaveBeenCalled();
    expect(screen.getByTitle('Video preview')).toBeInTheDocument();
  });

  it('does not leave polling timers or duplicate scripts after StrictMode cleanup', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('YT', undefined);
    const { unmount } = render(<StrictMode><VideoPlayer videoId="abcdef12345" /></StrictMode>);
    expect(document.querySelectorAll('#youtube-iframe-api')).toHaveLength(1);
    unmount();
    await act(async () => {});
    expect(vi.getTimerCount()).toBe(0);
    expect(construct).not.toHaveBeenCalled();
  });

  it('localizes loading, error and fallback feedback in Arabic', async () => {
    await act(async () => setLanguage('ar'));
    render(<VideoPlayer videoId="abcdef12345" />);
    expect(screen.getByText('جارٍ تحميل معاينة الفيديو…')).toBeInTheDocument();
    await waitFor(() => expect(construct).toHaveBeenCalledOnce());
    act(() => instances[0].options.events?.onError?.({ data: 100 }));
    expect(screen.getByText('معاينة الفيديو غير متاحة')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /فتح على يوتيوب/ })).toBeInTheDocument();
  });
});
