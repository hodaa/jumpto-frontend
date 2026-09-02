import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SearchForm } from '../components/SearchForm';
import * as api from '../api/client';

const onSubmit = vi.fn();

describe('SearchForm', () => {
  it('renders url and keyword inputs', () => {
    render(<SearchForm onSubmit={onSubmit} />);
    expect(screen.getByLabelText('Video URL')).toBeInTheDocument();
    expect(screen.getByLabelText('Keyword or phrase')).toBeInTheDocument();
    expect(screen.getByLabelText('Transcript Language')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jump to the moment' })).toBeInTheDocument();
  });

  it('shows per-field errors when both fields are empty', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(screen.getByText('Please enter a Video URL.')).toBeInTheDocument();
    expect(screen.getByText('Please enter a keyword.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows url error when url is empty but keyword is filled', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Keyword or phrase'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(screen.getByText('Please enter a Video URL.')).toBeInTheDocument();
    expect(screen.queryByText('Please enter a keyword.')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows keyword error when keyword is empty but url is filled', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.type(
      screen.getByLabelText('Video URL'),
      'https://www.youtube.com/watch?v=abcdef12345',
    );
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(screen.getByText('Please enter a keyword.')).toBeInTheDocument();
    expect(screen.queryByText('Please enter a Video URL.')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows an error for an invalid url', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Video URL'), 'https://example.com/video');
    await user.type(screen.getByLabelText('Keyword or phrase'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(screen.getByText('Please enter a valid Video URL.')).toBeInTheDocument();
    expect(screen.queryByText('Please enter a keyword.')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with trimmed values for a valid input', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.type(
      screen.getByLabelText('Video URL'),
      'https://www.youtube.com/watch?v=abcdef12345',
    );
    await user.type(screen.getByLabelText('Keyword or phrase'), '  hello world  ');
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=abcdef12345',
      'hello world',
    );
  });

  it('disables the button while searching', () => {
    render(<SearchForm onSubmit={onSubmit} disabled />);
    expect(screen.getByRole('button', { name: 'Searching...' })).toBeDisabled();
  });

  it('switches the keyword input to RTL when Arabic text is typed', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    const keyword = screen.getByLabelText('Keyword or phrase');
    await user.type(keyword, 'مرحبا');
    expect(keyword.getAttribute('dir')).toBe('rtl');
  });

  it('keeps the keyword input LTR for English text', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    const keyword = screen.getByLabelText('Keyword or phrase');
    await user.type(keyword, 'hello');
    expect(keyword.getAttribute('dir')).toBe('ltr');
  });

  it('aligns the Arabic placeholder to the right when Arabic mode is active', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    const keyword = screen.getByLabelText('Keyword or phrase');
    await user.type(keyword, 'مرحبا');
    expect(keyword.getAttribute('dir')).toBe('rtl');
    expect(keyword).toHaveStyle({ textAlign: 'right', direction: 'rtl' });
    expect(keyword.className).toContain('search-input--rtl');
  });

  it('auto-detects the video language from a valid YouTube URL', async () => {
    const fetchVideoLanguage = vi.spyOn(api, 'fetchVideoLanguage').mockResolvedValue({
      language: 'ar',
    });
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Video URL'), 'https://www.youtube.com/watch?v=abcdef12345');
    await waitFor(() => expect(fetchVideoLanguage).toHaveBeenCalledWith('abcdef12345'));
    await waitFor(() =>
      expect(screen.getByLabelText('Transcript Language')).toHaveValue('ar'),
    );
    fetchVideoLanguage.mockRestore();
  });

  it('keeps the default language when language detection fails', async () => {
    const fetchVideoLanguage = vi.spyOn(api, 'fetchVideoLanguage').mockRejectedValue(
      new Error('not found'),
    );
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Video URL'), 'https://www.youtube.com/watch?v=abcdef12345');
    await waitFor(() => expect(fetchVideoLanguage).toHaveBeenCalledWith('abcdef12345'));
    await waitFor(() =>
      expect(screen.getByLabelText('Transcript Language')).toHaveValue('en'),
    );
    fetchVideoLanguage.mockRestore();
  });
});