import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SearchForm } from '../components/SearchForm';

const onSubmit = vi.fn();

describe('SearchForm', () => {
  it('renders url, keyword and language inputs', () => {
    render(<SearchForm onSubmit={onSubmit} />);
    expect(screen.getByLabelText('YouTube URL')).toBeInTheDocument();
    expect(screen.getByLabelText('Keyword or phrase')).toBeInTheDocument();
    expect(screen.getByLabelText('Search language')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jump to the moment' })).toBeInTheDocument();
  });

  it('shows per-field errors when both fields are empty', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(screen.getByText('Please enter a YouTube URL.')).toBeInTheDocument();
    expect(screen.getByText('Please enter a keyword.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows url error when url is empty but keyword is filled', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Keyword or phrase'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(screen.getByText('Please enter a YouTube URL.')).toBeInTheDocument();
    expect(screen.queryByText('Please enter a keyword.')).not.toBeInTheDocument();
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
    expect(screen.getByText('Please enter a keyword.')).toBeInTheDocument();
    expect(screen.queryByText('Please enter a YouTube URL.')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows an error for an invalid url', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('YouTube URL'), 'https://example.com/video');
    await user.type(screen.getByLabelText('Keyword or phrase'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(screen.getByText('Please enter a valid YouTube URL.')).toBeInTheDocument();
    expect(screen.queryByText('Please enter a keyword.')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with trimmed values for a valid input', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.type(
      screen.getByLabelText('YouTube URL'),
      'https://www.youtube.com/watch?v=abcdef12345',
    );
    await user.type(screen.getByLabelText('Keyword or phrase'), '  hello world  ');
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=abcdef12345',
      'hello world',
      'en',
    );
  });

  it('submits the selected search language', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={onSubmit} />);
    await user.type(
      screen.getByLabelText('YouTube URL'),
      'https://www.youtube.com/watch?v=abcdef12345',
    );
    await user.type(screen.getByLabelText('Keyword or phrase'), 'hello');
    await user.selectOptions(screen.getByLabelText('Search language'), 'ar');
    await user.click(screen.getByRole('button', { name: 'Jump to the moment' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=abcdef12345',
      'hello',
      'ar',
    );
  });

  it('disables the button while searching', () => {
    render(<SearchForm onSubmit={onSubmit} disabled />);
    expect(screen.getByRole('button', { name: 'Searching...' })).toBeDisabled();
  });
});
