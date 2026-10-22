import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import type { VideoPlayerHandle } from '../hooks/useYouTubePlayer';
import { useYouTubePlayer } from '../hooks/useYouTubePlayer';
import { formatYouTubeTime } from '../utils/youtube';
import type { VideoRef } from '../utils/videoSources';
import { IconVideo } from './icons';
import { StatusCard } from './StatusCard';

interface Props {
  video: VideoRef;
  onPlaybackChange?: (seconds: number | null) => void;
}

const FRAME = 'relative aspect-video w-full overflow-hidden rounded-xl';

const PlayerInstance = forwardRef<VideoPlayerHandle, Props>(function PlayerInstance(
  { video, onPlaybackChange },
  ref,
) {
  const { t } = useTranslation();
  const [containerRef, handle, state] = useYouTubePlayer(video.id, onPlaybackChange);
  useImperativeHandle(ref, () => handle, [handle]);
  const { status, requestedTimestamp, playbackBlocked } = state;
  const timestamp = requestedTimestamp === null ? null : formatYouTubeTime(requestedTimestamp);
  const message =
    status === 'loading'
      ? timestamp
        ? t('player.loadingMoment', { timestamp })
        : t('player.loading')
      : status === 'unavailable'
        ? t('player.unavailableHint')
        : playbackBlocked
          ? t('player.playbackBlocked')
          : '';

  useEffect(() => {
    if (status === 'ready') {
      containerRef.current?.querySelector('iframe')?.setAttribute('title', t('player.title'));
    }
  }, [containerRef, status, t]);

  return (
    <div className="min-w-0">
      <div
        className={`${FRAME} ${
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
          <div
            className="absolute inset-0 flex items-center justify-center p-4 sm:p-6"
            aria-hidden="true"
          >
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
        <p
          aria-live="polite"
          aria-atomic="true"
          className={message ? 'text-start text-sm text-muted' : 'sr-only'}
        >
          {message}
        </p>
      </div>
    </div>
  );
});

/**
 * A Google Drive file embedded through its preview iframe.
 *
 * Drive exposes no scriptable player: the frame cannot be told to seek, and it
 * reports no playback position. So this is deliberately dumb — one iframe, no
 * overlays and no messages — and the replay of a moment still opens on the
 * right row while the video itself starts from the beginning.
 */
function DrivePreview({ videoId }: { videoId: string }) {
  const { t } = useTranslation();
  return (
    <div className="min-w-0">
      <div className={`${FRAME} border border-slate-200 bg-black`}>
        <iframe
          src={`https://drive.google.com/file/d/${encodeURIComponent(videoId)}/preview`}
          title={t('player.title')}
          allow="autoplay; fullscreen"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    </div>
  );
}

/** A new video gets a fresh player lifecycle, including loading and queued seeks. */
export const VideoPlayer = forwardRef<VideoPlayerHandle, Props>(function VideoPlayer(props, ref) {
  const key = `${props.video.source}:${props.video.id}`;
  if (props.video.source === 'drive') {
    return <DrivePreview key={key} videoId={props.video.id} />;
  }
  return <PlayerInstance key={key} {...props} ref={ref} />;
});
