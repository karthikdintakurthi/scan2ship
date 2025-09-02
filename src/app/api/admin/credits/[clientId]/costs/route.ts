import { NextRequest, NextResponse } from 'next/server';
import { ClientCreditCostsService } from '@/lib/client-credit-costs-service';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

// GET /api/admin/credits/[clientId]/costs - Get client credit costs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    // Apply security middleware
    const securityResponse = applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    // Authorize admin user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.ADMIN,
      requiredPermissions: [PermissionLevel.READ],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const { clientId } = await params;
    
    // Verify client exists
    const client = await prisma.clients.findUnique({
      where: { id: clientId }
    });
    
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const costs = await ClientCreditCostsService.getClientCreditCosts(clientId);
    
    return NextResponse.json({
      success: true,
      data: costs
    });
  } catch (error) {
    console.error('Error getting client credit costs:', error);
    return NextResponse.json(
      { error: 'Failed to get client credit costs' },
      { status: 500 }
    );
  }
}

// POST /api/admin/credits/[clientId]/costs - Create or update client credit costs
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    // Apply security middleware
    const securityResponse = applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    // Authorize admin user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.ADMIN,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const { clientId } = await params;
    const body = await request.json();
    const { costs } = body;

    if (!costs || !Array.isArray(costs)) {
      return NextResponse.json(
        { error: 'Invalid costs data' },
        { status: 400 }
      );
    }

    // Verify client exists
    const client = await prisma.clients.findUnique({
      where: { id: clientId }
    });
    
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Validate costs structure
    for (const cost of costs) {
      if (!cost.feature || !cost.cost || typeof cost.cost !== 'number') {
        return NextResponse.json(
          { error: 'Invalid cost data structure' },
          { status: 400 }
        );
      }
      
      if (cost.cost < 0.5) {
        return NextResponse.json(
          { error: `Credit cost for ${cost.feature} must be at least 0.5 credits` },
          { status: 400 }
        );
      }
    }

    const updatedCosts = await ClientCreditCostsService.bulkUpdateClientCreditCosts(clientId, costs);
    
    return NextResponse.json({
      success: true,
      data: updatedCosts,
      message: `Successfully updated credit costs for ${client.companyName}`
    });
  } catch (error) {
    console.error('Error updating client credit costs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update client credit costs' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/credits/[clientId]/costs - Update specific credit cost
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    // Apply security middleware
    const securityResponse = applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    // Authorize admin user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.ADMIN,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const { clientId } = await params;
    const body = await request.json();
    const { feature, cost } = body;

    if (!feature || cost === undefined || typeof cost !== 'number') {
      return NextResponse.json(
        { error: 'Feature and cost are required' },
        { status: 400 }
      );
    }

    if (cost < 0.5) {
      return NextResponse.json(
        { error: 'Credit cost must be at least 0.5 credits' },
        { status: 400 }
      );
    }

    // Verify client exists
    const client = await prisma.clients.findUnique({
      where: { id: clientId }
    });
    
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const updatedCost = await ClientCreditCostsService.upsertClientCreditCost(clientId, feature, cost);
    
    return NextResponse.json({
      success: true,
      data: updatedCost,
      message: `Successfully updated ${feature} credit cost for ${client.companyName}`
    });
  } catch (error) {
    console.error('Error updating client credit cost:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update client credit cost' },
      { status: 500 }
    );
  }
}
