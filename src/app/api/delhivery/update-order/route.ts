import { NextRequest, NextResponse } from 'next/server'
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware'
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware'
import { findAccessibleOrder } from '@/lib/application/policy'
import { getDelhiveryApiKey } from '@/lib/pickup-location-config'

const DELHIVERY_EDIT_URL = 'https://track.delhivery.com/api/p/edit'

// Customer and package fields the caller may change on an existing Delhivery shipment.
const EDITABLE_SHIPMENT_FIELDS = ['pt', 'cod', 'weight', 'name', 'phone', 'address', 'city', 'state', 'pincode', 'country'] as const

export async function POST(request: NextRequest) {
  try {
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    )

    if (securityResponse) {
      securityHeaders(securityResponse)
      return securityResponse
    }

    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.CHILD_USER,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    })

    if (authResult.response) {
      securityHeaders(authResult.response)
      return authResult.response
    }

    const body = await request.json()
    const orderId = Number(body?.orderId)

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ error: 'A valid orderId is required' }, { status: 400 })
    }

    const order = await findAccessibleOrder(authResult.user!, orderId, {
      select: { id: true, clientId: true, pickup_location: true, delhivery_waybill_number: true }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!order.delhivery_waybill_number) {
      return NextResponse.json({ error: 'Order has no Delhivery waybill' }, { status: 400 })
    }

    const delhiveryToken = await getDelhiveryApiKey(order.pickup_location, order.clientId)

    if (!delhiveryToken) {
      return NextResponse.json({
        error: `No Delhivery API key configured for pickup location: ${order.pickup_location}`
      }, { status: 400 })
    }

    const delhiveryPayload: Record<string, unknown> = { waybill: order.delhivery_waybill_number }
    for (const field of EDITABLE_SHIPMENT_FIELDS) {
      if (body[field] !== undefined && body[field] !== null && body[field] !== '') {
        delhiveryPayload[field] = body[field]
      }
    }

    console.log('🔄 [DELHIVERY_UPDATE_API] Updating waybill', order.delhivery_waybill_number, 'for order', order.id, 'fields:', Object.keys(delhiveryPayload).join(', '))

    let delhiveryResponse: Response
    try {
      delhiveryResponse = await fetch(DELHIVERY_EDIT_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${delhiveryToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(delhiveryPayload)
      })
    } catch (fetchError) {
      console.error('❌ [DELHIVERY_UPDATE_API] Network error:', fetchError)
      return NextResponse.json({
        success: false,
        error: 'Network error while calling Delhivery API',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown network error'
      }, { status: 500 })
    }

    console.log('📦 [DELHIVERY_UPDATE_API] Delhivery response status:', delhiveryResponse.status)

    let delhiveryResult: any
    const contentType = delhiveryResponse.headers.get('content-type')

    if (contentType && contentType.includes('application/json')) {
      try {
        delhiveryResult = await delhiveryResponse.json()
      } catch (jsonError) {
        console.error('❌ [DELHIVERY_UPDATE_API] JSON parse error:', jsonError)
        delhiveryResult = { error: 'Invalid JSON response from Delhivery API' }
      }
    } else {
      const responseText = await delhiveryResponse.text()
      delhiveryResult = {
        error: 'Non-JSON response from Delhivery API',
        contentType: contentType,
        rawResponse: responseText
      }
    }

    if (delhiveryResponse.ok) {
      return NextResponse.json({
        success: true,
        message: 'Order updated successfully in Delhivery',
        delhiveryResponse: delhiveryResult
      })
    } else if (delhiveryResponse.status === 401) {
      console.error('❌ [DELHIVERY_UPDATE_API] Authentication failed - API key invalid or expired')
      return NextResponse.json({
        success: false,
        error: 'Delhivery API authentication failed. Please check your API key configuration.',
        details: 'The API key for this pickup location is invalid or expired. Please update it in the pickup location settings.',
        delhiveryError: delhiveryResult
      }, { status: 401 })
    } else {
      console.error('❌ [DELHIVERY_UPDATE_API] Delhivery API error:', delhiveryResult)
      return NextResponse.json({
        success: false,
        error: 'Failed to update order in Delhivery',
        delhiveryError: delhiveryResult
      }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ [DELHIVERY_UPDATE_API] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error while updating Delhivery order'
    }, { status: 500 })
  }
}
