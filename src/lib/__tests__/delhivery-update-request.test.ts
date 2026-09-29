import fs from 'node:fs';
import { buildDelhiveryUpdateRequest, DELHIVERY_UPDATE_ORDER_URL } from '@/lib/delhivery-update-request';

jest.unmock('path');
const { join } = jest.requireActual('path');

const order = {
  id: 42,
  is_cod: true,
  cod_amount: 1500,
  weight: 250,
  name: 'Asha',
  mobile: '9876543210',
  address: '12 MG Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560001',
  country: 'India',
};

describe('buildDelhiveryUpdateRequest', () => {
  it('sends the order ID and edited fields, not the waybill or pickup location', () => {
    const body = JSON.parse(buildDelhiveryUpdateRequest(order, 'token-1').body as string);

    expect(body).toEqual({
      orderId: 42,
      pt: 'COD',
      cod: 1500,
      weight: 250,
      name: 'Asha',
      phone: '9876543210',
      address: '12 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India',
    });
    expect(body).not.toHaveProperty('waybill');
    expect(body).not.toHaveProperty('pickupLocation');
  });

  it('sends the auth token as a bearer header', () => {
    const request = buildDelhiveryUpdateRequest(order, 'token-1');
    expect(request.method).toBe('POST');
    expect(request.headers).toEqual({ Authorization: 'Bearer token-1', 'Content-Type': 'application/json' });
  });

  it('sends prepaid orders with a zero COD amount even if one is stored', () => {
    const body = JSON.parse(buildDelhiveryUpdateRequest({ ...order, is_cod: false }, 't').body as string);
    expect(body).toMatchObject({ pt: 'Pre-paid', cod: 0 });
  });

  it('defaults missing COD amount to 0 and missing weight to 100 g', () => {
    const body = JSON.parse(buildDelhiveryUpdateRequest({ id: 1, is_cod: true, cod_amount: null, weight: null }, 't').body as string);
    expect(body).toMatchObject({ cod: 0, weight: 100 });
  });

  it('targets the update-order API', () => {
    expect(DELHIVERY_UPDATE_ORDER_URL).toBe('/api/delhivery/update-order');
  });
});

describe('OrderList', () => {
  const source = fs.readFileSync(join(__dirname, '..', '..', 'components', 'OrderList.tsx'), 'utf8');

  it('builds its Delhivery update request with buildDelhiveryUpdateRequest', () => {
    expect(source).toMatch(/fetch\(\s*DELHIVERY_UPDATE_ORDER_URL,\s*buildDelhiveryUpdateRequest\(order, localStorage\.getItem\('authToken'\)\)/);
  });

  it('no longer sends a waybill or pickup location from updateDelhiveryOrder', () => {
    const start = source.indexOf('const updateDelhiveryOrder');
    const end = source.indexOf('const downloadPackingSlip');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const updateDelhiveryOrder = source.slice(start, end);

    expect(updateDelhiveryOrder).not.toMatch(/pickupLocation\s*:/);
    expect(updateDelhiveryOrder).not.toMatch(/waybill\s*:/);
  });
});
