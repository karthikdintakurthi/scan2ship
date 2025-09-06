import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authenticateApiKey } from '@/lib/api-key-auth';

interface RateCalculationRequest {
  origin: {
    country: string;
    postal_code: string;
    province?: string;
    city?: string;
  };
  destination: {
    country: string;
    postal_code: string;
    province?: string;
    city?: string;
  };
  items: Array<{
    name: string;
    sku?: string;
    quantity: number;
    grams: number;
    price: number;
    requires_shipping: boolean;
    taxable: boolean;
  }>;
  currency: string;
}

interface RateOption {
  service_name: string;
  service_code: string;
  total_price: string;
  description: string;
  currency: string;
  min_delivery_date: string;
  max_delivery_date: string;
}

interface RateResponse {
  rates: RateOption[];
}

// Calculate shipping rate based on courier service configuration
function calculateShippingRate(
  courierService: any,
  totalWeight: number,
  totalValue: number,
  isCod: boolean = false
): number {
  let rate = 0;

  // Check if free shipping threshold is met
  if (courierService.freeShippingThreshold && totalValue >= courierService.freeShippingThreshold) {
    return 0;
  }

  // Apply base rate
  if (courierService.baseRate) {
    rate += courierService.baseRate;
  }

  // Apply weight-based charges
  if (courierService.ratePerKg && courierService.minWeight) {
    const weightInKg = totalWeight / 1000; // Convert grams to kg
    const minWeightInKg = courierService.minWeight / 1000;
    
    if (weightInKg > minWeightInKg) {
      const additionalWeight = weightInKg - minWeightInKg;
      rate += additionalWeight * courierService.ratePerKg;
    }
  }

  // Apply COD charges
  if (isCod && courierService.codCharges) {
    rate += courierService.codCharges;
  }

  return Math.round(rate * 100) / 100; // Round to 2 decimal places
}

// Generate delivery date range
function generateDeliveryDates(estimatedDays: number): { min: string; max: string } {
  const now = new Date();
  const minDate = new Date(now);
  minDate.setDate(now.getDate() + Math.max(1, estimatedDays - 1));
  
  const maxDate = new Date(now);
  maxDate.setDate(now.getDate() + estimatedDays + 2);

  return {
    min: minDate.toISOString().split('T')[0],
    max: maxDate.toISOString().split('T')[0]
  };
}

export async function POST(request: NextRequest) {
  try {
    // Apply security middleware
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    // Authenticate using API key
    const apiKey = await authenticateApiKey(request);
    if (!apiKey) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Check permissions
    if (!apiKey.permissions.includes('orders:read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const rateRequest: RateCalculationRequest = await request.json();

    console.log('🚚 [CARRIER_RATES] Rate calculation request:', {
      clientId: apiKey.clientId,
      origin: rateRequest.origin,
      destination: rateRequest.destination,
      itemCount: rateRequest.items.length,
      currency: rateRequest.currency
    });

    // Validate required fields
    if (!rateRequest.origin?.postal_code || !rateRequest.destination?.postal_code) {
      return NextResponse.json({ 
        error: 'Origin and destination postal codes are required' 
      }, { status: 400 });
    }

    if (!rateRequest.items || rateRequest.items.length === 0) {
      return NextResponse.json({ 
        error: 'At least one item is required' 
      }, { status: 400 });
    }

    // Calculate total weight and value
    const totalWeight = rateRequest.items.reduce((sum, item) => sum + (item.grams * item.quantity), 0);
    const totalValue = rateRequest.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    console.log('📊 [CARRIER_RATES] Calculated totals:', {
      totalWeight,
      totalValue,
      itemCount: rateRequest.items.length
    });

    // Get active courier services for the client
    const courierServices = await prisma.courier_services.findMany({
      where: { 
        clientId: apiKey.clientId,
        isActive: true
      },
      orderBy: { isDefault: 'desc' }
    });

    if (courierServices.length === 0) {
      return NextResponse.json({ 
        error: 'No courier services configured for this client' 
      }, { status: 404 });
    }

    console.log('🚚 [CARRIER_RATES] Found courier services:', courierServices.length);

    // Calculate rates for each courier service
    const rates: RateOption[] = [];

    for (const courierService of courierServices) {
      // Skip if courier service doesn't have rate configuration
      if (!courierService.baseRate && !courierService.ratePerKg) {
        console.log(`⚠️ [CARRIER_RATES] Skipping ${courierService.name} - no rate configuration`);
        continue;
      }

      // Check weight limits
      if (courierService.maxWeight && totalWeight > courierService.maxWeight) {
        console.log(`⚠️ [CARRIER_RATES] Skipping ${courierService.name} - weight exceeds limit`);
        continue;
      }

      // Calculate shipping rate
      const shippingRate = calculateShippingRate(courierService, totalWeight, totalValue, false);
      
      // Generate delivery dates
      const deliveryDates = generateDeliveryDates(courierService.estimatedDays || 3);

      // Create rate option
      const rateOption: RateOption = {
        service_name: courierService.name,
        service_code: courierService.code,
        total_price: shippingRate.toFixed(2),
        description: `Shipping via ${courierService.name}${courierService.estimatedDays ? ` (${courierService.estimatedDays} days)` : ''}`,
        currency: rateRequest.currency || 'INR',
        min_delivery_date: deliveryDates.min,
        max_delivery_date: deliveryDates.max
      };

      rates.push(rateOption);

      console.log(`✅ [CARRIER_RATES] Added rate for ${courierService.name}:`, {
        service: courierService.name,
        rate: shippingRate,
        weight: totalWeight,
        value: totalValue
      });
    }

    // Sort rates by price (ascending)
    rates.sort((a, b) => parseFloat(a.total_price) - parseFloat(b.total_price));

    const response: RateResponse = { rates };

    console.log('🎉 [CARRIER_RATES] Rate calculation completed:', {
      clientId: apiKey.clientId,
      ratesCount: rates.length,
      totalWeight,
      totalValue
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [CARRIER_RATES] Error calculating rates:', error);
    return NextResponse.json({ 
      error: 'Failed to calculate shipping rates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint for testing (returns sample rates)
export async function GET(request: NextRequest) {
  try {
    // Apply security middleware
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    // Authenticate using API key
    const apiKey = await authenticateApiKey(request);
    if (!apiKey) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Get courier services for the client
    const courierServices = await prisma.courier_services.findMany({
      where: { 
        clientId: apiKey.clientId,
        isActive: true
      },
      orderBy: { isDefault: 'desc' }
    });

    return NextResponse.json({
      message: 'Carrier rates API is working',
      clientId: apiKey.clientId,
      courierServices: courierServices.map(service => ({
        id: service.id,
        name: service.name,
        code: service.code,
        baseRate: service.baseRate,
        ratePerKg: service.ratePerKg,
        minWeight: service.minWeight,
        maxWeight: service.maxWeight,
        codCharges: service.codCharges,
        freeShippingThreshold: service.freeShippingThreshold,
        estimatedDays: service.estimatedDays
      }))
    });

  } catch (error) {
    console.error('❌ [CARRIER_RATES_GET] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch courier services',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
