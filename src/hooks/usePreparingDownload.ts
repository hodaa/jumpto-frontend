import { useEffect, useRef, useState } from 'react';
import { saveDownload } from '../utils/download';

// A hung fetch would otherwise lock a button forever, so the pending state
// also expires on its own; the server's own download timeout is 10 minutes.
export const PREPARE_RESET_MS = 11 * 60 * 1000;

/**
 * Track one in-flight download and save it without leaving the page.
 *
 * `key` names the download - the video for the toolbar, the moment for a row
 * button - and the pending state never survives a change of key, so switching
 * videos re-arms the button on its own. The button also re-arms as soon as
 * the file is saved, the request fails, or the download is cancelled, so a
 * retry is one click away.
 */
export function usePreparingDownload(key: string | undefined) {
  const [preparingFor, setPreparingFor] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const preparing = preparingFor !== null && preparingFor === key;

  useEffect(() => {
    if (!preparing) {
      return undefined;
    }
    const timer = setTimeout(() => setPreparingFor(null), PREPARE_RESET_MS);
    return () => clearTimeout(timer);
  }, [preparing]);

  const beginDownload = (url: string) => {
    if (key === undefined) {
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    setPreparingFor(key);
    void saveDownload(url, controller.signal)
      .catch(() => {
        // A failed or cancelled request just re-arms the button below.
      })
      .finally(() => {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
        setPreparingFor((current) => (current === key ? null : current));
      });
  };

  /** Stop waiting for the in-flight download and re-arm the button. */
  const cancelDownload = () => {
    controllerRef.current?.abort();
  };

  return { preparing, beginDownload, cancelDownload };
}
