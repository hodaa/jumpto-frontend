/** Minimal typings for the YouTube IFrame Player API global. */

interface YTPlayer {
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  destroy(): void;
}

interface YTPlayerOptions {
  videoId: string;
  width?: string | number;
  height?: string | number;
  playerVars?: Record<string, string | number | undefined>;
  events?: {
    onReady?: (event: { target: YTPlayer }) => void;
    onError?: (event: { data: number }) => void;
    onStateChange?: (event: { target: YTPlayer; data: number }) => void;
    onAutoplayBlocked?: (event: { target: YTPlayer }) => void;
  };
}

interface YTNamespace {
  Player: new (element: string | HTMLElement, options: YTPlayerOptions) => YTPlayer;
}

interface YouTubeIframeApiReadyEvent extends Event {
  detail?: unknown;
}

interface Window {
  YT?: YTNamespace;
  onYouTubeIframeAPIReady?: () => void;
}
