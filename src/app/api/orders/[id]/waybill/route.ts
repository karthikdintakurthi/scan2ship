import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import jwt from 'jsonwebtoken'
import { generateThermalLabelHTML, createThermalLabelData } from '@/lib/thermal-label-generator'
import { generateA5LabelHTML, createA5LabelData } from '@/lib/a5-label-generator'

const prisma = new PrismaClient()

// Authentication handled by centralized middleware

// Function to generate barcode for tracking number using external service
async function generateBarcode(trackingNumber: string): Promise<string> {
  try {
    // Use a reliable barcode generation service
    const barcodeUrl = `https://barcodeapi.org/api/Code128/${encodeURIComponent(trackingNumber)}`;
    const response = await fetch(barcodeUrl);
    
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return `data:image/png;base64,${base64}`;
    } else {
      console.error('Barcode service returned error:', response.status);
      return '';
    }
  } catch (error) {
    console.error('Error generating barcode:', error);
    return '';
  }
}

// Function to get courier service name from code
function getCourierServiceName(courierCode: string): string {
  const courierMap: { [key: string]: string } = {
    'delhivery': 'Delhivery',
    'dtdc': 'DTDC',
    'india_post': 'India Post',
    'manual': 'Manual'
  };
  return courierMap[courierCode.toLowerCase()] || courierCode;
}

// Function to generate universal waybill HTML
function generateUniversalWaybillHTML(order: any, barcodeDataURL: string, courierService: string, logoInfo?: { url: string; displayLogoOnWaybill: boolean }, footerNote?: { enabled: boolean; text: string | null }): string {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Waybill - ${order.tracking_id || order.reference_number || 'N/A'}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border: 2px solid #333;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
            position: relative;
        }
        .header-content {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
        }
        .logo-container {
            position: absolute;
            left: 25%;
        }
        .logo-container img {
            max-height: 60px;
            max-width: 150px;
            object-fit: contain;
        }
        .header-text {
            flex: 1;
            min-width: 200px;
        }
        .header h1 {
            margin: 0;
            color: #000;
            font-size: 28px;
        }
        .courier-info {
            margin: 10px 0;
            color: #000;
            font-size: 18px;
        }
        .payment-status {
            margin: 10px 0;
            color: #000;
            font-size: 16px;
        }
        .waybill-section {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 5px;
        }
        .waybill-label {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #000;
        }
        .barcode-image {
            margin: 15px 0;
        }
        .barcode-image img {
            max-width: 300px;
            height: auto;
        }
        .tracking-number {
            font-size: 24px;
            font-weight: bold;
            color: #000;
            font-family: monospace;
            margin-top: 10px;
        }
        .recipient-section {
            margin: 30px 0;
        }
        .recipient-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #000;
        }
        .recipient-details {
            line-height: 1.6;
            color: #000;
        }
        .sender-section {
            margin: 30px 0;
            padding: 20px;
            background-color: #f0f8ff;
            border-radius: 5px;
            border-left: 4px solid #0066cc;
        }

        .reference {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #000;
            font-weight: bold;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #000;
        }
        .footer-note {
            margin-top: 20px;
            padding: 15px;
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            font-size: 14px;
            color: #000;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                ${logoInfo && logoInfo.displayLogoOnWaybill ? `
                <div class="logo-container">
                    <img src="${logoInfo.url}" alt="Company Logo" />
                </div>
                ` : ''}
                <div class="header-text">
                    <h1>${getCourierServiceName(courierService)} Courier</h1>
                    <div class="payment-status">Payment: ${order.is_cod ? 'COD' : 'Pre-paid'}${order.is_cod && order.cod_amount ? ` (₹${order.cod_amount})` : ''}</div>
                </div>
            </div>
        </div>
        
        ${barcodeDataURL ? `
        <div class="waybill-section">
            <div class="waybill-label">Tracking Number:</div>
            <div class="barcode-image">
                <img src="${barcodeDataURL}" alt="Barcode" />
            </div>
        </div>
        ` : ''}
        
        <div class="recipient-section">
            <div class="recipient-title">Recipient Details:</div>
            <div class="recipient-details">
                <strong>Name:</strong> ${order.name || 'N/A'}<br>
                <strong>Address:</strong> ${order.address || 'N/A'}<br>
                <strong>City:</strong> ${order.city || 'N/A'}<br>
                <strong>State:</strong> ${order.state || 'N/A'}<br>
                <strong>Pincode:</strong> ${order.pincode || 'N/A'}<br>
                <strong>Mobile:</strong> ${order.mobile || 'N/A'}
                ${order.phone && order.phone !== order.mobile ? `<br><strong>Phone:</strong> ${order.phone}` : ''}
            </div>
        </div>
        
        ${order.reseller_name && 
          order.reseller_name.trim() !== '' && 
          order.reseller_name.toLowerCase() !== 'no name' ? `
        <div class="sender-section">
            <div class="recipient-title">From:</div>
            <div class="recipient-details">
                <strong>Name:</strong> ${order.reseller_name}<br>
                ${courierService.toLowerCase() === 'india_post' ? `
                <strong>Address:</strong> ${order.clients.address || 'N/A'}, ${order.clients.city || 'N/A'}, ${order.clients.state || 'N/A'} ${order.clients.pincode || 'N/A'}<br>
                ` : ''}
                ${order.reseller_mobile && 
                  order.reseller_mobile.trim() !== '' && 
                  order.reseller_mobile.toLowerCase() !== 'no number' ? `<strong>Mobile:</strong> ${order.reseller_mobile}` : ''}
            </div>
        </div>
        ` : ''}
        
        <div class="reference" style="text-align: left; font-size: 20px; font-weight: 900;">
            <strong>Ref. No:</strong> ${order.reference_number || 'N/A'}
        </div>
        
        ${footerNote && footerNote.enabled && footerNote.text ? `
        <div class="footer-note">
            ${footerNote.text}
        </div>
        ` : ''}
        
        <div class="footer">
            Generated by Scan2Ship - Professional Logistics Management System
        </div>
    </div>
</body>
</html>
  `
  return html
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const auth = { user: authResult.user!, client: authResult.user!.client };

    const { id } = await params
    const orderId = parseInt(id)
    
    // Check for print format query parameters
    const url = new URL(request.url)
    const isThermal = url.searchParams.get('thermal') === 'true'
    const isA5 = url.searchParams.get('a5') === 'true'
    
    // Get order details with client information and logo config
    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        clients: {
          include: {
            client_order_configs: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if order belongs to authenticated user's client
    if (order.clientId !== auth.client.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Generate barcode only if there's a valid tracking_id (not reference_number)
    let barcodeDataURL = '';
    
    // For ALL courier services, only generate barcode if tracking_id exists (not empty or "null")
    if (order.tracking_id && order.tracking_id.trim() !== '' && order.tracking_id !== 'null') {
      barcodeDataURL = await generateBarcode(order.tracking_id);
    }
    
    // Determine tracking number for display
    let trackingNumber;
    if (order.tracking_id && order.tracking_id.trim() !== '' && order.tracking_id !== 'null') {
      // For ALL couriers, use tracking_id if available
      trackingNumber = order.tracking_id;
    } else if (order.courier_service && typeof order.courier_service === 'string' && order.courier_service.toLowerCase() === 'delhivery' && order.delhivery_waybill_number) {
      // For Delhivery, fallback to waybill number if no tracking_id
      trackingNumber = order.delhivery_waybill_number;
    } else {
      // No fallback - don't generate barcode if no tracking_id
      trackingNumber = '';
    }

    // Check if logo should be displayed for this courier service
    let logoInfo: { url: string; displayLogoOnWaybill: boolean } | undefined;
    const orderConfig = order.clients.client_order_configs;
    if (orderConfig && orderConfig.displayLogoOnWaybill) {
      const enabledCouriers = JSON.parse(orderConfig.logoEnabledCouriers || '[]');
      if (enabledCouriers.includes(order.courier_service.toLowerCase())) {
        // Check for uploaded logo file first, then fallback to logo URL
        if (orderConfig.logoFileName) {
          logoInfo = {
            url: `/images/uploads/logos/${orderConfig.logoFileName}`,
            displayLogoOnWaybill: true
          };
        } else if (orderConfig.logoUrl) {
          logoInfo = {
            url: orderConfig.logoUrl,
            displayLogoOnWaybill: true
          };
        }
      }
    }

    // Check if footer note should be displayed
    let footerNote: { enabled: boolean; text: string | null } | undefined;
    if (orderConfig && orderConfig.enableFooterNote && orderConfig.footerNoteText) {
      footerNote = {
        enabled: orderConfig.enableFooterNote,
        text: orderConfig.footerNoteText
      };
    }
    
    let htmlContent: string
    let filename: string

    if (isThermal) {
      // Generate thermal printer label
      const packageInfo = {
        wbn: trackingNumber,
        barcode: barcodeDataURL,
        pt: order.is_cod ? 'COD' : 'Pre-paid',
        oid: order.reference_number
      }
      const thermalData = createThermalLabelData(order, packageInfo)
      // Add logo info to thermal data
      if (logoInfo) {
        thermalData.logoInfo = logoInfo;
      }
      // Add footer note to thermal data
      if (footerNote) {
        thermalData.footerNote = footerNote;
      }
      htmlContent = generateThermalLabelHTML(thermalData)
      filename = `thermal-waybill-${trackingNumber}.html`
      console.log('✅ Thermal waybill generated for order:', orderId, 'Courier:', order.courier_service, 'Logo:', logoInfo ? 'Yes' : 'No', 'Footer Note:', footerNote ? 'Yes' : 'No')
    } else if (isA5) {
      // Generate A5-friendly label
      const packageInfo = {
        wbn: trackingNumber,
        barcode: barcodeDataURL,
        pt: order.is_cod ? 'COD' : 'Pre-paid',
        oid: order.reference_number
      }
      
      // Add client address information to order data for A5 label
      const orderWithClientAddress = {
        ...order,
        client_address: order.clients?.address,
        client_city: order.clients?.city,
        client_state: order.clients?.state,
        client_pincode: order.clients?.pincode
      }
      
      const a5Data = createA5LabelData(orderWithClientAddress, packageInfo)
      // Add logo info to A5 data
      if (logoInfo) {
        a5Data.logoInfo = logoInfo;
      }
      // Add footer note to A5 data
      if (footerNote) {
        a5Data.footerNote = footerNote;
      }
      htmlContent = generateA5LabelHTML(a5Data)
      filename = `a5-waybill-${trackingNumber}.html`
      console.log('✅ A5 waybill generated for order:', orderId, 'Courier:', order.courier_service, 'Logo:', logoInfo ? 'Yes' : 'No', 'Footer Note:', footerNote ? 'Yes' : 'No')
    } else {
      // Generate universal waybill HTML
      htmlContent = generateUniversalWaybillHTML(order, barcodeDataURL, order.courier_service, logoInfo, footerNote)
      filename = `waybill-${trackingNumber}.html`
      console.log('✅ Universal waybill generated for order:', orderId, 'Courier:', order.courier_service, 'Logo:', logoInfo ? 'Yes' : 'No', 'Footer Note:', footerNote ? 'Yes' : 'No')
    }

    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('Error in universal waybill generation:', error)
    return NextResponse.json({ 
      error: 'Failed to generate waybill',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
