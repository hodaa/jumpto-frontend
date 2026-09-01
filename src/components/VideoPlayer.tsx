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
    <div className="overflow-hidden rounded-xl bg-black">
      <div className="aspect-video w-full" ref={containerRef} />
      <p className="bg-white px-4 py-3 text-xs text-slate-500">{t('player.note')}</p>
    </div>
  );
});
