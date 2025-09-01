import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreditService } from '@/lib/credit-service';
import { enhancedJwtConfig } from '@/lib/jwt-config';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';

// Helper function to get authenticated user
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    // Use enhanced JWT configuration for verification
    const decoded = enhancedJwtConfig.verifyToken(token);
    
    // Get user and client data from database
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: { clients: true }
    });

    if (!user || !user.isActive || !user.clients.isActive) {
      return null;
    }
    return user;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Apply security middleware
    const securityResponse = applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      return securityResponse;
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      securityHeaders(response);
      return response;
    }

    try {
      const credits = await CreditService.getClientCredits(user.clientId);
      
      if (!credits) {
        const response = NextResponse.json({ error: 'No credits found for this client' }, { status: 404 });
        securityHeaders(response);
        return response;
      }

      const response = NextResponse.json({
        success: true,
        data: credits
      });

      // Apply security headers
      securityHeaders(response);
      return response;

    } catch (error) {
      console.error('Error getting credits:', error);
      const response = NextResponse.json({ error: 'Failed to get client credits' }, { status: 500 });
      securityHeaders(response);
      return response;
    }

  } catch (error) {
    console.error('Credits API error:', error);
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    securityHeaders(response);
    return response;
  }
}
