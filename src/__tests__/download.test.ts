import { describe, expect, it, vi } from 'vitest';
import { downloadNameFor, saveDownload } from '../utils/download';

describe('downloadNameFor', () => {
  it('names a full video after its id', () => {
    expect(downloadNameFor('http://api.test/api/videos/abc123/video.mp4')).toBe('video-abc123.mp4');
  });

  it('names a section after both bounds', () => {
    expect(downloadNameFor('http://api.test/api/videos/abc123/video.mp4?start=30&end=75')).toBe(
      'video-abc123-30-75.mp4',
    );
  });

  it('marks a section that runs to the end', () => {
    expect(downloadNameFor('http://api.test/api/videos/abc123/video.mp4?start=75')).toBe(
      'video-abc123-75-end.mp4',
    );
  });

  it('sanitizes unexpected characters in the id, like the server would', () => {
    expect(downloadNameFor('http://api.test/api/videos/a%2Fb%20c/video.mp4')).toBe('video-abc.mp4');
  });

  it('marks the quality before the range, like the server would', () => {
    expect(downloadNameFor('http://api.test/api/videos/abc123/video.mp4?height=720')).toBe(
      'video-abc123-720p.mp4',
    );
    expect(
      downloadNameFor('http://api.test/api/videos/abc123/video.mp4?start=30&end=75&height=360'),
    ).toBe('video-abc123-360p-30-75.mp4');
  });
});

describe('saveDownload', () => {
  it('saves the fetched bytes through a same-origin blob link', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob(['bytes'], { type: 'video/mp4' })),
    });
    vi.stubGlobal('fetch', fetchMock);

    const clicked: HTMLAnchorElement[] = [];
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this);
    });
    try {
      await saveDownload('http://api.test/api/videos/abc123/video.mp4?start=5');
    } finally {
      clickSpy.mockRestore();
    }

    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/videos/abc123/video.mp4?start=5', {
      signal: undefined,
    });
    expect(clicked[0]?.download).toBe('video-abc123-5-end.mp4');
    expect(clicked[0]?.getAttribute('href')).toContain('blob:');
    expect(clicked[0]?.isConnected).toBe(false);
  });

  it('hands the abort signal to the fetch so a cancel can stop the wait', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob(['bytes'], { type: 'video/mp4' })),
    });
    vi.stubGlobal('fetch', fetchMock);

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const controller = new AbortController();
    try {
      await saveDownload('http://api.test/api/videos/abc123/video.mp4', controller.signal);
    } finally {
      clickSpy.mockRestore();
    }

    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/videos/abc123/video.mp4', {
      signal: controller.signal,
    });
  });

  it('rejects and never clicks when the wait is aborted mid-flight', async () => {
    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const controller = new AbortController();
    try {
      const pending = saveDownload(
        'http://api.test/api/videos/abc123/video.mp4',
        controller.signal,
      );
      controller.abort();

      await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    } finally {
      clickSpy.mockRestore();
    }

    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('rejects when the server cannot prepare the file and never clicks', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ ok: false, status: 502, blob: () => Promise.resolve(new Blob()) }),
    );

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      await expect(saveDownload('http://api.test/api/videos/abc123/video.mp4')).rejects.toThrow(
        '502',
      );
    } finally {
      clickSpy.mockRestore();
    }

    expect(clickSpy).not.toHaveBeenCalled();
  });
});
