import { useCallback, useEffect, useRef } from 'react';

/** Handle to control an embedded YouTube player. */
export interface VideoPlayerHandle {
  /** Seek the player to a given second and begin playback. */
  seekTo(seconds: number): void;
}

const API_SCRIPT_URL = 'https://www.youtube.com/iframe_api';

let apiScriptInjected = false;

/** Injects the YouTube IFrame Player API script tag once. */
function injectApiScript(): void {
  if (apiScriptInjected) return;
  apiScriptInjected = true;
  if (document.getElementById('youtube-iframe-api')) return;
  const tag = document.createElement('script');
  tag.id = 'youtube-iframe-api';
  tag.src = API_SCRIPT_URL;
  document.head.appendChild(tag);
}

/** Wait until the YT namespace is available. */
function whenYouTubeReady(timeoutMs = 8000): Promise<YTNamespace> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = () => {
      if (window.YT) {
        resolve(window.YT);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error('YouTube player API timed out'));
        return;
      }
      window.setTimeout(poll, 50);
    };
    injectApiScript();
    poll();
  });
}

export function useYouTubePlayer(
  videoId: string,
): [React.RefObject<HTMLDivElement | null>, VideoPlayerHandle] {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  useEffect(() => {
    let cancelled = false;
    whenYouTubeReady()
      .then((YT) => {
        if (cancelled || !containerRef.current) return;
        playerRef.current = new YT.Player(containerRef.current, {
          videoId,
          playerVars: {
            rel: 0,
            playsinline: 1,
            origin: window.location.origin,
          },
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds, true);
    playerRef.current?.playVideo();
  }, []);

  return [containerRef, { seekTo }];
}
