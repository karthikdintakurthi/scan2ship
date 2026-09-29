import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
// Next.js returns the same router between renders; the shared setup's mock does not
jest.mock('next/navigation', () => {
  const router = { push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn(), prefetch: jest.fn() };
  return { useRouter: () => router, usePathname: () => '/', useSearchParams: () => new URLSearchParams() };
});
jest.mock('@/components/RechargeModal', () => ({
  __esModule: true,
  default: ({ isOpen, onSuccess }: { isOpen: boolean; onSuccess: () => void }) =>
    isOpen ? <button onClick={onSuccess}>Finish recharge</button> : null,
}));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { useAuth } from '@/contexts/AuthContext';
import CreditsPage from '@/app/credits/page';
import AdminCreditsPage from '@/app/admin/credits/page';

type Route = { ok?: boolean; status?: number; body?: unknown; error?: Error };
const fetchMock = global.fetch as jest.Mock;

function routeFetch(routes: Record<string, Route | (() => Route)>) {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    const key = Object.keys(routes).find((prefix) => url.startsWith(prefix));
    const entry = key ? routes[key] : { ok: false, status: 404, body: {} };
    const route = typeof entry === 'function' ? entry() : entry;
    if (route.error) throw route.error;
    return { ok: route.ok ?? true, status: route.status ?? 200, json: async () => route.body, init };
  });
}

const RECHARGES = [
  { id: 'r1', amount: 500, transactionRef: 'S2S-1', utrNumber: '123456789012', status: 'pending', reviewNote: null, createdAt: '2026-09-29T10:00:00Z' },
  { id: 'r2', amount: 250, transactionRef: 'S2S-2', utrNumber: null, status: 'rejected', reviewNote: 'UTR not found', createdAt: '2026-09-28T10:00:00Z' },
  { id: 'r3', amount: 100, transactionRef: 'S2S-3', utrNumber: null, status: 'approved', reviewNote: null, createdAt: '2026-09-27T10:00:00Z' },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  window.localStorage.setItem('authToken', 'token-1');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('tenant credits page', () => {
  const baseRoutes = {
    '/api/credits/transactions': { body: { data: [], pagination: { totalPages: 1 } } },
    '/api/credits/recharge-requests': { body: { data: RECHARGES } },
    '/api/credits': { body: { data: { id: 'c', clientId: 'client-a', balance: 10, totalAdded: 10, totalUsed: 0 } } },
  };

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ currentUser: { id: 'u1', role: 'user' } });
  });

  it('lists submitted payments with their review status', async () => {
    routeFetch(baseRoutes);
    render(<CreditsPage />);

    expect(await screen.findByText('Submitted Payments')).toBeInTheDocument();
    expect(screen.getByText('Awaiting verification')).toBeInTheDocument();
    expect(screen.getByText('rejected')).toBeInTheDocument();
    expect(screen.getByText('approved')).toBeInTheDocument();
    expect(screen.getByText(/UTR 123456789012/)).toBeInTheDocument();
    expect(screen.getByText(/UTR not found/)).toBeInTheDocument();

    const [, init] = fetchMock.mock.calls.find(([url]) => url === '/api/credits/recharge-requests')!;
    expect(init.headers.Authorization).toBe('Bearer token-1');
  });

  it('hides the section when there are no submitted payments or the request fails', async () => {
    routeFetch({ ...baseRoutes, '/api/credits/recharge-requests': { ok: false, status: 500, body: {} } });
    render(<CreditsPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/credits/recharge-requests', expect.anything()));
    expect(screen.queryByText('Submitted Payments')).not.toBeInTheDocument();
  });

  it('treats a missing list as empty', async () => {
    routeFetch({ ...baseRoutes, '/api/credits/recharge-requests': { body: {} } });
    render(<CreditsPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/credits/recharge-requests', expect.anything()));
    expect(screen.queryByText('Submitted Payments')).not.toBeInTheDocument();
  });

  it('logs and carries on when loading submitted payments throws', async () => {
    routeFetch({ ...baseRoutes, '/api/credits/recharge-requests': { error: new Error('offline') } });
    render(<CreditsPage />);
    await waitFor(() => expect(console.error).toHaveBeenCalledWith('Error fetching recharge requests:', expect.any(Error)));
  });

  it('after a recharge, says the payment awaits verification and reloads the list', async () => {
    routeFetch(baseRoutes);
    render(<CreditsPage />);
    fireEvent.click(await screen.findByText('Recharge'));
    const callsBefore = fetchMock.mock.calls.filter(([url]) => url === '/api/credits/recharge-requests').length;

    fireEvent.click(screen.getByText('Finish recharge'));

    expect(await screen.findByText('Payment submitted. Credits will be added after an administrator verifies it.')).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock.mock.calls.filter(([url]) => url === '/api/credits/recharge-requests').length).toBe(callsBefore + 1)
    );
  });
});

describe('admin credits page', () => {
  let pending: typeof RECHARGES;
  let reviewResponse: Route;

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ currentUser: { id: 'admin', role: 'master_admin' } });
    pending = [
      { ...RECHARGES[0], clientId: 'client-a', clients: { companyName: 'Tenant A' }, requestedBy: { email: 'owner@a.test' } } as never,
      { ...RECHARGES[0], id: 'r4', utrNumber: null, clientId: 'client-b', clients: null, requestedBy: null } as never,
    ];
    reviewResponse = { body: { success: true } };
    routeFetch({
      '/api/admin/credits/recharge-requests?status=pending': () => ({ body: { data: pending } }),
      '/api/admin/credits/recharge-requests/': () => reviewResponse,
      '/api/admin/credits': { body: { data: { clients: [], summary: { totalClients: 0, totalCredits: 0, totalAdded: 0, totalUsed: 0 } } } },
    });
  });

  function reviewCalls() {
    return fetchMock.mock.calls.filter(([url]) => url.startsWith('/api/admin/credits/recharge-requests/'));
  }

  it('lists payments awaiting verification with tenant, UTR, and requester', async () => {
    render(<AdminCreditsPage />);

    expect(await screen.findByText('Payments Awaiting Verification (2)')).toBeInTheDocument();
    expect(screen.getByText(/Tenant A · ₹500/)).toBeInTheDocument();
    expect(screen.getByText(/client-b · ₹500/)).toBeInTheDocument();
    expect(screen.getByText(/UTR 123456789012 · by owner@a.test/)).toBeInTheDocument();
    expect(screen.getByText(/no UTR/)).toBeInTheDocument();
  });

  it('approves a payment and reloads the list', async () => {
    render(<AdminCreditsPage />);
    const [approve] = await screen.findAllByText('Approve');
    pending = [];

    await act(async () => {
      fireEvent.click(approve);
    });

    expect(reviewCalls()).toHaveLength(1);
    const [url, init] = reviewCalls()[0];
    expect(url).toBe('/api/admin/credits/recharge-requests/r1');
    expect(JSON.parse(init.body)).toEqual({ action: 'approve' });
    await waitFor(() => expect(screen.queryByText(/Payments Awaiting Verification/)).not.toBeInTheDocument());
  });

  it('rejects with the reason the admin enters', async () => {
    jest.spyOn(window, 'prompt').mockReturnValue('UTR not in statement');
    render(<AdminCreditsPage />);
    const [, reject] = await screen.findAllByText('Reject');

    await act(async () => {
      fireEvent.click(reject);
    });

    expect(JSON.parse(reviewCalls()[0][1].body)).toEqual({ action: 'reject', note: 'UTR not in statement' });
  });

  it('does nothing when the admin cancels the rejection prompt', async () => {
    jest.spyOn(window, 'prompt').mockReturnValue(null);
    render(<AdminCreditsPage />);
    const [reject] = await screen.findAllByText('Reject');

    await act(async () => {
      fireEvent.click(reject);
    });

    expect(reviewCalls()).toHaveLength(0);
  });

  it('shows the server error when a review fails', async () => {
    reviewResponse = { ok: false, status: 409, body: { error: 'This request was already approved' } };
    render(<AdminCreditsPage />);
    const [approve] = await screen.findAllByText('Approve');

    await act(async () => {
      fireEvent.click(approve);
    });

    expect(await screen.findByText('This request was already approved')).toBeInTheDocument();
  });

  it('shows a generic error when the server gives no reason', async () => {
    reviewResponse = { ok: false, status: 500, body: {} };
    render(<AdminCreditsPage />);
    const [approve] = await screen.findAllByText('Approve');

    await act(async () => {
      fireEvent.click(approve);
    });

    expect(await screen.findByText('Failed to review payment')).toBeInTheDocument();
  });

  it('shows an error when the review request throws', async () => {
    reviewResponse = { error: new Error('offline') };
    render(<AdminCreditsPage />);
    const [approve] = await screen.findAllByText('Approve');

    await act(async () => {
      fireEvent.click(approve);
    });

    expect(await screen.findByText('Failed to review payment')).toBeInTheDocument();
  });

  it('hides the section when the pending list cannot be loaded', async () => {
    routeFetch({
      '/api/admin/credits/recharge-requests?status=pending': { ok: false, status: 500, body: {} },
      '/api/admin/credits': { body: { data: { clients: [], summary: { totalClients: 0, totalCredits: 0, totalAdded: 0, totalUsed: 0 } } } },
    });
    render(<AdminCreditsPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/credits/recharge-requests?status=pending', expect.anything()));
    expect(screen.queryByText(/Payments Awaiting Verification/)).not.toBeInTheDocument();
  });

  it('treats a missing pending list as empty, and logs when loading it throws', async () => {
    routeFetch({
      '/api/admin/credits/recharge-requests?status=pending': { body: {} },
      '/api/admin/credits': { body: { data: { clients: [], summary: { totalClients: 0, totalCredits: 0, totalAdded: 0, totalUsed: 0 } } } },
    });
    const { unmount } = render(<AdminCreditsPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/credits/recharge-requests?status=pending', expect.anything()));
    expect(screen.queryByText(/Payments Awaiting Verification/)).not.toBeInTheDocument();
    unmount();

    routeFetch({
      '/api/admin/credits/recharge-requests?status=pending': { error: new Error('offline') },
      '/api/admin/credits': { body: { data: { clients: [], summary: { totalClients: 0, totalCredits: 0, totalAdded: 0, totalUsed: 0 } } } },
    });
    render(<AdminCreditsPage />);
    await waitFor(() => expect(console.error).toHaveBeenCalledWith('Error fetching pending recharge requests:', expect.any(Error)));
  });
});
