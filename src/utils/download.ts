import { consumeVideoDownload, createVideoDownload, fetchVideoDownloadStatus } from '../api/client';

// Give the browser a beat to start the save before the blob URL is released.
const REVOKE_DELAY_MS = 1000;

// How often the client asks the server whether the worker produced the file.
const POLL_INTERVAL_MS = 2000;

// The download request's path: /api/videos/<id>/video.mp4 with an optional range.
const VIDEO_PATH = /\/videos\/([^/]+)\/video\.mp4$/;

/** The video, section, and quality a download URL names. */
interface VideoTarget {
  youtubeId: string;
  start: number | null;
  end: number | null;
  height: number | null;
}

/** Rebuild the file name the server's Content-Disposition header would carry. */
export function downloadNameFor(url: string): string {
  const parsed = new URL(url, window.location.href);
  const id = VIDEO_PATH.exec(parsed.pathname)?.[1] ?? 'video';
  const safeId =
    decodeURIComponent(id)
      .replace(/[^A-Za-z0-9_-]/g, '')
      .slice(0, 64) || 'video';
  const height = parsed.searchParams.get('height');
  const quality = height === null ? '' : `-${height}p`;
  const start = parsed.searchParams.get('start');
  const end = parsed.searchParams.get('end');
  const range = start === null ? '' : `-${start}-${end ?? 'end'}`;
  return `video-${safeId}${quality}${range}.mp4`;
}

/**
 * Download a video without leaving the page.
 *
 * The URL names the request, not the bytes: queue the download on the server,
 * poll until the worker has produced the file (it holds the cookies, the IP,
 * and the media tooling the serverless runtime lacks), fetch the produced blob
 * from a same-origin blob URL so a cross-origin `download` attribute cannot be
 * ignored, and tell the server the file arrived so it can delete its copy.
 * Aborting `signal` cancels the wait: the pending request rejects and nothing
 * is saved.
 */
export async function saveDownload(url: string, signal?: AbortSignal): Promise<void> {
  const target = videoTargetFor(url);
  const created = await createVideoDownload(
    target.youtubeId,
    { start: target.start, end: target.end, height: target.height },
    signal,
  );
  const ready = await waitForReady(target.youtubeId, created.id, signal);
  const response = await fetch(ready.url, { signal });
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }
  saveBlob(await response.blob(), ready.filename ?? downloadNameFor(url));
  await consumeAfterSave(target.youtubeId, created.id, signal);
}

/** Parse the video, section, and quality out of a download URL. */
function videoTargetFor(url: string): VideoTarget {
  const parsed = new URL(url, window.location.href);
  const match = VIDEO_PATH.exec(parsed.pathname);
  if (!match) {
    throw new Error('Not a video download URL');
  }
  const seconds = (value: string | null) => (value === null ? null : Number(value));
  return {
    youtubeId: decodeURIComponent(match[1]),
    start: seconds(parsed.searchParams.get('start')),
    end: seconds(parsed.searchParams.get('end')),
    height: seconds(parsed.searchParams.get('height')),
  };
}

/** Poll until the worker reported the download ready, or it failed. */
async function waitForReady(
  youtubeId: string,
  downloadId: string,
  signal?: AbortSignal,
): Promise<{ url: string; filename: string | null }> {
  for (;;) {
    const status = await fetchVideoDownloadStatus(youtubeId, downloadId, signal);
    if (status.status === 'ready' && status.url) {
      return { url: status.url, filename: status.filename };
    }
    if (status.status !== 'pending' && status.status !== 'processing') {
      throw new Error(status.error ?? 'Download failed');
    }
    await sleep(POLL_INTERVAL_MS, signal);
  }
}

/** Release the server's stored copy; a failure only means the sweep will. */
async function consumeAfterSave(
  youtubeId: string,
  downloadId: string,
  signal?: AbortSignal,
): Promise<void> {
  try {
    await consumeVideoDownload(youtubeId, downloadId, signal);
  } catch {
    // The file is already saved; leaking the blob until the server's sweep
    // deletes it is better than reporting a failure for a finished download.
  }
}

/** Save fetched bytes through a same-origin blob link under `name`. */
function saveBlob(blob: Blob, name: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), REVOKE_DELAY_MS);
}

/** Wait for `ms`, rejecting with an AbortError if `signal` aborts first. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
