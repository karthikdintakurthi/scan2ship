import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { generateThermalLabelHTML, createThermalLabelData } from '@/lib/thermal-label-generator'

const prisma = new PrismaClient()

// Helper function to get authenticated user
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        clients: true
      }
    });

    if (!user || !user.isActive || !user.clients.isActive) {
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
function generateUniversalWaybillHTML(order: any, barcodeDataURL: string, courierService: string): string {
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
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${getCourierServiceName(courierService)} Courier</h1>
            <div class="payment-status">Payment: ${order.is_cod ? 'COD' : 'Pre-paid'}</div>
        </div>
        
        ${order.courier_service.toLowerCase() !== 'india_post' ? `
        <div class="waybill-section">
            <div class="waybill-label">Tracking Number:</div>
            ${barcodeDataURL ? `
            <div class="barcode-image">
                <img src="${barcodeDataURL}" alt="Barcode" />
            </div>
            ` : ''}
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
                ${order.courier_service.toLowerCase() === 'india_post' ? `
                <strong>Address:</strong> ${order.clients.address || 'N/A'}, ${order.clients.city || 'N/A'}, ${order.clients.city || 'N/A'}, ${order.clients.state || 'N/A'} ${order.clients.pincode || 'N/A'}<br>
                ` : ''}
                ${order.reseller_mobile && 
                  order.reseller_mobile.trim() !== '' && 
                  order.reseller_mobile.toLowerCase() !== 'no number' ? `<strong>Mobile:</strong> ${order.reseller_mobile}` : ''}
            </div>
        </div>
        ` : ''}
        
        <div class="reference">
            <strong>Reference Number:</strong> ${order.reference_number || 'N/A'}
        </div>
        
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
    // Authenticate user
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params
    const orderId = parseInt(id)
    
    // Check for thermal printer format query parameter
    const url = new URL(request.url)
    const isThermal = url.searchParams.get('thermal') === 'true'
    
    // Get order details with client information
    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        clients: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if order belongs to authenticated user's client
    if (order.clientId !== auth.client.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Determine tracking number to use
    let trackingNumber = order.tracking_id || order.reference_number || `ORDER-${order.id}`
    
    // For Delhivery orders, use waybill number if available
    if (order.courier_service.toLowerCase() === 'delhivery' && order.delhivery_waybill_number) {
      trackingNumber = order.delhivery_waybill_number
    }

    // TEMPORARY: Don't generate barcode for India Post orders
    let barcodeDataURL = '';
    if (order.courier_service.toLowerCase() !== 'india_post') {
      barcodeDataURL = await generateBarcode(trackingNumber);
    }
    
    let htmlContent: string
    let filename: string

    if (isThermal) {
      // Generate thermal printer label
      const packageInfo = {
        wbn: trackingNumber,
        barcode: barcodeDataURL,
        pt: 'Pre-paid',
        oid: order.reference_number
      }
      const thermalData = createThermalLabelData(order, packageInfo)
      htmlContent = generateThermalLabelHTML(thermalData)
      filename = `thermal-waybill-${trackingNumber}.html`
      console.log('✅ Thermal waybill generated for order:', orderId, 'Courier:', order.courier_service)
    } else {
      // Generate universal waybill HTML
      htmlContent = generateUniversalWaybillHTML(order, barcodeDataURL, order.courier_service)
      filename = `waybill-${trackingNumber}.html`
      console.log('✅ Universal waybill generated for order:', orderId, 'Courier:', order.courier_service)
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
