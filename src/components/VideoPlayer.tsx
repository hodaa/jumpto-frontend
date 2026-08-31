import { forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import type { VideoPlayerHandle } from '../hooks/useYouTubePlayer';
import { useYouTubePlayer } from '../hooks/useYouTubePlayer';

interface Props {
  videoId: string;
}

/** Embedded YouTube player that can be seeked to a timestamp. */
export const VideoPlayer = forwardRef<VideoPlayerHandle, Props>(function VideoPlayer(
  { videoId },
  ref,
) {
  const { t } = useTranslation();
  const [containerRef, handle] = useYouTubePlayer(videoId);
  useImperativeHandle(ref, () => handle, [handle]);

  return (
    <div className="video-player">
      <div className="video-player-frame" ref={containerRef} />
      <p className="video-player-note">{t('player.note')}</p>
    </div>
  );
});
