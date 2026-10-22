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
    render(<VideoPlayer video={{ source: 'youtube', id: 'abcdef12345' }} />);
    expect(screen.getByText('Loading video preview…')).toBeInTheDocument();
    await waitFor(() => expect(construct).toHaveBeenCalledOnce());
    ready();
    expect(screen.queryByText('Loading video preview…')).not.toBeInTheDocument();
    expect(screen.getByTitle('Video preview')).toBeInTheDocument();
  });

  it('queues only the latest early seek and waits for real playback before activating a match', async () => {
    const ref = createRef<VideoPlayerHandle>();
    const onPlaybackChange = vi.fn();
    render(
      <VideoPlayer
        ref={ref}
        video={{ source: 'youtube', id: 'abcdef12345' }}
        onPlaybackChange={onPlaybackChange}
      />,
    );
    await waitFor(() => expect(construct).toHaveBeenCalledOnce());
    act(() => {
      ref.current?.seekTo(5);
      ref.current?.seekTo(75);
    });
    expect(instances[0].player.seekTo).not.toHaveBeenCalled();
    expect(
      screen.getByText('Loading video — we’ll jump to 01:15 when it’s ready.'),
    ).toBeInTheDocument();
    ready();
    expect(instances[0].player.seekTo).toHaveBeenCalledExactlyOnceWith(75, true);
    expect(instances[0].player.playVideo).toHaveBeenCalledOnce();
    expect(onPlaybackChange).not.toHaveBeenCalledWith(75);
    act(() =>
      instances[0].options.events?.onStateChange?.({ target: instances[0].player, data: 1 }),
    );
    expect(onPlaybackChange).toHaveBeenLastCalledWith(75);
    act(() =>
      instances[0].options.events?.onStateChange?.({ target: instances[0].player, data: 2 }),
    );
    expect(onPlaybackChange).toHaveBeenLastCalledWith(null);
  });

  it('parks on a moment without playing it when autoplay is off', async () => {
    const ref = createRef<VideoPlayerHandle>();
    const onPlaybackChange = vi.fn();
    render(
      <VideoPlayer
        ref={ref}
        video={{ source: 'youtube', id: 'abcdef12345' }}
        onPlaybackChange={onPlaybackChange}
      />,
    );
    await waitFor(() => expect(construct).toHaveBeenCalledOnce());

    // Queued before the player exists, exactly as the shared-moment path does.
    act(() => ref.current?.seekTo(754, { autoplay: false }));
    expect(instances[0].player.playVideo).not.toHaveBeenCalled();
    ready();

    // The frame is the point, so the video must not run past it.
    expect(instances[0].player.seekTo).toHaveBeenCalledExactlyOnceWith(754, true);
    expect(instances[0].player.playVideo).not.toHaveBeenCalled();

    // Parked is not "no position": report the moment so the view can mark it as
    // the current one, otherwise the cue would look like nothing was selected.
    expect(onPlaybackChange).toHaveBeenLastCalledWith(754);
  });

  it('still plays a plain seek, so selecting a result is unchanged', async () => {
    const ref = createRef<VideoPlayerHandle>();
    render(<VideoPlayer ref={ref} video={{ source: 'youtube', id: 'abcdef12345' }} />);
    await waitFor(() => expect(construct).toHaveBeenCalledOnce());
    act(() => ref.current?.seekTo(42));
    ready();
    expect(instances[0].player.playVideo).toHaveBeenCalledOnce();
  });

  it('shows an unavailable state immediately when the API script fails', async () => {
    vi.stubGlobal('YT', undefined);
    const ref = createRef<VideoPlayerHandle>();
    render(<VideoPlayer video={{ source: 'youtube', id: 'abcdef12345' }} ref={ref} />);
    act(() => document.getElementById('youtube-iframe-api')?.dispatchEvent(new Event('error')));
    expect(await screen.findByText('Video preview unavailable')).toBeInTheDocument();
    act(() => ref.current?.seekTo(83));
    expect(construct).not.toHaveBeenCalled();
  });

  it('times out an API script that never becomes ready and clears its timers', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('YT', undefined);
    render(<VideoPlayer video={{ source: 'youtube', id: 'abcdef12345' }} />);
    await act(async () => vi.advanceTimersByTime(8000));
    expect(screen.getByText('Video preview unavailable')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('also times out an iframe that never fires onReady, and ignores a late ready event', async () => {
    vi.useFakeTimers();
    render(<VideoPlayer video={{ source: 'youtube', id: 'abcdef12345' }} />);
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
    render(<VideoPlayer ref={ref} video={{ source: 'youtube', id: 'abcdef12345' }} />);
    await waitFor(() => expect(construct).toHaveBeenCalledOnce());
    ready();
    act(() => ref.current?.seekTo(65));
    act(() => instances[0].options.events?.onError?.({ data: 101 }));
    expect(screen.getByText('Video preview unavailable')).toBeInTheDocument();
  });

  it('explains blocked autoplay without claiming the requested match is playing', async () => {
    const ref = createRef<VideoPlayerHandle>();
    const onPlaybackChange = vi.fn();
    render(
      <VideoPlayer
        ref={ref}
        video={{ source: 'youtube', id: 'abcdef12345' }}
        onPlaybackChange={onPlaybackChange}
      />,
    );
    await waitFor(() => expect(construct).toHaveBeenCalledOnce());
    ready();
    act(() => ref.current?.seekTo(65));
    act(() => instances[0].options.events?.onAutoplayBlocked?.({ target: instances[0].player }));
    expect(screen.getByText(/Playback didn’t start/)).toBeInTheDocument();
    expect(screen.getByTitle('Video preview')).toBeInTheDocument();
    expect(onPlaybackChange).not.toHaveBeenCalledWith(65);
  });

  it('handles player-construction errors', async () => {
    construct.mockImplementationOnce(function () {
      throw new Error('blocked');
    });
    render(<VideoPlayer video={{ source: 'youtube', id: 'abcdef12345' }} />);
    expect(await screen.findByText('Video preview unavailable')).toBeInTheDocument();
  });

  it('resets state and queued seeks when the video changes, without replacing React-owned DOM', async () => {
    const ref = createRef<VideoPlayerHandle>();
    const { rerender } = render(
      <VideoPlayer video={{ source: 'youtube', id: 'first-video' }} ref={ref} />,
    );
    await waitFor(() => expect(construct).toHaveBeenCalledOnce());
    act(() => ref.current?.seekTo(120));
    rerender(<VideoPlayer video={{ source: 'youtube', id: 'second-video' }} ref={ref} />);
    await waitFor(() => expect(construct).toHaveBeenCalledTimes(2));
    expect(instances[0].player.destroy).toHaveBeenCalledOnce();
    ready(0); // Stale first-video events must not change the second player.
    expect(screen.getByText('Loading video preview…')).toBeInTheDocument();
    ready(1);
    expect(instances[1].player.seekTo).not.toHaveBeenCalled();
    expect(screen.getByTitle('Video preview')).toBeInTheDocument();
  });

  it('does not leave polling timers or duplicate scripts after StrictMode cleanup', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('YT', undefined);
    const { unmount } = render(
      <StrictMode>
        <VideoPlayer video={{ source: 'youtube', id: 'abcdef12345' }} />
      </StrictMode>,
    );
    expect(document.querySelectorAll('#youtube-iframe-api')).toHaveLength(1);
    unmount();
    await act(async () => {});
    expect(vi.getTimerCount()).toBe(0);
    expect(construct).not.toHaveBeenCalled();
  });

  it('embeds a Drive file through its preview iframe instead of the YouTube player', () => {
    const driveId = '1DOoJhC6NHpLSu2nAvaWy3HukVimEyyhE';
    render(<VideoPlayer video={{ source: 'drive', id: driveId }} />);
    expect(screen.getByTitle('Video preview')).toHaveAttribute(
      'src',
      `https://drive.google.com/file/d/${driveId}/preview`,
    );
    // The YouTube API must not be touched for a Drive video.
    expect(construct).not.toHaveBeenCalled();
    expect(document.getElementById('youtube-iframe-api')).toBeNull();
  });

  it('swaps a Drive preview for the YouTube player when a different video is loaded', () => {
    const driveId = '1DOoJhC6NHpLSu2nAvaWy3HukVimEyyhE';
    const { rerender } = render(<VideoPlayer video={{ source: 'drive', id: driveId }} />);
    expect(screen.getByTitle('Video preview')).toHaveAttribute(
      'src',
      `https://drive.google.com/file/d/${driveId}/preview`,
    );
    rerender(<VideoPlayer video={{ source: 'youtube', id: 'abcdef12345' }} />);
    expect(screen.getByText('Loading video preview…')).toBeInTheDocument();
    expect(screen.queryByTitle('Video preview')).not.toBeInTheDocument();
  });

  it('localizes loading, error and fallback feedback in Arabic', async () => {
    await act(async () => setLanguage('ar'));
    render(<VideoPlayer video={{ source: 'youtube', id: 'abcdef12345' }} />);
    expect(screen.getByText('جارٍ تحميل معاينة الفيديو…')).toBeInTheDocument();
    await waitFor(() => expect(construct).toHaveBeenCalledOnce());
    act(() => instances[0].options.events?.onError?.({ data: 100 }));
    expect(screen.getByText('معاينة الفيديو غير متاحة')).toBeInTheDocument();
  });
});
