import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorView } from '../components/ErrorView';
import { StatusCard } from '../components/StatusCard';

describe('ErrorView', () => {
  it('translates a message key', () => {
    render(<ErrorView message="error.network" onRetry={vi.fn()} />);
    expect(
      screen.getByText('Could not connect. Check your internet connection and try again. If it continues, please try later.'),
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
    expect(screen.getAllByText('Progress: 42%')[0]).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
    expect(
      screen.queryByText('Still working… this is taking longer than usual.'),
    ).not.toBeInTheDocument();
  });

  it('shows a "still working" stall cue at the 90% cap', () => {
    render(<StatusCard progress={90} />);
    expect(
      screen.getByText('Still working… this is taking longer than usual.'),
    ).toBeInTheDocument();
  });

  it('does not show the stall cue once progress reaches 100%', () => {
    render(<StatusCard progress={100} />);
    expect(
      screen.queryByText('Still working… this is taking longer than usual.'),
    ).not.toBeInTheDocument();
  });

  it('renders an indeterminate progress bar when progress is unknown', () => {
    render(<StatusCard progress={null} />);
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
  });

  it('humanizes long ETAs as whole minutes', () => {
    render(<StatusCard progress={40} estimatedSeconds={150} />);
    expect(screen.getByText('Estimated time remaining: ~3 minutes')).toBeInTheDocument();
  });

  it('keeps sub-minute ETAs in seconds', () => {
    render(<StatusCard progress={40} estimatedSeconds={42} />);
    expect(screen.getByText('Estimated time remaining: ~42s')).toBeInTheDocument();
  });

  it('renders the status stepper steps', () => {
    render(<StatusCard progress={null} />);
    expect(screen.getByText('Fetching transcript…')).toBeInTheDocument();
    expect(screen.getByText('Finding timestamps…')).toBeInTheDocument();
  });

  it('shows a Cancel affordance when onCancel is provided', () => {
    const onCancel = vi.fn();
    render(<StatusCard progress={40} onCancel={onCancel} />);
    expect(screen.getByRole('button', { name: 'Cancel search' })).toBeEnabled();
  });

  it('omits the Cancel affordance without onCancel', () => {
    render(<StatusCard progress={40} />);
    expect(screen.queryByRole('button', { name: 'Cancel search' })).not.toBeInTheDocument();
  });
});
