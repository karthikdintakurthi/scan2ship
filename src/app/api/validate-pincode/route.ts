import { NextRequest, NextResponse } from 'next/server'
import { delhiveryService } from '@/lib/delhivery'
import { validatePincodeFallback } from '@/lib/pincode-fallback'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pincode = searchParams.get('pincode')

    if (!pincode) {
      return NextResponse.json({ 
        error: 'Pincode parameter is required' 
      }, { status: 400 })
    }

    if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      return NextResponse.json({ 
        error: 'Invalid pincode format. Must be 6 digits.' 
      }, { status: 400 })
    }

    // First try Delhivery API
    let result = await delhiveryService.validatePincode(pincode)

    // If Delhivery API fails OR returns not serviceable, use fallback database
    if (!result.success || (result.success && !result.serviceable)) {
      console.log('Delhivery API failed or pincode not serviceable, using fallback database for pincode:', pincode)
      const fallbackResult = validatePincodeFallback(pincode)
      
      // If fallback has data, use it; otherwise keep Delhivery result
      if (fallbackResult.success) {
        result = fallbackResult
      }
    }

    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json({ 
        error: result.error || 'Failed to validate pincode' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Pincode validation API error:', error)
    
    // Try fallback as last resort
    try {
      const { searchParams } = new URL(request.url)
      const pincode = searchParams.get('pincode')
      if (pincode) {
        const fallbackResult = validatePincodeFallback(pincode)
        if (fallbackResult.success) {
          return NextResponse.json(fallbackResult)
        }
      }
    } catch (fallbackError) {
      console.error('Fallback validation also failed:', fallbackError)
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
