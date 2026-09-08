import { beforeEach, describe, expect, it, vi } from 'vitest';
import { trackEvent } from '../utils/analytics';

describe('analytics', () => {
  beforeEach(() => {
    vi.stubGlobal('gtag', vi.fn());
  });

  it('forwards the event name and params to gtag', () => {
    trackEvent('search_submit', { source: 'network' });
    const gtag = (window as unknown as { gtag: ReturnType<typeof vi.fn> }).gtag;
    expect(gtag).toHaveBeenCalledWith('event', 'search_submit', {
      source: 'network',
    });
  });

  it('does not throw when gtag is missing', () => {
    vi.stubGlobal('gtag', undefined);
    expect(() => trackEvent('search_submit')).not.toThrow();
  });
});