import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      waybill, 
      pt, 
      cod, 
      weight, 
      pickupLocation,
      // Additional fields from Delhivery API documentation
      name,
      phone,
      address,
      city,
      state,
      pincode,
      country
    } = body

    console.log('🔄 [DELHIVERY_UPDATE_API] Updating order:', waybill)
    console.log('🔄 [DELHIVERY_UPDATE_API] Pickup location:', pickupLocation)

    // Validate required fields
    if (!waybill) {
      return NextResponse.json({ error: 'Waybill number is required' }, { status: 400 })
    }

    if (!pickupLocation) {
      return NextResponse.json({ error: 'Pickup location is required' }, { status: 400 })
    }

    // Fetch Delhivery API key from pickup location
    console.log('🔑 [DELHIVERY_UPDATE_API] Fetching Delhivery API key for pickup location:', pickupLocation)
    
    const pickupLocationData = await prisma.pickup_locations.findFirst({
      where: {
        value: pickupLocation
      },
      select: {
        delhiveryApiKey: true,
        label: true
      }
    })

    if (!pickupLocationData || !pickupLocationData.delhiveryApiKey) {
      console.error('❌ [DELHIVERY_UPDATE_API] No Delhivery API key found for pickup location:', pickupLocation)
      return NextResponse.json({ 
        error: `No Delhivery API key configured for pickup location: ${pickupLocation}` 
      }, { status: 400 })
    }

    const delhiveryToken = pickupLocationData.delhiveryApiKey
    console.log('✅ [DELHIVERY_UPDATE_API] Found Delhivery API key for pickup location:', pickupLocationData.label)
    console.log('🔑 [DELHIVERY_UPDATE_API] Full API Key being used:', delhiveryToken)
    console.log('🔑 [DELHIVERY_UPDATE_API] API Key length:', delhiveryToken.length)
    console.log('🔑 [DELHIVERY_UPDATE_API] API Key type:', typeof delhiveryToken)
    console.log('🔑 [DELHIVERY_UPDATE_API] API Key first 10 chars:', delhiveryToken.substring(0, 10))
    console.log('🔑 [DELHIVERY_UPDATE_API] API Key last 10 chars:', delhiveryToken.substring(delhiveryToken.length - 10))

    // Always use production Delhivery API URL
    const delhiveryUrl = 'https://track.delhivery.com/api/p/edit'

    // Prepare Delhivery API payload according to official documentation
    // Note: clientId and pickupLocation are internal Scan2Ship fields, not sent to Delhivery
    // Note: shipment dimensions are not sent to Delhivery update API
    const delhiveryPayload: any = {
      waybill,
      pt,
      cod,
      weight
    }

    // Add customer details if provided (for address updates)
    if (name) {
      delhiveryPayload.name = name
    }
    if (phone) {
      delhiveryPayload.phone = phone
    }
    if (address) {
      delhiveryPayload.address = address
    }
    if (city) {
      delhiveryPayload.city = city
    }
    if (state) {
      delhiveryPayload.state = state
    }
    if (pincode) {
      delhiveryPayload.pincode = pincode
    }
    if (country) {
      delhiveryPayload.country = country
    }

    console.log('📦 [DELHIVERY_UPDATE_API] Calling Delhivery Production API:', delhiveryUrl)
    console.log('📦 [DELHIVERY_UPDATE_API] Payload:', delhiveryPayload)
    console.log('📦 [DELHIVERY_UPDATE_API] API Token (first 8 chars):', delhiveryToken.substring(0, 8) + '...')
    console.log('🔐 [DELHIVERY_UPDATE_API] Authorization Header:', `Token ${delhiveryToken}`)
    console.log('🔐 [DELHIVERY_UPDATE_API] Full Headers:', {
      'Authorization': `Token ${delhiveryToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    })

    // Call Delhivery API
    let delhiveryResponse: Response
    try {
      const requestHeaders = {
        'Authorization': `Token ${delhiveryToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
      
      console.log('🚀 [DELHIVERY_UPDATE_API] Making fetch request with headers:')
      console.log('   Authorization:', `Token ${delhiveryToken}`)
      console.log('   Accept:', 'application/json')
      console.log('   Content-Type:', 'application/json')
      console.log('   Full Headers Object:', requestHeaders)
      
      delhiveryResponse = await fetch(delhiveryUrl, {
        method: 'POST',
        headers: requestHeaders,
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
    console.log('📦 [DELHIVERY_UPDATE_API] Delhivery response statusText:', delhiveryResponse.statusText)
    console.log('📦 [DELHIVERY_UPDATE_API] Delhivery response headers:', Object.fromEntries(delhiveryResponse.headers.entries()))
    console.log('📦 [DELHIVERY_UPDATE_API] Response URL:', delhiveryResponse.url)
    console.log('📦 [DELHIVERY_UPDATE_API] Response type:', delhiveryResponse.type)
    console.log('📦 [DELHIVERY_UPDATE_API] Response redirected:', delhiveryResponse.redirected)

    // Handle non-JSON responses
    let delhiveryResult: any
    const contentType = delhiveryResponse.headers.get('content-type')
    
    if (contentType && contentType.includes('application/json')) {
      try {
        delhiveryResult = await delhiveryResponse.json()
      } catch (jsonError) {
        console.error('❌ [DELHIVERY_UPDATE_API] JSON parse error:', jsonError)
        const responseText = await delhiveryResponse.text()
        console.error('❌ [DELHIVERY_UPDATE_API] Raw response:', responseText)
        delhiveryResult = { error: 'Invalid JSON response from Delhivery API', rawResponse: responseText }
      }
    } else {
      // Handle non-JSON responses (HTML, plain text, etc.)
      const responseText = await delhiveryResponse.text()
      console.log('📦 [DELHIVERY_UPDATE_API] Non-JSON response:', responseText)
      delhiveryResult = { 
        error: 'Non-JSON response from Delhivery API', 
        contentType: contentType,
        rawResponse: responseText 
      }
    }
    
    console.log('📦 [DELHIVERY_UPDATE_API] Processed response:', delhiveryResult)

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
