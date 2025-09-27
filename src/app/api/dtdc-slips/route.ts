import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

// GET: Retrieve DTDC slips configuration
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

    // Authorize user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.CHILD_USER,
      requiredPermissions: [PermissionLevel.READ],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;
    const client = user.client;
    console.log(`🔍 [API_DTDC_SLIPS_GET] Fetching DTDC slips config for client: ${client.companyName}`);

    // Get DTDC slips configuration from client_config table
    const dtdcConfig = await prisma.client_config.findMany({
      where: {
        clientId: client.id,
        key: {
          startsWith: 'dtdc_slips_'
        }
      }
    });

    console.log(`📊 [API_DTDC_SLIPS_GET] Found ${dtdcConfig.length} DTDC config entries`);

    // Transform the config data
    const dtdcSlips = {
      from: '',
      to: '',
      unused: '',
      used: '',
      enabled: false
    };

    dtdcConfig.forEach(config => {
      switch (config.key) {
        case 'dtdc_slips_from':
          dtdcSlips.from = config.value;
          break;
        case 'dtdc_slips_to':
          dtdcSlips.to = config.value;
          break;
        case 'dtdc_slips_unused':
          dtdcSlips.unused = config.value;
          break;
        case 'dtdc_slips_used':
          dtdcSlips.used = config.value;
          break;
        case 'dtdc_slips_enabled':
          dtdcSlips.enabled = config.value === 'true';
          break;
      }
    });

    console.log(`✅ [API_DTDC_SLIPS_GET] Returning DTDC slips config:`, dtdcSlips);

    const response = NextResponse.json({
      success: true,
      dtdcSlips
    });

    // Apply security headers
    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('❌ [API_DTDC_SLIPS_GET] Error fetching DTDC slips config:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch DTDC slips configuration' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}

// PUT: Update DTDC slips configuration
export async function PUT(request: NextRequest) {
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

    // Authorize user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.CHILD_USER,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;
    const client = user.client;
    const body = await request.json();
    const { dtdcSlips } = body;

    console.log(`📝 [API_DTDC_SLIPS_PUT] Updating DTDC slips config for client: ${client.companyName}`);
    console.log(`📋 [API_DTDC_SLIPS_PUT] New config:`, dtdcSlips);

    // Update or create DTDC slips configuration
    const configUpdates = [
      {
        key: 'dtdc_slips_from',
        value: dtdcSlips.from || '',
        type: 'string',
        category: 'dtdc_slips',
        description: 'Starting DTDC slip number'
      },
      {
        key: 'dtdc_slips_to',
        value: dtdcSlips.to || '',
        type: 'string',
        category: 'dtdc_slips',
        description: 'Ending DTDC slip number'
      },
      {
        key: 'dtdc_slips_unused',
        value: dtdcSlips.unused || '',
        type: 'string',
        category: 'dtdc_slips',
        description: 'Unused DTDC slip numbers'
      },
      {
        key: 'dtdc_slips_used',
        value: dtdcSlips.used || '',
        type: 'string',
        category: 'dtdc_slips',
        description: 'Used DTDC slip numbers'
      },
      {
        key: 'dtdc_slips_enabled',
        value: (dtdcSlips.enabled || false).toString(),
        type: 'boolean',
        category: 'dtdc_slips',
        description: 'DTDC slips feature enabled'
      }
    ];

    // Use upsert to create or update each config entry
    for (const config of configUpdates) {
      await prisma.client_config.upsert({
        where: {
          clientId_key: {
            clientId: client.id,
            key: config.key
          }
        },
        update: {
          value: config.value,
          updatedAt: new Date()
        },
        create: {
          id: `dtdc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          clientId: client.id,
          key: config.key,
          value: config.value,
          type: config.type,
          category: config.category,
          description: config.description,
          isEncrypted: false,
          updatedAt: new Date()
        }
      });
    }

    console.log(`✅ [API_DTDC_SLIPS_PUT] DTDC slips config updated successfully for ${client.companyName}`);

    const response = NextResponse.json({
      success: true,
      message: 'DTDC slips configuration updated successfully'
    });

    // Apply security headers
    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('❌ [API_DTDC_SLIPS_PUT] Error updating DTDC slips config:', error);
    const response = NextResponse.json(
      { error: 'Failed to update DTDC slips configuration' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}
