import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// Helper function to get authenticated user
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    if (!process.env.JWT_SECRET) {
      console.error('🚨 CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not set');
      return NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 500 }
      );
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        clients: true
      }
    });

    if (!user || !user.isActive || !user.clients.isActive) {
      return null;
    }

    return { user, client: user.clients };
  } catch (error) {
    return null;
  }
}

// GET: Retrieve DTDC slips configuration
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      console.log('❌ [API_DTDC_SLIPS_GET] Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client } = auth;
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

    return NextResponse.json({
      success: true,
      dtdcSlips
    });

  } catch (error) {
    console.error('❌ [API_DTDC_SLIPS_GET] Error fetching DTDC slips config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch DTDC slips configuration' },
      { status: 500 }
    );
  }
}

// PUT: Update DTDC slips configuration
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      console.log('❌ [API_DTDC_SLIPS_PUT] Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client } = auth;
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

    return NextResponse.json({
      success: true,
      message: 'DTDC slips configuration updated successfully'
    });

  } catch (error) {
    console.error('❌ [API_DTDC_SLIPS_PUT] Error updating DTDC slips config:', error);
    return NextResponse.json(
      { error: 'Failed to update DTDC slips configuration' },
      { status: 500 }
    );
  }
}
