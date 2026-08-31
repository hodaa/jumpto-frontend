import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorView } from '../components/ErrorView';
import { StatusCard } from '../components/StatusCard';

describe('ErrorView', () => {
  it('translates a message key', () => {
    render(<ErrorView message="error.network" onRetry={vi.fn()} />);
    expect(
      screen.getByText('Could not reach the server. Check that the backend is running.'),
    ).toBeInTheDocument();
  });

  it('shows a raw message when it is not a translation key', () => {
    render(<ErrorView message="Transcription failed: exceeded quota" onRetry={vi.fn()} />);
    expect(screen.getByText('Transcription failed: exceeded quota')).toBeInTheDocument();
  });

  it('triggers retry', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<ErrorView message="error.server" onRetry={onRetry} />);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('StatusCard', () => {
  it('renders a determinate progress value', () => {
    render(<StatusCard progress={42} />);
    expect(screen.getByText('Progress: 42%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
  });

  it('renders an indeterminate message when progress is unknown', () => {
    render(<StatusCard progress={null} />);
    expect(
      screen.getByText(
        'This can take a few minutes. We will show your results as soon as the transcript is ready.',
      ),
    ).toBeInTheDocument();
  });
});
