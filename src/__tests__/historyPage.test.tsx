import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryPage } from '../components/auth/HistoryPage';
import { AccountMenu } from '../components/auth/AccountMenu';
import type { HistoryEntry } from '../types';

/**
 * Sign-out lives in the header account menu. It used to be duplicated as a
 * second button on the history page, which gave one account two different
 * places to end a session and left the page's own copy of the action to drift
 * from the menu's. The history page now offers only what is unique to it.
 */
const signOut = vi.fn();
const fetchHistory = vi.fn();
const deleteHistoryEntry = vi.fn();
const clearHistory = vi.fn();

// A stable object, not a fresh literal per call. The page's load effect keys on
// `user`, so a mock that hands back a new object every render makes it refetch
// forever and hides exactly the kind of re-render loop these tests exist to catch.
const USER = { id: 'u1', email: 'a@example.com', email_verified: true };

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ user: USER, loading: false, signOut }),
}));

vi.mock('../api/authClient', () => ({
  fetchHistory: (...args: unknown[]) => fetchHistory(...args),
  clearHistory: (...args: unknown[]) => clearHistory(...args),
  deleteHistoryEntry: (...args: unknown[]) => deleteHistoryEntry(...args),
  AuthApiError: class extends Error {},
}));

vi.mock('../hooks/useRoute', () => ({ navigate: vi.fn() }));
vi.mock('../utils/analytics', () => ({ trackEvent: vi.fn() }));

const ENTRY: HistoryEntry = {
  id: 'e1',
  keyword: 'how to type faster',
  video_id: 'abc123',
  video_title: 'Typing without looking down',
  progress_seconds: 754,
  created_at: '2026-01-01T00:00:00Z',
  match_results: [
    {
      timestamp: '12:34',
      progress_seconds: 754,
      text_snippet: 'how to type faster without looking',
    },
    {
      timestamp: '14:02',
      progress_seconds: 842,
      text_snippet: 'and that is how to type faster still',
    },
  ],
} as HistoryEntry;

/** Same video, second search — the case that used to produce two identical cards. */
const SAME_VIDEO: HistoryEntry = {
  ...ENTRY,
  id: 'e2',
  keyword: 'wrist pain',
  created_at: '2026-01-02T00:00:00Z',
} as HistoryEntry;

const OTHER_VIDEO: HistoryEntry = {
  ...ENTRY,
  id: 'e3',
  keyword: 'standing desk',
  video_id: 'zzz999',
  video_title: 'Why I threw out my desk',
} as HistoryEntry;

/** A search that matched nothing: recorded, finished, and empty. */
const NO_MATCH: HistoryEntry = {
  ...ENTRY,
  id: 'e6',
  keyword: 'never said',
  status: 'not_found',
  progress_seconds: null,
  match_results: [],
} as HistoryEntry;

const UNTITLED: HistoryEntry = {
  ...ENTRY,
  id: 'e4',
  video_title: null,
} as HistoryEntry;

/** A search from before the backend recorded either position or results. */
const UNTIMED: HistoryEntry = {
  ...ENTRY,
  id: 'e5',
  keyword: 'no timestamp',
  progress_seconds: null,
  match_results: undefined,
  match_timestamps: undefined,
} as HistoryEntry;

/** The older shape: seconds only, no stored result rows. */
const SECONDS_ONLY: HistoryEntry = {
  ...UNTIMED,
  id: 'e7',
  keyword: 'old row',
  match_timestamps: [90, 240, 600],
} as HistoryEntry;

/**
 * Render the page the way App does, with a spy standing in for the handoff that
 * opens the moment on the home view.
 */
const onReplay = vi.fn();
const onOpenVideo = vi.fn();
function renderHistory() {
  return render(<HistoryPage onReplay={onReplay} onOpenVideo={onOpenVideo} />);
}

/** Matches either role, so reintroducing it as a menu item would still fail. */
const signOutControl = () =>
  screen.queryByRole('button', { name: /^sign out$/i }) ??
  screen.queryByRole('menuitem', { name: /^sign out$/i });

describe('history page', () => {
  beforeEach(() => {
    signOut.mockClear();
    fetchHistory.mockReset();
    onReplay.mockClear();
    onOpenVideo.mockClear();
    deleteHistoryEntry.mockReset();
    clearHistory.mockReset();
  });

  it('does not repeat the sign-out the account menu already offers', async () => {
    fetchHistory.mockResolvedValue({ entries: [ENTRY], next_cursor: null });
    renderHistory();
    await waitFor(() => expect(screen.getByText('how to type faster')).toBeDefined());
    expect(signOutControl()).toBeNull();
  });

  it('keeps the action that is unique to it: clearing entries', async () => {
    fetchHistory.mockResolvedValue({ entries: [ENTRY], next_cursor: null });
    renderHistory();
    await waitFor(() => expect(screen.getByText('how to type faster')).toBeDefined());
    expect(screen.getByRole('button', { name: /delete all/i })).toBeDefined();
  });

  it('still offers clear-all only when there is something to clear', async () => {
    fetchHistory.mockResolvedValue({ entries: [], next_cursor: null });
    renderHistory();
    await waitFor(() => expect(screen.getByText(/no searches yet/i)).toBeDefined());
    expect(screen.queryByRole('button', { name: /delete all/i })).toBeNull();
    expect(signOutControl()).toBeNull();
  });
});

describe('history grouping', () => {
  beforeEach(() => {
    fetchHistory.mockReset();
    onReplay.mockClear();
  });

  it('shows one card per video with the keywords underneath it', async () => {
    fetchHistory.mockResolvedValue({
      entries: [ENTRY, SAME_VIDEO, OTHER_VIDEO],
      next_cursor: null,
    });
    renderHistory();

    await waitFor(() => expect(screen.getByText('standing desk')).toBeDefined());

    // One heading per video, not per search.
    expect(screen.getAllByRole('link', { name: /typing without looking down/i })).toHaveLength(1);
    expect(screen.getAllByRole('link', { name: /why i threw out my desk/i })).toHaveLength(1);

    // Both keywords sit under the video they were searched against.
    expect(screen.getByText('how to type faster')).toBeDefined();
    expect(screen.getByText('wrist pain')).toBeDefined();
  });

  it('makes the video title the way back to the video', async () => {
    fetchHistory.mockResolvedValue({ entries: [ENTRY], next_cursor: null });
    renderHistory();

    const link = await screen.findByRole('link', { name: /typing without looking down/i });
    // A deep link into this app, not a hop out to YouTube: it stays relative so
    // a local build replays locally.
    expect(link.getAttribute('href')).toBe('/?v=abc123&t=0');
    // No target: the app handles the click and stays on the home view.
    expect(link.getAttribute('target')).toBeNull();
  });

  it('falls back to the video id when no title was ever stored', async () => {
    fetchHistory.mockResolvedValue({ entries: [UNTITLED], next_cursor: null });
    renderHistory();

    // The id is offered as the link target, labelled as an id rather than
    // dressed up as a title the visitor never supplied.
    const link = await screen.findByRole('link', { name: /abc123|untitled/i });
    expect(link.getAttribute('href')).toBe('/?v=abc123&t=0');
    expect(screen.getByText(/untitled video/i)).toBeDefined();
  });

  it('still deletes a single search without disturbing its siblings', async () => {
    fetchHistory.mockResolvedValue({
      entries: [ENTRY, SAME_VIDEO, OTHER_VIDEO],
      next_cursor: null,
    });
    renderHistory();
    await waitFor(() => expect(screen.getByText('standing desk')).toBeDefined());

    deleteHistoryEntry.mockResolvedValue(undefined);
    await userEvent.click(
      screen.getByRole('button', { name: /delete the search for wrist pain/i }),
    );
    // The row button only arms the confirmation; it does not delete on its own.
    expect(deleteHistoryEntry).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /delete this search/i }));

    expect(deleteHistoryEntry).toHaveBeenCalledWith('e2');
    await waitFor(() => expect(screen.queryByText('wrist pain')).toBeNull());
    // The other keyword on that video, and the other video, are untouched.
    expect(screen.getByText('how to type faster')).toBeDefined();
    expect(screen.getByText('standing desk')).toBeDefined();
  });

  it('shows YouTube\u2019s own frame on each video card, inside the link', async () => {
    fetchHistory.mockResolvedValue({ entries: [ENTRY, OTHER_VIDEO], next_cursor: null });
    renderHistory();

    const card = await screen.findByRole('link', { name: /Typing without looking down/i });
    const frame = card.querySelector('img');
    // Recognition first: a history is a list of videos, and the picture answers
    // "is this the one?" faster than the title can be read.
    expect(frame?.getAttribute('src')).toBe('https://i.ytimg.com/vi/abc123/hqdefault.jpg');
    // Lazy, because a long history is dozens of frames the visitor may never
    // scroll to, and they are third-party requests on someone else's server.
    expect(frame).toHaveAttribute('loading', 'lazy');
    // Decorative: the title beside it already names the video, so a screen reader
    // must not hear the same words twice.
    expect(frame).toHaveAttribute('alt', '');
    // The link is still named by its title alone: the frame is skipped by
    // assistive tech rather than read out as a second copy of the name.
    expect(
      screen.getByRole('link', { name: /Why I threw out my desk/i, hidden: true }),
    ).toHaveTextContent('Why I threw out my desk');
  });

  it('opens the video when the frame itself is clicked', async () => {
    fetchHistory.mockResolvedValue({ entries: [ENTRY], next_cursor: null });
    renderHistory();

    const card = await screen.findByRole('link', { name: /Typing without looking down/i });
    await userEvent.click(card.querySelector('img')!);
    // The picture is part of the one target rather than a separate 80px tap that
    // might do nothing.
    expect(onOpenVideo).toHaveBeenCalledWith('abc123');
  });

  it('replaces a missing frame with a plain tile rather than a broken image', async () => {
    fetchHistory.mockResolvedValue({ entries: [ENTRY], next_cursor: null });
    renderHistory();

    const card = await screen.findByRole('link', { name: /Typing without looking down/i });
    // Deleted, private or age-restricted videos have no frame, and YouTube
    // answers with an error rather than a placeholder image.
    fireEvent.error(card.querySelector('img')!);

    expect(card.querySelector('img')).toBeNull();
    const tile = card.querySelector('span[aria-hidden="true"]');
    expect(tile).not.toBeNull();
    // Same box as the image it replaces, so the card does not resize itself the
    // moment the error arrives.
    expect(tile?.className).toContain('aspect-video');
  });

  it('shows how many moments each search found, on the row', async () => {
    fetchHistory.mockResolvedValue({ entries: [ENTRY, SAME_VIDEO], next_cursor: null });
    renderHistory();

    // A history is browsed, not read: the count answers "was this one worth it?"
    // without opening the row and waiting for a replay.
    // SAME_VIDEO is a different search on the same video, so it counts its own
    // results rather than inheriting the first row's two.
    expect(await screen.findAllByText('2 matches')).toHaveLength(2);
  });

  it('reuses the results page wording for a single match', async () => {
    fetchHistory.mockResolvedValue({
      entries: [
        {
          ...ENTRY,
          match_results: [{ timestamp: '12:34', progress_seconds: 754, text_snippet: null }],
        },
      ],
      next_cursor: null,
    });
    renderHistory();

    // "1 match", not "1 matches" — the count comes from the shared string
    // rather than a hand-rolled concatenation.
    expect(await screen.findByText('1 match')).toBeInTheDocument();
  });

  it('marks a search that found nothing, instead of counting it as zero', async () => {
    fetchHistory.mockResolvedValue({ entries: [NO_MATCH], next_cursor: null });
    renderHistory();

    expect(await screen.findByText('Found nothing')).toBeInTheDocument();
    // "Found nothing" and "0 matches" are different claims, and a zero would
    // read as a search nobody ran.
    expect(screen.queryByText('0 matches')).not.toBeInTheDocument();
  });

  it('counts a legacy row that stored only seconds', async () => {
    fetchHistory.mockResolvedValue({ entries: [SECONDS_ONLY], next_cursor: null });
    renderHistory();

    // Old rows have no result snapshots but their timestamps are still the
    // moments that were found, so they count rather than read as unknown.
    expect(await screen.findByText('3 matches')).toBeInTheDocument();
  });

  it('does not pretend a row with nothing stored found zero', async () => {
    fetchHistory.mockResolvedValue({ entries: [UNTIMED], next_cursor: null });
    renderHistory();

    await screen.findByRole('link', { name: /replay .*no timestamp/i });
    // UNTIMED predates match recording: there is no number to show. "0 matches"
    // would be a fact about the video that nobody measured, and "found nothing"
    // would be a worse lie still — the row is not empty, it is unrecorded.
    expect(screen.queryByText('0 matches')).not.toBeInTheDocument();
    expect(screen.queryByText('Found nothing')).not.toBeInTheDocument();
    // No badge element at all, rather than one with no text in it.
    const row = screen.getByText('no timestamp').closest('li')!;
    expect(row.querySelectorAll('span')).toHaveLength(0);
  });

  it('describes an empty search as empty rather than as a position to resume', async () => {
    fetchHistory.mockResolvedValue({ entries: [NO_MATCH], next_cursor: null });
    renderHistory();

    const link = await screen.findByRole('link', { name: /never said/i });
    // NO_MATCH has no moment to seek to, so "from the start" would imply a
    // position that does not exist.
    expect(link).toHaveAccessibleName('Replay “never said” — it found nothing');
    expect(link).toHaveAttribute('title', 'Replay — found nothing');
  });

  it('does not refetch on every render', async () => {
    // The load effect keys on the error formatter. When that came back as a
    // fresh closure each render the effect re-ran each render, so the page
    // refetched its whole history on any state change — and a delete was undone
    // by the very next render before the row had a chance to disappear.
    fetchHistory.mockResolvedValue({ entries: [ENTRY, SAME_VIDEO], next_cursor: null });
    renderHistory();
    await waitFor(() => expect(screen.getByText('wrist pain')).toBeDefined());
    await screen.findByRole('button', { name: /delete the search for wrist pain/i });

    expect(fetchHistory).toHaveBeenCalledTimes(1);
  });
});

describe('replaying a saved search', () => {
  beforeEach(() => {
    fetchHistory.mockReset();
    onReplay.mockClear();
  });

  it('opens the video at the second the match was found', async () => {
    fetchHistory.mockResolvedValue({ entries: [ENTRY], next_cursor: null });
    renderHistory();

    const link = await screen.findByRole('link', {
      name: /replay .*how to type faster.* at 12:34/i,
    });
    expect(link.getAttribute('href')).toBe('/?v=abc123&t=754');

    await userEvent.click(link);
    // App owns the home view; the page only reports the moment it wants opened.
    // The keyword travels with the moment so the home view can name it.
    expect(onReplay).toHaveBeenCalledWith(expect.objectContaining(ENTRY));
  });

  it('leaves a modified click to the browser, so the link still opens elsewhere', async () => {
    fetchHistory.mockResolvedValue({ entries: [ENTRY], next_cursor: null });
    renderHistory();

    const link = await screen.findByRole('link', { name: /at 12:34/i });
    // jsdom would follow an un-cancelled navigation and warn about it; the
    // href is not what this test is about, the gesture is.
    link.removeAttribute('href');

    // Ctrl-click means "open this somewhere else", and the href already answers
    // that. Intercepting it would take the gesture away for nothing.
    const modified = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
      ctrlKey: true,
    });
    link.dispatchEvent(modified);
    expect(modified.defaultPrevented).toBe(false);
    expect(onReplay).not.toHaveBeenCalled();

    // A plain click is the app's, and must stop the browser navigating too.
    const plain = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(plain);
    expect(plain.defaultPrevented).toBe(true);
    // The keyword travels with the moment so the home view can name it.
    expect(onReplay).toHaveBeenCalledWith(expect.objectContaining(ENTRY));
  });

  it('hands over every stored result, so the replay can list them all', async () => {
    const MULTI = {
      ...ENTRY,
      match_results: [
        { timestamp: '00:10', progress_seconds: 10, text_snippet: 'first' },
        { timestamp: '15:00', progress_seconds: 900, text_snippet: 'second' },
      ],
    } as HistoryEntry;
    fetchHistory.mockResolvedValue({ entries: [MULTI], next_cursor: null });
    renderHistory();

    await userEvent.click(await screen.findByRole('link', { name: /at 12:34/i }));

    // The whole entry travels, results included. Handing over only video id,
    // seconds and keyword - as this did before - left the home view with one
    // moment and no way to know the search had found three.
    expect(onReplay).toHaveBeenCalledWith(
      expect.objectContaining({
        video_id: 'abc123',
        keyword: 'how to type faster',
        match_results: MULTI.match_results,
      }),
    );
  });

  it('hands over a search that found nothing as such, not as a moment at 00:00', async () => {
    fetchHistory.mockResolvedValue({ entries: [NO_MATCH], next_cursor: null });
    renderHistory();

    await userEvent.click(await screen.findByRole('link', { name: /never said/i }));

    // `status` is the part that matters: without it the home view cannot tell a
    // finished search that found nothing from one whose results have not
    // arrived, and shows a fabricated 00:00 match instead.
    expect(onReplay).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'not_found', match_results: [] }),
    );
  });

  it('names the moment in the tooltip without leaking the keyword placeholder', async () => {
    fetchHistory.mockResolvedValue({ entries: [ENTRY], next_cursor: null });
    renderHistory();

    const link = await screen.findByRole('link', { name: /replay .*how to type faster/i });
    // The tooltip is a different string from the accessible name and used to be
    // built without the keyword, so hovering a row showed a literal
    // "{{keyword}}" next to the timestamp.
    expect(link.getAttribute('title')).toBe('Replay at 12:34');
    expect(link.getAttribute('title')).not.toContain('{{');
  });

  it('shows the keyword alone, with no position beside it', async () => {
    fetchHistory.mockResolvedValue({ entries: [ENTRY], next_cursor: null });
    renderHistory();
    const link = await screen.findByRole('link', { name: /replay .*how to type faster/i });
    // The replay lists every moment the phrase was found, so a second printed
    // here implied this is the one place it appears. It stays in the tooltip and
    // the accessible name, which describe where the link goes.
    expect(link).toHaveTextContent('how to type faster');
    expect(link).not.toHaveTextContent('12:34');
    expect(screen.queryByText('12:34')).toBeNull();
  });

  it('opens from the top when the search has no recorded position', async () => {
    fetchHistory.mockResolvedValue({ entries: [UNTIMED], next_cursor: null });
    renderHistory();

    const link = await screen.findByRole('link', {
      name: /replay .*no timestamp.* from the start/i,
    });
    expect(link.getAttribute('href')).toBe('/?v=abc123&t=0');

    await userEvent.click(link);
    // 0 is the honest fallback: an old row has no moment, so it opens the video
    // rather than pretending the quote was at the very start.
    expect(onReplay).toHaveBeenCalledWith(expect.objectContaining(UNTIMED));
  });

  it('names the video with its title alone, no YouTube badge', async () => {
    fetchHistory.mockResolvedValue({ entries: [ENTRY], next_cursor: null });
    renderHistory();

    const title = await screen.findByText('Typing without looking down');
    // The badge was aria-hidden decoration in front of the title, so it never
    // carried meaning for anyone using a screen reader either. It is gone from
    // the visual row too: the title is the only thing naming the video.
    expect(title.closest('a')?.querySelector('svg')).toBeNull();
  });

  it('truncates a latin title at its end and keeps it right-aligned in arabic', async () => {
    const LONG = 'The Ultimate Guide to Learning Arabic';
    fetchHistory.mockResolvedValue({
      entries: [{ ...ENTRY, video_title: LONG }],
      next_cursor: null,
    });
    renderHistory();

    const title = await screen.findByText(LONG);
    // With the row's inherited rtl direction, `truncate` clips at the visual
    // *start*, so a latin title loses its opening words instead of showing an
    // ellipsis after them. `dir="auto"` resolves the box per title.
    expect(title.getAttribute('dir')).toBe('auto');
    // ...which then makes `text-align: start` resolve to left in an arabic UI,
    // so the right edge has to be pinned back explicitly.
    expect(title.className).toContain('rtl:text-right');
  });

  it('keeps each search on its own video at its own moment', async () => {
    fetchHistory.mockResolvedValue({
      entries: [ENTRY, { ...SAME_VIDEO, progress_seconds: 60 }],
      next_cursor: null,
    });
    renderHistory();

    expect((await screen.findByRole('link', { name: /at 12:34/i })).getAttribute('href')).toBe(
      '/?v=abc123&t=754',
    );
    expect(screen.getByRole('link', { name: /at 01:00/i }).getAttribute('href')).toBe(
      '/?v=abc123&t=60',
    );
  });
});

describe('delete confirmation', () => {
  // jsdom has no layout, so scrollIntoView is stubbed and the call is the
  // assertion: the panel has to be brought to the visitor, not merely rendered
  // somewhere above where they clicked.
  let scroller: ReturnType<typeof vi.fn>;
  let original: typeof Element.prototype.scrollIntoView;

  beforeEach(() => {
    fetchHistory.mockReset();
    deleteHistoryEntry.mockReset();
    deleteHistoryEntry.mockResolvedValue(undefined);
    scroller = vi.fn();
    original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView =
      scroller as unknown as typeof Element.prototype.scrollIntoView;
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = original;
  });

  it('scrolls to itself and takes focus when a row arms it', async () => {
    fetchHistory.mockResolvedValue({ entries: [ENTRY], next_cursor: null });
    renderHistory();
    await waitFor(() => expect(screen.getByText('how to type faster')).toBeDefined());

    await userEvent.click(
      screen.getByRole('button', { name: /delete the search for how to type faster/i }),
    );
    const dialog = await screen.findByRole('alertdialog');

    // Scrolled into view...
    expect(scroller).toHaveBeenCalled();
    expect(scroller.mock.contexts.at(-1)).toBe(dialog);
    // ...and focused, or Tab carries on from the trash button in a row that is
    // now somewhere off-screen entirely.
    expect(dialog).toHaveFocus();
  });

  it('re-anchors on the still-mounted heading once the row is deleted', async () => {
    fetchHistory.mockResolvedValue({ entries: [ENTRY], next_cursor: null });
    renderHistory();
    await waitFor(() => expect(screen.getByText('how to type faster')).toBeDefined());

    await userEvent.click(
      screen.getByRole('button', { name: /delete the search for how to type faster/i }),
    );
    await userEvent.click(screen.getByRole('button', { name: /delete this search/i }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());

    // The dialog is gone from the document, so anchoring on it would aim the
    // scroll at a detached node. The heading is still there to aim at.
    const target = scroller.mock.contexts.at(-1) as HTMLElement | undefined;
    expect(target).toBeTruthy();
    expect(target?.isConnected).toBe(true);
    expect(target?.tagName).toBe('HEADER');
  });
});

describe('account menu', () => {
  it('is where sign-out lives, once opened', async () => {
    const user = userEvent.setup();
    render(<AccountMenu />);
    // Closed until asked for, so the assertion has to open it the way a
    // visitor would rather than assume the panel is on the page.
    expect(screen.queryByRole('menuitem', { name: /^sign out$/i })).toBeNull();
    await user.click(screen.getByRole('button', { name: /a@example.com|account/i }));
    expect(screen.getByRole('menuitem', { name: /^sign out$/i })).toBeDefined();
  });
});
