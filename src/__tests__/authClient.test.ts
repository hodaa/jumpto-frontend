import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_UNAUTHENTICATED_EVENT,
  AuthApiError,
  clearHistory,
  currentCsrfToken,
  deleteHistoryEntry,
  fetchHistory,
  fetchSession,
  loginAccount,
  loginWithGoogle,
  logoutAccount,
  registerAccount,
  requestPasswordReset,
  confirmPasswordReset,
  setCsrfToken,
  verifyEmailToken,
} from '../api/authClient';

function jsonResponse(data: unknown, status = 200, ok = true): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
  } as unknown as Response;
}

/** Error envelope exactly as app/core/exceptions.py renders it. */
function errorResponse(code: string, status: number, message = 'nope'): Response {
  return jsonResponse({ error: { code, message } }, status, false);
}

const USER = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'a@example.com',
  email_verified: true,
  created_at: '2026-01-01T00:00:00Z',
};

const SESSION = { user: USER, csrf_token: 'csrf-from-session' };

/** The path portion of a fetch call, past any VITE_API_BASE_URL prefix. */
function pathOf(call: [string, RequestInit]): string {
  const url = call[0];
  const apiIndex = url.indexOf('/api');
  return apiIndex === -1 ? url : url.slice(apiIndex);
}

function headersOf(call: [string, RequestInit]): Record<string, string> {
  return (call[1].headers ?? {}) as Record<string, string>;
}

describe('auth client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    // Each test starts from a known token so one test's session cannot leak a
    // header into the next one's assertion.
    setCsrfToken('csrf-from-build');
  });

  describe('credentials', () => {
    it('sends cookies on every call, because the session is an HttpOnly cookie', async () => {
      // Without this the whole flow silently becomes anonymous: the token
      // lives in a cookie JavaScript cannot read, so the browser only attaches
      // it when the request opts in.
      fetchMock.mockResolvedValue(jsonResponse(SESSION));
      await fetchSession();
      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(call[1].credentials).toBe('include');
    });

    it('sends cookies on a mutation too, not just on reads', async () => {
      fetchMock.mockResolvedValue(jsonResponse(null, 204));
      await logoutAccount();
      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(call[1].credentials).toBe('include');
    });
  });

  describe('CSRF', () => {
    it('echoes the token from the session endpoint on a mutation', async () => {
      fetchMock.mockResolvedValue(jsonResponse(SESSION));
      await fetchSession();
      expect(currentCsrfToken()).toBe('csrf-from-session');

      fetchMock.mockResolvedValue(jsonResponse(null, 204));
      await clearHistory();
      const call = fetchMock.mock.calls[1] as [string, RequestInit];
      expect(headersOf(call)['X-CSRF-Token']).toBe('csrf-from-session');
    });

    it('sends the token on a history delete', async () => {
      fetchMock.mockResolvedValue(jsonResponse(null, 204));
      await deleteHistoryEntry('22222222-2222-2222-2222-222222222222');
      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(call[1].method).toBe('DELETE');
      expect(headersOf(call)['X-CSRF-Token']).toBe('csrf-from-build');
    });

    it('never sends the token on a read', async () => {
      // A GET with the header is harmless but leaks a value into access logs
      // and any third party that sees the request line.
      fetchMock.mockResolvedValue(jsonResponse({ entries: [], next_cursor: null }));
      await fetchHistory();
      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(headersOf(call)['X-CSRF-Token']).toBeUndefined();
    });

    it('omits the token on sign-in, where there is no session to protect', async () => {
      // Sending it here would be pointless at best: the backend rejects a CSRF
      // header on an unauthenticated call, so a stale token would fail the login.
      fetchMock.mockResolvedValue(
        jsonResponse({ user: USER, token: 'opaque', expires_at: '2026-02-01T00:00:00Z' }),
      );
      await loginAccount('a@example.com', 'hunter2hunter2');
      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(headersOf(call)['X-CSRF-Token']).toBeUndefined();
    });
  });

  describe('error codes', () => {
    it('surfaces the backend code rather than the status', async () => {
      // The UI is translated from the code. Keying off the status would lose
      // the distinction between a wrong password and a locked account, which
      // share one status in some paths and differ in the message shown.
      fetchMock.mockResolvedValue(errorResponse('ACCOUNT_LOCKED', 423));
      await expect(loginAccount('a@example.com', 'wrongpassword')).rejects.toMatchObject({
        code: 'ACCOUNT_LOCKED',
        serverMessage: 'nope',
      });
    });

    it('maps a network failure to NETWORK rather than throwing a TypeError', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      await expect(loginAccount('a@example.com', 'password1')).rejects.toMatchObject({
        code: 'NETWORK',
      });
    });

    it('falls back to a status-derived code when the body is not the envelope', async () => {
      // A proxy or the host's own error page can answer with HTML. The visitor
      // still has to be told something, and it must not be a raw parse error.
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.reject(new SyntaxError('Unexpected token <')),
      } as unknown as Response);
      await expect(fetchSession()).rejects.toMatchObject({ code: 'SERVER' });
    });
  });

  describe('fetchSession', () => {
    it('returns null for a signed-out visitor instead of throwing', async () => {
      // Being signed out is the common case, not a failure. Throwing would make
      // every anonymous page load look like a broken site.
      fetchMock.mockResolvedValue(errorResponse('UNAUTHENTICATED', 401));
      await expect(fetchSession()).resolves.toBeNull();
    });

    it('rethrows a server error, because that is not a signed-out state', async () => {
      fetchMock.mockResolvedValue(errorResponse('SERVER', 500));
      await expect(fetchSession()).rejects.toBeInstanceOf(AuthApiError);
    });
  });

  describe('history', () => {
    it('url-encodes the cursor so a tampered value cannot break the query', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ entries: [], next_cursor: null }));
      await fetchHistory('a&b=c');
      expect(pathOf(fetchMock.mock.calls[0] as [string, RequestInit])).toBe(
        '/api/v1/history?cursor=a%26b%3Dc',
      );
    });

    it('sends the first page with no cursor at all', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ entries: [], next_cursor: null }));
      await fetchHistory();
      expect(pathOf(fetchMock.mock.calls[0] as [string, RequestInit])).toBe('/api/v1/history');
    });
  });

  describe('account endpoints', () => {
    it('registers with the field names the backend schema expects', async () => {
      fetchMock.mockResolvedValue(jsonResponse(USER, 201));
      await registerAccount('a@example.com', 'hunter2hunter2');
      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(pathOf(call)).toBe('/api/v1/auth/register');
      expect(JSON.parse(call[1].body as string)).toEqual({
        email: 'a@example.com',
        password: 'hunter2hunter2',
      });
    });

    it('posts the Google ID token under the snake_case key the backend reads', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ user: USER, token: 'opaque', expires_at: '2026-02-01T00:00:00Z' }),
      );
      await loginWithGoogle('header.payload.signature');
      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(pathOf(call)).toBe('/api/v1/auth/google');
      expect(JSON.parse(call[1].body as string)).toEqual({
        id_token: 'header.payload.signature',
      });
    });

    it('returns the signed-in user from a Google sign-in', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ user: USER, token: 'opaque', expires_at: '2026-02-01T00:00:00Z' }),
      );
      await expect(loginWithGoogle('t')).resolves.toMatchObject({ user: USER });
    });

    it('reports a locked account with the code the UI can explain', async () => {
      fetchMock.mockResolvedValue(errorResponse('ACCOUNT_LOCKED', 423));
      await expect(loginWithGoogle('t')).rejects.toMatchObject({ code: 'ACCOUNT_LOCKED' });
    });

    it('sends the reset token as a query-safe body, not a path segment', async () => {
      fetchMock.mockResolvedValue(jsonResponse(null, 202));
      await requestPasswordReset('a@example.com');
      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(pathOf(call)).toBe('/api/v1/auth/password-reset');
      expect(JSON.parse(call[1].body as string)).toEqual({ email: 'a@example.com' });
    });

    it('confirms a reset with the token and the new password', async () => {
      fetchMock.mockResolvedValue(jsonResponse(null, 202));
      await confirmPasswordReset('tok123', 'brandnewpass');
      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(pathOf(call)).toBe('/api/v1/auth/password-reset/confirm');
      expect(JSON.parse(call[1].body as string)).toEqual({
        token: 'tok123',
        password: 'brandnewpass',
      });
    });

    it('verifies an email with the token from the emailed link', async () => {
      fetchMock.mockResolvedValue(jsonResponse(USER));
      await verifyEmailToken('tok123');
      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(pathOf(call)).toBe('/api/v1/auth/verify');
      expect(JSON.parse(call[1].body as string)).toEqual({ token: 'tok123' });
    });
  });

  describe('empty responses', () => {
    it('treats 204 as success with no body', async () => {
      // The delete endpoints answer 204. Calling res.json() on that throws,
      // which would surface to the visitor as a failure for a request that
      // actually succeeded.
      fetchMock.mockResolvedValue({ ok: true, status: 204 } as unknown as Response);
      await expect(clearHistory()).resolves.toBeUndefined();
    });

    it('treats 202 as success with no body', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 202 } as unknown as Response);
      await expect(requestPasswordReset('a@example.com')).resolves.toBeUndefined();
    });
  });

  describe('error codes when the body is not the error envelope', () => {
    /**
     * FastAPI answers its own request-validation failures with `{"detail": [...]}`,
     * not the `{ error: { code, message } }` envelope. That body parses as JSON, so
     * the old mapper kept its `SERVER` default and a 422 for a password one
     * character too short reached the visitor as "something went wrong on our
     * side, try again shortly" - untrue, and nothing they could act on.
     */
    const fastapiValidation = {
      detail: [
        {
          type: 'string_too_short',
          loc: ['body', 'password'],
          msg: 'String should have at least 10 characters',
          ctx: { min_length: 10 },
        },
      ],
    };

    it('reports a 422 as VALIDATION, not SERVER', async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify(fastapiValidation), { status: 422 }));
      await expect(confirmPasswordReset('t'.repeat(30), 'short')).rejects.toMatchObject({
        code: 'VALIDATION',
      });
    });

    it('still prefers the envelope when the API sends one', async () => {
      fetchMock.mockResolvedValue(errorResponse('INVALID_REQUEST', 400));
      await expect(confirmPasswordReset('t'.repeat(30), 'whatever-password')).rejects.toMatchObject(
        {
          code: 'INVALID_REQUEST',
        },
      );
    });

    it('still reports a bare 5xx as SERVER', async () => {
      fetchMock.mockResolvedValue(new Response('{}', { status: 500 }));
      await expect(confirmPasswordReset('t'.repeat(30), 'whatever-password')).rejects.toMatchObject(
        {
          code: 'SERVER',
        },
      );
    });

    it('treats a body-less 401 as unauthenticated, and announces it', async () => {
      // Same shape problem: an empty 401 must still clear the stale account.
      const seen = vi.fn();
      window.addEventListener(AUTH_UNAUTHENTICATED_EVENT, seen);
      try {
        fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
        await expect(
          confirmPasswordReset('t'.repeat(30), 'whatever-password'),
        ).rejects.toMatchObject({
          code: 'UNAUTHENTICATED',
        });
        expect(seen).toHaveBeenCalled();
      } finally {
        window.removeEventListener(AUTH_UNAUTHENTICATED_EVENT, seen);
      }
    });
  });
});
