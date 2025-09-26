import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeSuperAdmin } from '@/lib/auth-middleware';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import crypto from 'crypto';

/**
 * API Keys Management API
 * Handles creation and listing of API keys for clients
 */

// GET /api/admin/api-keys - List API keys
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

    // Authorize super admin
    const authResult = await authorizeSuperAdmin(request);
    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const apiKeys = await prisma.api_keys.findMany({
      include: {
        clients: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: apiKeys
    });

  } catch (error: any) {
    console.error('API keys GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

// POST /api/admin/api-keys - Create new API key
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

    // Authorize super admin
    const authResult = await authorizeSuperAdmin(request);
    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const { name, clientId, permissions = [], expiresAt } = await request.json();

    if (!name || !clientId) {
      return NextResponse.json(
        { error: 'Name and clientId are required' },
        { status: 400 }
      );
    }

    // Check if client exists
    const client = await prisma.clients.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Generate unique API key
    const apiKey = 'ss_sk_' + crypto.randomBytes(32).toString('hex');

    // Create API key
    const newApiKey = await prisma.api_keys.create({
      data: {
        id: 'api-key-' + Date.now(),
        name,
        key: apiKey,
        clientId,
        permissions,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        clients: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: newApiKey,
      message: 'API key created successfully'
    });

  } catch (error: any) {
    console.error('API keys POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create API key' },
      { status: 500 }
    );
  }
}
