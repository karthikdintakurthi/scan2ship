export interface DelhiveryUpdateOrderFields {
  id: number
  is_cod?: boolean | null
  cod_amount?: number | null
  weight?: number | null
  name?: string | null
  mobile?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  country?: string | null
}

export const DELHIVERY_UPDATE_ORDER_URL = '/api/delhivery/update-order'

/**
 * Builds the browser request to /api/delhivery/update-order. The server looks
 * up the waybill and carrier key from the stored order, so neither is sent.
 */
export function buildDelhiveryUpdateRequest(order: DelhiveryUpdateOrderFields, authToken: string | null): RequestInit {
  const payload = {
    orderId: order.id,
    pt: order.is_cod ? 'COD' : 'Pre-paid',
    cod: order.is_cod ? (order.cod_amount || 0) : 0,
    weight: order.weight || 100, // grams
    name: order.name,
    phone: order.mobile,
    address: order.address,
    city: order.city,
    state: order.state,
    pincode: order.pincode,
    country: order.country,
  }

  return {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }
}
