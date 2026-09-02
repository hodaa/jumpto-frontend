import { forwardRef, useImperativeHandle } from 'react';
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
  const [containerRef, handle] = useYouTubePlayer(videoId);
  useImperativeHandle(ref, () => handle, [handle]);

  return (
    <div className="overflow-hidden rounded-xl bg-black">
      <div className="aspect-video w-full" ref={containerRef} />
      <p className="px-3 py-2 text-sm text-slate-400">
        Click a match below to jump to that moment in the video.
      </p>
    </div>
  );
});
