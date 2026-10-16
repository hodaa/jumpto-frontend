// Give the browser a beat to start the save before the blob URL is released.
const REVOKE_DELAY_MS = 1000;

// The download endpoint's path: /api/videos/<id>/video.mp4 with an optional range.
const VIDEO_PATH = /\/videos\/([^/]+)\/video\.mp4$/;

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
 * Fetch the file first, then save it from a same-origin blob URL.
 *
 * Cross-origin URLs ignore the `download` attribute, so a plain link click
 * would navigate or flash a tab while the server prepares the file (up to ten
 * minutes). Fetching the bytes keeps the page untouched: when the response is
 * ready, the blob link saves it under the name the server would have sent.
 * Aborting `signal` cancels the wait: the fetch rejects and nothing is saved.
 */
export async function saveDownload(url: string, signal?: AbortSignal): Promise<void> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = downloadNameFor(url);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), REVOKE_DELAY_MS);
}
