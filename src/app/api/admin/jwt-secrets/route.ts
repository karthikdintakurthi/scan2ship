import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtSecretManager } from '@/lib/jwt-secret-manager';
import { enhancedJwtConfig } from '@/lib/jwt-config';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
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

    // Get JWT secret statistics
    const stats = jwtSecretManager.getSecretStats();
    
    // Get current token info from request
    const authHeader = request.headers.get('authorization');
    let currentTokenInfo = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      currentTokenInfo = enhancedJwtConfig.getTokenInfo(token);
    }

    return NextResponse.json({
      success: true,
      data: {
        stats,
        currentToken: currentTokenInfo,
        rotationConfig: {
          maxActiveSecrets: 3,
          rotationIntervalDays: 30,
          secretLifetimeDays: 90,
          autoRotation: true
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching JWT secret info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch JWT secret information' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Authorize master admin user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.MASTER_ADMIN,
      requiredPermissions: [PermissionLevel.ADMIN],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const { action } = await request.json();

    if (action === 'rotate') {
      await jwtSecretManager.rotateSecrets();
      
      return NextResponse.json({
        success: true,
        message: 'JWT secrets rotated successfully',
        data: jwtSecretManager.getSecretStats()
      });
    } else if (action === 'create') {
      const newSecret = await jwtSecretManager.createSecret('Manual creation');
      
      return NextResponse.json({
        success: true,
        message: 'New JWT secret created successfully',
        data: {
          secretId: newSecret.id,
          stats: jwtSecretManager.getSecretStats()
        }
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "rotate" or "create"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Error managing JWT secrets:', error);
    return NextResponse.json(
      { error: 'Failed to manage JWT secrets' },
      { status: 500 }
    );
  }
}
