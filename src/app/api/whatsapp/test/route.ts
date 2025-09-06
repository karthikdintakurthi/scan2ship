import { NextRequest, NextResponse } from 'next/server';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import whatsappService from '@/lib/whatsapp-service';

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

    // Authorize user (admin only for testing)
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.ADMIN,
      requiredPermissions: [PermissionLevel.ADMIN],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    // Parse request body
    const body = await request.json();
    const { phoneNumber, testVariables } = body;

    // Validate input
    if (!phoneNumber || !testVariables || !Array.isArray(testVariables)) {
      const response = NextResponse.json(
        { error: 'Invalid request body. Phone number and test variables are required.' },
        { status: 400 }
      );
      securityHeaders(response);
      return response;
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      const response = NextResponse.json(
        { error: 'Invalid phone number format. Please use 10-digit number.' },
        { status: 400 }
      );
      securityHeaders(response);
      return response;
    }

    // Send test WhatsApp message
    const result = await whatsappService.sendTestWhatsApp(phoneNumber, testVariables);
    
    if (result.success) {
      const response = NextResponse.json({
        success: true,
        message: 'Test WhatsApp message sent successfully',
        timestamp: new Date().toISOString()
      });
      securityHeaders(response);
      return response;
    } else {
      const response = NextResponse.json({
        success: false,
        error: result.error || 'Failed to send test WhatsApp message',
        timestamp: new Date().toISOString()
      }, { status: 500 });
      securityHeaders(response);
      return response;
    }

  } catch (error) {
    console.error('WhatsApp test API error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}
