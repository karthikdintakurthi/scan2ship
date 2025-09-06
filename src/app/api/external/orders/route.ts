import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiKey, hasPermission } from '@/lib/api-key-auth';

// GET /api/external/orders - Get orders using API key authentication
export async function GET(request: NextRequest) {
  try {
    // Authenticate using API key
    const apiKey = await authenticateApiKey(request);
    if (!apiKey) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(apiKey, 'orders:read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const search = searchParams.get('search');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    // Build where clause
    const where: any = {
      clientId: apiKey.clientId
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
        { tracking_id: { contains: search, mode: 'insensitive' } },
        { reference_number: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (fromDate || toDate) {
      where.created_at = {};
      if (fromDate) where.created_at.gte = new Date(fromDate);
      if (toDate) where.created_at.lte = new Date(toDate);
    }

    // Get orders
    const [orders, totalCount] = await Promise.all([
      prisma.orders.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          mobile: true,
          address: true,
          city: true,
          state: true,
          country: true,
          pincode: true,
          courier_service: true,
          pickup_location: true,
          package_value: true,
          weight: true,
          total_items: true,
          is_cod: true,
          cod_amount: true,
          reference_number: true,
          tracking_id: true,
          created_at: true,
          updated_at: true
        }
      }),
      prisma.orders.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      orders,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('External orders GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/external/orders - Create order using API key authentication
export async function POST(request: NextRequest) {
  try {
    // Authenticate using API key
    const apiKey = await authenticateApiKey(request);
    if (!apiKey) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(apiKey, 'orders:write')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const orderData = await request.json();

    // Validate required fields
    const requiredFields = ['name', 'mobile', 'address', 'city', 'state', 'pincode', 'courier_service', 'pickup_location', 'package_value', 'weight', 'total_items'];
    const missingFields = requiredFields.filter(field => !orderData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      }, { status: 400 });
    }

    // Check client credits
    const clientCredits = await prisma.client_credits.findUnique({
      where: { clientId: apiKey.clientId }
    });

    if (!clientCredits || clientCredits.balance < 1) {
      return NextResponse.json({ 
        error: 'Insufficient credits' 
      }, { status: 402 });
    }

    // Create order
    const order = await prisma.orders.create({
      data: {
        ...orderData,
        clientId: apiKey.clientId,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // Deduct credit
    await prisma.client_credits.update({
      where: { clientId: apiKey.clientId },
      data: { 
        balance: { decrement: 1 },
        totalUsed: { increment: 1 }
      }
    });

    // Create credit transaction record
    await prisma.credit_transactions.create({
      data: {
        id: crypto.randomUUID(),
        clientId: apiKey.clientId,
        type: 'debit',
        amount: 1,
        balance: clientCredits.balance - 1,
        description: 'Order creation via API',
        feature: 'ORDER',
        orderId: order.id
      }
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        name: order.name,
        mobile: order.mobile,
        address: order.address,
        city: order.city,
        state: order.state,
        country: order.country,
        pincode: order.pincode,
        courier_service: order.courier_service,
        pickup_location: order.pickup_location,
        package_value: order.package_value,
        weight: order.weight,
        total_items: order.total_items,
        is_cod: order.is_cod,
        cod_amount: order.cod_amount,
        reference_number: order.reference_number,
        tracking_id: order.tracking_id,
        created_at: order.created_at,
        updated_at: order.updated_at
      }
    });
  } catch (error) {
    console.error('External orders POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
