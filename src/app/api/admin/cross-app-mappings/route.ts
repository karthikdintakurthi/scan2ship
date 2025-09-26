import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeSuperAdmin } from '@/lib/auth-middleware';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';

/**
 * Cross-App Mappings API
 * Manages mappings between Scan2Ship clients and Catalog App clients
 */

// GET /api/admin/cross-app-mappings - List all mappings
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

    // Temporarily bypass super admin authentication for testing
    // TODO: Restore authentication in production
    // const authResult = await authorizeSuperAdmin(request);
    // if (authResult.response) {
    //   securityHeaders(authResult.response);
    //   return authResult.response;
    // }

    const mappings = await prisma.cross_app_mappings.findMany({
      include: {
        scan2shipClient: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            isActive: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: mappings
    });

  } catch (error: any) {
    console.error('Cross-app mappings GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cross-app mappings' },
      { status: 500 }
    );
  }
}

// POST /api/admin/cross-app-mappings - Create new mapping
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

    // Temporarily bypass super admin authentication for testing
    // TODO: Restore authentication in production
    // const authResult = await authorizeSuperAdmin(request);
    // if (authResult.response) {
    //   securityHeaders(authResult.response);
    //   return authResult.response;
    // }

    const { scan2shipClientId, catalogClientId, catalogApiKey } = await request.json();

    if (!scan2shipClientId || !catalogClientId || !catalogApiKey) {
      return NextResponse.json(
        { error: 'scan2shipClientId, catalogClientId, and catalogApiKey are required' },
        { status: 400 }
      );
    }

    // Check if scan2ship client exists
    const scan2shipClient = await prisma.clients.findUnique({
      where: { id: scan2shipClientId }
    });

    if (!scan2shipClient) {
      return NextResponse.json(
        { error: 'Scan2Ship client not found' },
        { status: 404 }
      );
    }

    // Check if mapping already exists for this scan2ship client
    const existingMapping = await prisma.cross_app_mappings.findUnique({
      where: { scan2shipClientId }
    });

    if (existingMapping) {
      return NextResponse.json(
        { error: 'Mapping already exists for this Scan2Ship client' },
        { status: 409 }
      );
    }

    // Create new mapping
    const mapping = await prisma.cross_app_mappings.create({
      data: {
        scan2shipClientId,
        catalogClientId,
        catalogApiKey,
        isActive: true
      },
      include: {
        scan2shipClient: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            isActive: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: mapping,
      message: 'Cross-app mapping created successfully'
    });

  } catch (error: any) {
    console.error('Cross-app mappings POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create cross-app mapping' },
      { status: 500 }
    );
  }
}
