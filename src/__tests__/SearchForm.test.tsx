import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setLanguage } from '../i18n';
import { SearchForm } from '../components/SearchForm';

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
    expect(screen.getByText('Please enter a valid YouTube URL.')).toBeInTheDocument();
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

  it('clears the url error as soon as the url is corrected', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    const url = screen.getByLabelText('YouTube URL');
    await user.type(url, 'https://example.com/video');
    await user.type(screen.getByLabelText('Word or phrase'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(screen.getByText('Please enter a valid YouTube URL.')).toBeInTheDocument();

    await user.clear(url);
    await user.type(url, 'https://youtu.be/abcdef12345');
    expect(screen.queryByText('Please enter a valid YouTube URL.')).not.toBeInTheDocument();
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
    expect(screen.queryByText('Please enter a valid YouTube URL.')).not.toBeInTheDocument();
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
});
