import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtSecretManager } from '@/lib/jwt-secret-manager';
import { enhancedJwtConfig } from '@/lib/jwt-config';

// Helper function to get authenticated admin user
async function getAuthenticatedAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = enhancedJwtConfig.verifyToken(token);
    
    // Get user and client data from database
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        clients: true
      }
    });

    if (!user || !user.isActive || (user.role !== 'admin' && user.role !== 'master_admin')) {
      return null;
    }

    return {
      user: user,
      client: user.clients
    };
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    const auth = await getAuthenticatedAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only master admin can rotate secrets
    if (auth.user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Master admin privileges required' }, { status: 403 });
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
