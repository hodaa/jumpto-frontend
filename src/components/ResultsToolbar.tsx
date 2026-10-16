import { useState } from 'react';
import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { videoDownloadUrl } from '../api/client';
import { usePreparingDownload } from '../hooks/usePreparingDownload';
import { IconCopy, IconFileText, IconVideo } from './icons';
import { VideoDownloadDialog } from './VideoDownloadDialog';

interface Props {
  onCopy: () => void;
  copied: boolean;
  copyFailed?: boolean;
  transcriptUrl?: string;
  videoYoutubeId?: string;
  hasMatches: boolean;
}

const BUTTON =
  'inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-100 @max-[36rem]/toolbar:w-full';

const SPINNER =
  'h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700';

/** Wrapping actions and a separate full-width feedback row below the headline. */
export function ResultsToolbar({
  onCopy,
  copied,
  copyFailed,
  hasMatches,
  transcriptUrl,
  videoYoutubeId,
}: Props) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    preparing: preparingVideo,
    beginDownload,
    cancelDownload: cancelVideoDownload,
  } = usePreparingDownload(videoYoutubeId);
  const copyLabel = copied ? t('results.copied') : t('results.copy');
  const videoUrl = videoYoutubeId ? videoDownloadUrl(videoYoutubeId) : undefined;

  const handleVideoClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Always the dialog, never a direct download: the button carries the full
    // video's href for right-click "save as", but a left click asks first.
    // While a download is being prepared the same click cancels it instead.
    event.preventDefault();
    if (preparingVideo) {
      cancelVideoDownload();
      return;
    }
    setDialogOpen(true);
  };

  const handleDownloadSection = (
    startSeconds: number | null,
    endSeconds: number | null,
    height: number | null,
  ) => {
    if (!videoYoutubeId) {
      return;
    }
    setDialogOpen(false);
    beginDownload(videoDownloadUrl(videoYoutubeId, startSeconds, endSeconds, height));
  };

  return (
    <div className="@container/toolbar flex w-full min-w-0 flex-col gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {transcriptUrl ? (
          <a className={BUTTON} href={transcriptUrl} download>
            <IconFileText />
            {t('results.downloadTranscript')}
          </a>
        ) : null}
        {videoUrl ? (
          <a
            className={BUTTON}
            href={videoUrl}
            download
            aria-busy={preparingVideo || undefined}
            onClick={handleVideoClick}
          >
            {preparingVideo ? (
              <span aria-hidden="true" className={SPINNER} />
            ) : (
              <IconVideo size={16} />
            )}
            {preparingVideo ? t('results.cancelDownload') : t('results.downloadVideo')}
          </a>
        ) : null}
        <button
          type="button"
          className={BUTTON}
          onClick={onCopy}
          disabled={!hasMatches}
          title={hasMatches ? t('results.copy') : t('results.noMatchesTooltip')}
        >
          <IconCopy />
          {copyLabel}
        </button>
      </div>
      {preparingVideo ? (
        <p role="status" className="text-xs font-medium text-slate-500">
          {t('results.preparingVideoHint')}
        </p>
      ) : null}
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={
          copyFailed
            ? 'w-full min-w-0 text-start text-sm font-medium text-danger [overflow-wrap:anywhere]'
            : 'sr-only'
        }
      >
        {copyFailed ? t('results.copyFailed') : copied ? t('results.copied') : ''}
      </p>
      {!hasMatches ? <p className="sr-only">{t('results.noMatchesTooltip')}</p> : null}
      {dialogOpen && videoYoutubeId ? (
        <VideoDownloadDialog
          key={videoYoutubeId}
          youtubeId={videoYoutubeId}
          onClose={() => setDialogOpen(false)}
          onDownload={handleDownloadSection}
        />
      ) : null}
    </div>
  );
}
