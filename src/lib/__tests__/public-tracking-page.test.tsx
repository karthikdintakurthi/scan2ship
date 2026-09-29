import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import TrackingPage from '@/app/tracking/page';

const fetchMock = global.fetch as jest.Mock;

const RESPONSE = {
  success: true,
  data: {
    mobile: '******3210',
    totalOrders: 2,
    ordersByClient: [
      {
        clientId: 'seller-1',
        clientName: 'Acme Jewels',
        orders: [
          { id: 11, name: 'A*** K***', search_type: 'customer', tracking_id: 'AWB-1', tracking_status: 'in_transit', courier_service: 'delhivery', created_at: '2026-09-20T00:00:00Z' },
          { id: 12, name: 'A*** K***', search_type: 'reseller', tracking_id: null, tracking_status: 'pending', courier_service: 'dtdc', created_at: '2026-09-19T00:00:00Z' },
        ],
      },
    ],
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

it('renders the masked lookup response from /api/tracking', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => RESPONSE });
  render(<TrackingPage />);

  fireEvent.change(screen.getByRole('textbox'), { target: { value: '9876543210' } });
  fireEvent.submit(screen.getByRole('textbox').closest('form')!);

  expect((await screen.findAllByText('A*** K***')).length).toBe(2);
  expect(screen.getAllByText('AWB-1').length).toBeGreaterThan(0);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ mobile: '9876543210' });
});
