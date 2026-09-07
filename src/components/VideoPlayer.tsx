import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import type { VideoPlayerHandle } from '../hooks/useYouTubePlayer';
import { useYouTubePlayer } from '../hooks/useYouTubePlayer';
import { buildWatchUrl, formatYouTubeTime } from '../utils/youtube';
import { IconVideo } from './icons';
import { StatusCard } from './StatusCard';

interface Props {
  videoId: string;
  onPlaybackChange?: (seconds: number | null) => void;
}

const PlayerInstance = forwardRef<VideoPlayerHandle, Props>(function PlayerInstance(
  { videoId, onPlaybackChange },
  ref,
) {
  const { t } = useTranslation();
  const [containerRef, handle, state] = useYouTubePlayer(videoId, onPlaybackChange);
  useImperativeHandle(ref, () => handle, [handle]);
  const { status, requestedTimestamp, playbackBlocked } = state;
  const timestamp = requestedTimestamp === null ? null : formatYouTubeTime(requestedTimestamp);
  const message = status === 'loading'
    ? timestamp ? t('player.loadingMoment', { timestamp }) : t('player.loading')
    : status === 'unavailable'
      ? t('player.unavailableHint')
      : playbackBlocked ? t('player.playbackBlocked') : '';

  useEffect(() => {
    if (status === 'ready') {
      containerRef.current?.querySelector('iframe')?.setAttribute('title', t('player.title'));
    }
  }, [containerRef, status, t]);

  return (
    <div className="min-w-0">
      <div
        className={`relative aspect-video w-full overflow-hidden rounded-xl ${
          status === 'ready' ? 'bg-black' : 'border border-slate-200 bg-slate-50'
        }`}
        aria-busy={status === 'loading'}
      >
        <div
          ref={containerRef}
          className={`absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full ${
            status === 'ready' ? '' : 'invisible'
          }`}
          aria-hidden={status !== 'ready' ? true : undefined}
        />
        {status === 'loading' ? (
          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6" aria-hidden="true">
            <div className="w-full max-w-sm">
              <StatusCard progress={null} skeleton />
            </div>
          </div>
        ) : status === 'unavailable' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-muted-strong">
            <IconVideo size={28} />
            <p className="text-sm font-semibold">{t('player.unavailable')}</p>
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex min-w-0 flex-col items-start gap-2">
        <p aria-live="polite" aria-atomic="true" className={message ? 'text-start text-sm text-muted' : 'sr-only'}>
          {message}
        </p>
        <a
          href={buildWatchUrl(videoId, requestedTimestamp ?? 0)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 max-w-full items-center justify-center rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
        >
          {timestamp ? t('player.openMoment', { timestamp }) : t('player.openOnYouTube')}
          <span className="sr-only"> — {t('player.newTab')}</span>
        </a>
      </div>
    </div>
  );
});

/** A new video gets a fresh player lifecycle, including loading and queued seeks. */
export const VideoPlayer = forwardRef<VideoPlayerHandle, Props>(function VideoPlayer(props, ref) {
  return <PlayerInstance key={props.videoId} {...props} ref={ref} />;
});
