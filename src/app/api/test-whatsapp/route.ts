import { NextRequest, NextResponse } from 'next/server';
import whatsappService from '@/lib/whatsapp-service';

export async function POST(request: NextRequest) {
  try {
    const { phone, variables } = await request.json();

    if (!phone || !variables || !Array.isArray(variables)) {
      return NextResponse.json(
        { error: 'Phone number and variables array are required' },
        { status: 400 }
      );
    }

    console.log('📱 [TEST_WHATSAPP] Testing WhatsApp service with:', { phone, variables });

    const result = await whatsappService.sendTestWhatsApp(phone, variables);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'WhatsApp message sent successfully',
        messageId: result.messageId
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to send WhatsApp message'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ [TEST_WHATSAPP] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
