import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResetPasswordPage } from '../components/auth/ResetPasswordPage';

/**
 * The reset page picks its view from the token in the URL, and the token is
 * deliberately stripped once the link has been spent. That left "no token"
 * meaning both "never had a link" and "just set a password", so a refresh after
 * a successful reset offered to send another link as if nothing had happened.
 */
function setLocation(url: string) {
  window.history.replaceState(null, '', url);
}

const sendLink = () => screen.queryByRole('button', { name: /send reset link/i });
const updated = () => screen.queryByRole('heading', { level: 1, name: /password updated/i });

describe('reset password page', () => {
  beforeEach(() => {
    setLocation('/reset-password');
  });

  it('offers to send a link when there is no token at all', () => {
    render(<ResetPasswordPage />);
    expect(sendLink()).not.toBeNull();
    expect(updated()).toBeNull();
  });

  it('asks for a new password when the emailed link carries a token', () => {
    setLocation('/reset-password?token=a-real-looking-token');
    render(<ResetPasswordPage />);
    expect(screen.getByLabelText('New password')).toBeDefined();
    // No point offering a reset link to someone holding a valid one.
    expect(sendLink()).toBeNull();
  });

  it('still confirms a completed reset, and offers no new link, after a reload', () => {
    // The regression: the success state lived in memory only, so reloading the
    // spent link landed back on "send a link to set a password".
    setLocation('/reset-password?completed=1');
    render(<ResetPasswordPage />);
    expect(updated()).not.toBeNull();
    expect(sendLink()).toBeNull();
  });

  it('leaves no way back to the request form from a completed reset', () => {
    setLocation('/reset-password?completed=1');
    render(<ResetPasswordPage />);
    expect(screen.queryByLabelText(/email address/i)).toBeNull();
  });
});

describe('completing a reset', () => {
  const TOKEN = 'a-real-looking-token';

  beforeEach(() => {
    setLocation(`/reset-password?token=${TOKEN}`);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      } as unknown as Response),
    );
  });

  async function setPassword() {
    const user = userEvent.setup();
    render(<ResetPasswordPage />);
    await user.type(screen.getByLabelText('New password'), 'a-valid-password');
    await user.type(screen.getByLabelText('Confirm new password'), 'a-valid-password');
    await user.click(screen.getByRole('button', { name: /set new password/i }));
    await waitFor(() => expect(updated()).not.toBeNull());
  }

  it('shows the confirmation and stops offering a reset link', async () => {
    await setPassword();
    expect(sendLink()).toBeNull();
  });

  it('takes the spent token out of the address bar', async () => {
    await setPassword();
    expect(window.location.search).not.toContain('token');
    expect(window.location.search).toContain('completed=1');
  });

  it('survives a reload, so the visitor is not asked for another link', async () => {
    // The address bar is the only thing that outlives a reload, so the marker
    // written on success is what has to carry the state.
    await setPassword();
    cleanup();
    render(<ResetPasswordPage />);
    expect(updated()).not.toBeNull();
    expect(sendLink()).toBeNull();
  });
});
