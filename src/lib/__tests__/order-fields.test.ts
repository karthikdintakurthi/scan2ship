import { CREATABLE_ORDER_FIELDS, pickCreatableOrderFields } from '@/lib/application/order-fields';

describe('pickCreatableOrderFields', () => {
  it('keeps allowed fields and reports the rest', () => {
    expect(pickCreatableOrderFields({ name: 'A', pincode: '560001', clientId: 'x', created_by: 'y' })).toEqual({
      fields: { name: 'A', pincode: '560001' },
      ignored: ['clientId', 'created_by'],
    });
  });

  it.each([[null], [undefined], ['text'], [['name']]])('returns nothing for %p', (input) => {
    expect(pickCreatableOrderFields(input)).toEqual({ fields: {}, ignored: [] });
  });

  it('never allows server-controlled fields', () => {
    for (const field of ['id', 'clientId', 'created_by', 'sub_group', 'tracking_status', 'created_at', 'updated_at', 'delhivery_api_status', 'shopify_status', 'seller_address']) {
      expect(CREATABLE_ORDER_FIELDS as readonly string[]).not.toContain(field);
    }
  });
});
