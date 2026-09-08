import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setLanguage } from '../i18n';
import { SearchForm } from '../components/SearchForm';
import type { SearchFormHandle } from '../components/SearchForm';
import { createRef } from 'react';

const onSubmit = vi.fn();

describe('SearchForm', () => {
  it('renders url and keyword inputs', () => {
    render(<SearchForm onSubmit={onSubmit} />);
    expect(screen.getByLabelText('YouTube URL')).toBeInTheDocument();
    expect(screen.getByLabelText('Word or phrase')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jump to the moment' })).toBeInTheDocument();
  });

  it('shows per-field errors when both fields are empty', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(screen.getByText('Please enter a YouTube URL.')).toBeInTheDocument();
    expect(screen.getByText('Please enter a word or phrase.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows url error when url is empty but keyword is filled', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Word or phrase'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(screen.getByText('Please enter a YouTube URL.')).toBeInTheDocument();
    expect(screen.queryByText('Please enter a word or phrase.')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows keyword error when keyword is empty but url is filled', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.type(
      screen.getByLabelText('YouTube URL'),
      'https://www.youtube.com/watch?v=abcdef12345',
    );
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(screen.getByText('Please enter a word or phrase.')).toBeInTheDocument();
    expect(screen.queryByText('Please enter a YouTube URL.')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows an error for an invalid url', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('YouTube URL'), 'https://example.com/video');
    await user.type(screen.getByLabelText('Word or phrase'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(screen.getByText('Only YouTube is supported. Paste a public YouTube watch link or a youtu.be share link.')).toBeInTheDocument();
    expect(screen.queryByText('Please enter a word or phrase.')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with trimmed values for a valid input', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.type(
      screen.getByLabelText('YouTube URL'),
      'https://www.youtube.com/watch?v=abcdef12345',
    );
    await user.type(screen.getByLabelText('Word or phrase'), '  hello world  ');
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=abcdef12345',
      'hello world',
    );
  });

  it('disables the button while searching', () => {
    render(<SearchForm onSubmit={onSubmit} disabled />);
    expect(screen.getByRole('button', { name: 'Searching…' })).toBeDisabled();
  });

  it('switches only the keyword input to RTL when Arabic text is typed', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    const url = screen.getByLabelText('YouTube URL');
    const keyword = screen.getByLabelText('Word or phrase');
    await user.type(keyword, 'مرحبا');
    expect(keyword.getAttribute('dir')).toBe('rtl');
    expect(url.getAttribute('dir')).toBe('ltr');
    expect(url).toHaveStyle({ textAlign: 'left', direction: 'ltr' });
    expect(url.className).toContain('search-input--ltr');
  });

  it('keeps the keyword input LTR for English text', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    const keyword = screen.getByLabelText('Word or phrase');
    await user.type(keyword, 'hello');
    expect(keyword.getAttribute('dir')).toBe('ltr');
  });

  it('aligns the Arabic placeholder to the right when Arabic mode is active', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    const keyword = screen.getByLabelText('Word or phrase');
    await user.type(keyword, 'مرحبا');
    expect(keyword.getAttribute('dir')).toBe('rtl');
    expect(keyword).toHaveStyle({ textAlign: 'right', direction: 'rtl' });
    expect(keyword.className).toContain('search-input--rtl');
  });

  it('opts out of native browser validation so only the localized errors show', () => {
    const { container } = render(<SearchForm onSubmit={onSubmit} />);
    expect(container.querySelector('form')).toHaveAttribute('novalidate');
  });

  it('focuses the url field when both fields are empty', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(screen.getByLabelText('YouTube URL')).toHaveFocus();
    expect(screen.getByLabelText('Word or phrase')).not.toHaveFocus();
  });

  it('focuses the url field first when it is invalid and the keyword is empty', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('YouTube URL'), 'https://example.com/video');
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(screen.getByLabelText('YouTube URL')).toHaveFocus();
  });

  it('focuses the keyword field when only the keyword is missing', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.type(
      screen.getByLabelText('YouTube URL'),
      'https://www.youtube.com/watch?v=abcdef12345',
    );
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(screen.getByLabelText('Word or phrase')).toHaveFocus();
  });

  it('marks the invalid field with a red border and exposes the error to AT', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    const url = screen.getByLabelText('YouTube URL');
    await user.type(screen.getByLabelText('Word or phrase'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(url).toHaveAttribute('aria-invalid', 'true');
    expect(url.className).toContain('border-danger');
    expect(url).toHaveAccessibleDescription('Please enter a YouTube URL.');
  });

  it('does not paint a valid URL red when only the phrase is missing', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} initialUrl="https://youtu.be/abcdef12345" />);
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(screen.getByLabelText('YouTube URL')).not.toHaveClass('border-danger');
    expect(screen.getByLabelText('YouTube URL')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByLabelText('Word or phrase')).toHaveClass('border-danger');
  });

  it('reserves URL-specific space for Paste, clear and error controls', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} initialUrl="invalid" initialKeyword="hello" />);
    const url = screen.getByLabelText('YouTube URL');
    expect(url).toHaveClass('pe-14');
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(url).toHaveClass('pe-22', 'border-danger');
    await user.clear(screen.getByLabelText('Word or phrase'));
    expect(url).toHaveClass('pe-22');
    await user.click(screen.getByRole('button', { name: 'Clear YouTube URL' }));
    expect(url).toHaveClass('pe-14');
  });

  it('aligns URL text, placeholder and controls RTL in the Arabic interface', async () => {
    await act(async () => setLanguage('ar'));
    render(<SearchForm onSubmit={onSubmit} initialUrl="https://youtu.be/abcdef12345" />);
    const url = screen.getByLabelText('رابط يوتيوب');
    expect(url).toHaveAttribute('dir', 'rtl');
    expect(url).toHaveStyle({ direction: 'rtl', textAlign: 'right' });
    expect(url).toHaveClass('search-input--rtl', 'placeholder:text-right');
    expect(url.parentElement).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('button', { name: 'لصق' }).parentElement?.parentElement).toBe(url.parentElement);
  });

  it('changes URL alignment with the UI language without changing its value or following the phrase', async () => {
    const value = 'https://www.youtube.com/watch?v=abcdef12345&t=90&list=PL123#details';
    render(<SearchForm onSubmit={onSubmit} initialUrl={value} initialKeyword="مرحبا" />);
    const url = screen.getByLabelText('YouTube URL');
    expect(url).toHaveStyle({ direction: 'ltr', textAlign: 'left' });
    expect(screen.getByLabelText('Word or phrase')).toHaveAttribute('dir', 'rtl');

    await act(async () => setLanguage('ar'));
    expect(url).toHaveStyle({ direction: 'rtl', textAlign: 'right' });
    expect(url).toHaveValue(value);
    expect(url.parentElement).toHaveAttribute('dir', 'rtl');

    await act(async () => setLanguage('en'));
    expect(url).toHaveStyle({ direction: 'ltr', textAlign: 'left' });
    expect(url).toHaveClass('search-input--ltr', 'placeholder:text-left');
    expect(url.parentElement).toHaveAttribute('dir', 'ltr');
    expect(url).toHaveValue(value);
    expect(screen.getByLabelText('Word or phrase')).toHaveAttribute('dir', 'rtl');
  });

  it('preserves the existing RTL phrase-field contract in Arabic mode without changing Latin text', async () => {
    await act(async () => setLanguage('ar'));
    const value = 'hello (world) — 01:15';
    render(<SearchForm onSubmit={onSubmit} initialKeyword={value} />);
    const phrase = screen.getByLabelText('كلمة أو عبارة');
    expect(phrase).toHaveStyle({ direction: 'rtl', textAlign: 'right' });
    expect(phrase).toHaveValue(value);
  });

  it('submits the original URL including query parameters from the RTL field', async () => {
    const user = userEvent.setup();
    const value = 'https://www.youtube.com/watch?v=abcdef12345&t=90&list=PL123#details';
    await act(async () => setLanguage('ar'));
    render(<SearchForm onSubmit={onSubmit} initialUrl={value} initialKeyword="hello" />);
    await user.click(screen.getByRole('button', { name: 'انتقل إلى اللحظة' }));
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(value, 'hello');
  });

  it('clears the url error as soon as the url is corrected', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    const url = screen.getByLabelText('YouTube URL');
    await user.type(url, 'https://example.com/video');
    await user.type(screen.getByLabelText('Word or phrase'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(screen.getByText('Only YouTube is supported. Paste a public YouTube watch link or a youtu.be share link.')).toBeInTheDocument();

    await user.clear(url);
    await user.type(url, 'https://youtu.be/abcdef12345');
    expect(screen.queryByText('Only YouTube is supported. Paste a public YouTube watch link or a youtu.be share link.')).not.toBeInTheDocument();
    expect(url).not.toHaveAttribute('aria-invalid');
    expect(url.className).not.toContain('border-danger');
  });

  it('clears the keyword error as soon as a keyword is typed', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.type(
      screen.getByLabelText('YouTube URL'),
      'https://www.youtube.com/watch?v=abcdef12345',
    );
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(screen.getByText('Please enter a word or phrase.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Word or phrase'), 'h');
    expect(screen.queryByText('Please enter a word or phrase.')).not.toBeInTheDocument();
  });

  it('leaves a valid form untouched until submit', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('YouTube URL'), 'not a url yet');
    expect(screen.queryByText('Only YouTube is supported. Paste a public YouTube watch link or a youtu.be share link.')).not.toBeInTheDocument();
  });

  it('keeps the error message in the language the user switches to', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(screen.getByText('Please enter a YouTube URL.')).toBeInTheDocument();

    await act(async () => {
      setLanguage('ar');
    });
    expect(screen.getByText('يرجى إدخال رابط يوتيوب.')).toBeInTheDocument();
    expect(screen.queryByText('Please enter a YouTube URL.')).not.toBeInTheDocument();
  });

  it('renders Paste as a quiet in-field icon action, never a primary button', () => {
    render(<SearchForm onSubmit={onSubmit} />);
    const paste = screen.getByRole('button', { name: 'Paste' });
    expect(paste).toBeInTheDocument();
    // Icon-only: no visible label, and none of the primary CTA's fill/shadow.
    expect(paste.querySelector('svg')).toBeInTheDocument();
    expect(paste.textContent).toBe('');
    expect(paste.className).not.toContain('bg-action');
    expect(paste.className).not.toContain('shadow');
    expect(paste.className).not.toContain('border-');
    // Kept discoverable for AT + mouse users.
    expect(paste).toHaveAttribute('title', 'Paste YouTube URL from clipboard');
    expect(paste).toHaveAttribute('aria-keyshortcuts', 'Control+V Meta+V');
  });

  it('condenses the helper microcopy into bullets with the detail behind a popover', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);

    const bullets = screen.getByRole('list');
    expect(within(bullets).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Public YouTube videos (watch / youtu.be links).')).toBeInTheDocument();
    expect(screen.getByText('First search: a few minutes. Cached searches are usually faster.')).toBeInTheDocument();
    expect(screen.getByText('Nothing is stored beyond the session cache.')).toBeInTheDocument();
    // The long paragraph no longer sits in the reading flow.
    expect(screen.queryByText(/Transcripts are kept only in the session cache/)).not.toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: 'Privacy & how it works' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByText(/Transcripts are kept only in the session cache/),
    ).toBeInTheDocument();
  });

  it('flips and bounds the help popover when its trigger is near a viewport edge', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    const trigger = screen.getByRole('button', { name: 'Privacy & how it works' });
    const bounds = vi.spyOn(trigger, 'getBoundingClientRect');
    bounds.mockReturnValue(new DOMRect(10, 10, 240, 28));
    await user.click(trigger);
    expect(screen.getByRole('group', { name: 'Data & timing' })).toHaveClass('top-full');
    bounds.mockReturnValue(new DOMRect(10, window.innerHeight - 40, 240, 28));
    fireEvent(window, new Event('resize'));
    expect(screen.getByRole('group', { name: 'Data & timing' })).toHaveClass('bottom-full');
    expect(screen.getByRole('group', { name: 'Data & timing' })).toHaveStyle({ maxHeight: '384px' });
    bounds.mockReturnValue(new DOMRect(10, -100, 240, 28));
    fireEvent(window, new Event('scroll'));
    expect(screen.queryByRole('group', { name: 'Data & timing' })).not.toBeInTheDocument();
  });

  it('closes the helper popover on Escape and on an outside click', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    const trigger = screen.getByRole('button', { name: 'Privacy & how it works' });

    await user.click(trigger);
    expect(screen.getByText(/Transcripts are kept only in the session cache/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByText(/Transcripts are kept only in the session cache/)).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.click(document.body);
    expect(screen.queryByText(/Transcripts are kept only in the session cache/)).not.toBeInTheDocument();
  });

  it('translates the helper bullets and the popover trigger with the UI language', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Privacy & how it works' }));
    expect(screen.getByText('Public YouTube videos (watch / youtu.be links).')).toBeInTheDocument();

    await act(async () => {
      setLanguage('ar');
    });
    expect(screen.getByRole('button', { name: 'الخصوصية وطريقة العمل' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText('لا يُخزَّن شيء بعد انتهاء جلسة المتصفح.')).toBeInTheDocument();
    expect(screen.queryByText('Public YouTube videos (watch / youtu.be links).')).not.toBeInTheDocument();
  });
});

describe('source guidance, locked searches and clipboard recovery', () => {
  const urlValue = 'https://youtu.be/abcdef12345';

  it.each(['shorts', 'live', 'embed'])('gives correction instructions for a %s URL', async (format) => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} initialUrl={`https://youtube.com/${format}/abcdef12345`} initialKeyword="hello" />);
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Open the video’s watch page');
    expect(screen.getByLabelText('YouTube URL')).toHaveFocus();
    expect(screen.getByLabelText('YouTube URL')).toHaveClass('border-danger');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps invalid-link guidance distinct from unsupported-source guidance', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} initialUrl="not a link" initialKeyword="hello" />);
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(screen.getByRole('alert')).toHaveTextContent('This link does not identify a YouTube video.');
  });

  it('locks both fields and their actions while a search is in progress', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} disabled initialUrl={urlValue} initialKeyword="hello" />);
    const url = screen.getByLabelText('YouTube URL');
    const keyword = screen.getByLabelText('Word or phrase');
    expect(url).toHaveAttribute('readonly');
    expect(keyword).toHaveAttribute('readonly');
    expect(url).toHaveAccessibleDescription(
      'Search in progress. The URL and phrase are locked until the transcript is ready.',
    );
    await user.type(url, 'changed');
    await user.type(keyword, 'changed');
    expect(url).toHaveValue(urlValue);
    expect(keyword).toHaveValue('hello');
    expect(screen.getByRole('button', { name: 'Paste' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Clear YouTube URL' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear word or phrase' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel search' })).not.toBeInTheDocument();
  });

  it('submits current edits through the imperative retry entry point', () => {
    const ref = createRef<SearchFormHandle>();
    render(<SearchForm ref={ref} onSubmit={onSubmit} initialUrl={urlValue} initialKeyword="old" />);
    fireEvent.change(screen.getByLabelText('Word or phrase'), { target: { value: 'new phrase' } });
    act(() => ref.current?.submit());
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(urlValue, 'new phrase');
  });

  it('gives the field buttons 44px targets without squeezing two buttons inside the URL field', () => {
    render(<SearchForm onSubmit={onSubmit} initialUrl={urlValue} initialKeyword="hello" />);
    for (const name of ['Paste', 'Clear YouTube URL', 'Clear word or phrase']) {
      expect(screen.getByRole('button', { name })).toHaveClass('h-11', 'w-11');
    }
    const url = screen.getByLabelText('YouTube URL');
    expect(url.parentElement).toContainElement(screen.getByRole('button', { name: 'Paste' }));
    expect(url.parentElement).not.toContainElement(screen.getByRole('button', { name: 'Clear YouTube URL' }));
  });

  it('offers manual recovery when the Clipboard API is unavailable', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue(undefined as unknown as Clipboard);
    render(<SearchForm onSubmit={onSubmit} initialUrl={urlValue} />);
    await user.click(screen.getByRole('button', { name: 'Paste' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Clipboard access isn’t available here.');
    expect(screen.getByLabelText('YouTube URL')).toHaveValue(urlValue);
  });

  it('pastes successfully and focuses the URL field', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'readText').mockResolvedValue(`  ${urlValue}  `);
    render(<SearchForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Paste' }));
    const input = screen.getByLabelText<HTMLInputElement>('YouTube URL');
    await waitFor(() => expect(input).toHaveFocus());
    expect(input).toHaveValue(urlValue);
    expect(input.selectionStart).toBe(urlValue.length);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each(['denied', 'empty'] as const)('preserves the URL and offers mobile/keyboard recovery for a %s clipboard', async (reason) => {
    const user = userEvent.setup();
    const read = vi.spyOn(navigator.clipboard, 'readText');
    if (reason === 'denied') read.mockRejectedValue(new Error('denied'));
    else read.mockResolvedValue('   ');
    render(<SearchForm onSubmit={onSubmit} initialUrl={urlValue} />);
    await user.click(screen.getByRole('button', { name: 'Paste' }));
    const notice = screen.getByRole('alert');
    expect(notice).toHaveTextContent(reason === 'denied' ? 'Clipboard access isn’t available here.' : 'Your clipboard is empty.');
    expect(notice).toHaveTextContent('On a phone, touch and hold the URL field and choose Paste.');
    expect(notice).toHaveTextContent('Ctrl/⌘+V');
    const input = screen.getByLabelText<HTMLInputElement>('YouTube URL');
    await waitFor(() => expect(input).toHaveFocus());
    expect(input).toHaveValue(urlValue);
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, urlValue.length]);
    await user.type(input, 'https://youtu.be/zyxwvut9876');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not hide clipboard recovery behind an existing URL validation error', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'readText').mockRejectedValue(new Error('denied'));
    render(<SearchForm onSubmit={onSubmit} initialUrl="invalid" initialKeyword="hello" />);
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    await user.click(screen.getByRole('button', { name: 'Paste' }));
    const input = screen.getByLabelText('YouTube URL');
    expect(input).toHaveAccessibleDescription(/This link does not identify a YouTube video/);
    expect(input).toHaveAccessibleDescription(/Clipboard access isn’t available here/);
    expect(document.getElementById('url-paste-notice')).toBeInTheDocument();
  });

  it('localizes manual paste instructions while isolating the keyboard shortcut', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'readText').mockRejectedValue(new Error('denied'));
    await act(async () => setLanguage('ar'));
    render(<SearchForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'لصق' }));
    expect(screen.getByRole('alert')).toHaveTextContent('اضغط مطولًا داخل حقل الرابط');
    expect(screen.getByText('Ctrl/⌘+V')).toHaveAttribute('dir', 'ltr');
  });

  it('ignores clipboard responses that arrive after the fields become locked', async () => {
    const user = userEvent.setup();
    let resolve!: (value: string) => void;
    vi.spyOn(navigator.clipboard, 'readText').mockReturnValue(new Promise((res) => { resolve = res; }));
    const { rerender } = render(<SearchForm onSubmit={onSubmit} initialUrl={urlValue} />);
    await user.click(screen.getByRole('button', { name: 'Paste' }));
    rerender(<SearchForm onSubmit={onSubmit} disabled initialUrl={urlValue} />);
    await act(async () => resolve('https://youtu.be/zyxwvut9876'));
    expect(screen.getByLabelText('YouTube URL')).toHaveValue(urlValue);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
