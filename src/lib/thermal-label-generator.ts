/**
 * Thermal Label Generator for 3-inch (76.2mm) thermal printers
 * Optimized for thermal printers with 80mm width and proper scaling
 */

export interface ThermalLabelData {
  waybillNumber: string
  barcode?: string
  recipientName: string
  recipientAddress: string
  recipientCity: string
  recipientState: string
  recipientPincode: string
  recipientMobile: string
  senderName?: string
  senderMobile?: string
  senderAddress?: string
  courierService: string
  paymentType: string
  codAmount?: number
  referenceNumber?: string
  packageValue?: number
  quantity?: number
  date?: string
  logoInfo?: {
    url: string
    displayLogoOnWaybill: boolean
  }
  footerNote?: {
    enabled: boolean
    text: string | null
  }
}

export function generateThermalLabelHTML(data: ThermalLabelData): string {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Thermal Label - ${data.waybillNumber}</title>
    <style>
        @page {
            size: 80mm auto;
            margin: 0;
        }
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Courier New', monospace;
            margin: 0;
            padding: 0;
            width: 80mm;
            max-width: 80mm;
            background-color: white;
            font-size: 16px;
            line-height: 1.2;
            color: #000;
            font-weight: bold;
        }
        
        .label-container {
            width: 80mm;
            max-width: 80mm;
            padding: 0;
            margin: 2mm;
            background-color: white;
            border: 1px solid #000;
        }
        
        /* Header Section */
        .header {
            text-align: center;
            border-bottom: 1px solid #000;
            padding-bottom: 2mm;
            margin-bottom: 2mm;
            position: relative;
        }
        
        .header-content {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 2mm;
            flex-wrap: wrap;
        }
        
        .logo-container {
            position: absolute;
            left: 5px;
            top: 0px;
        }
        
        .logo-container img {
            max-height: 15mm;
            max-width: 30mm;
            object-fit: contain;
        }
        
        .header-text {
            flex: 1;
            min-width: 40mm;
        }
        
        .courier-name {
            font-size: 18px;
            font-weight: bold;
            margin: 0;
            text-transform: uppercase;
        }
        
        .payment-info {
            font-size: 16px;
            margin: 1mm 0;
            color: #000;
            font-weight: bold;
        }
        
        /* Barcode Section */
        .barcode-section {
            text-align: center;
            margin: 2mm 0;
            padding: 1mm;
            border: 1px solid #000;
        }
        
        .barcode-image {
            max-width: 100%;
            height: auto;
            max-height: 25mm;
            display: block;
            margin: 0 auto;
        }
        
        /* Address Section */
        .address-section {
            margin: 2mm 0;
            border: 1px solid #000;
            padding: 2mm;
        }
        
        .section-title {
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 1mm;
            border-bottom: 1px solid #000;
            padding-bottom: 1mm;
        }
        
        .address-details {
            font-size: 16px;
            line-height: 1.3;
            color: #000;
            font-weight: bold;
        }
        
        .address-line {
            margin: 0.5mm 0;
            word-wrap: break-word;
            color: #000;
            font-weight: bold;
        }
        
        /* Sender Section */
        .sender-section {
            margin: 2mm 0;
            border: 1px solid #000;
            padding: 2mm;
            background-color: #f8f8f8;
        }
        
        /* Reference Section */
        .reference-section {
            text-align: left;
            margin: 2mm 0;
            padding: 1mm;
            border: 1px solid #000;
            font-size: 16px;
            color: #000;
            font-weight: bold;
        }
        
        /* Footer */
        .footer {
            text-align: center;
            font-size: 16px;
            margin-top: 2mm;
            padding-top: 1mm;
            border-top: 1px solid #000;
            color: #000;
            font-weight: bold;
        }
        
        /* Footer Note */
        .footer-note {
            margin-top: 2mm;
            padding: 1mm;
            border: 1px solid #000;
            font-size: 14px;
            color: #000;
            font-weight: bold;
            text-align: center;
            background-color: #f8f8f8;
        }
        
        /* Utility classes */
        .text-center { text-align: center; color: #000; font-weight: bold; }
        .text-bold { font-weight: bold; color: #000; }
        .text-small { font-size: 16px; color: #000; font-weight: bold; }
        .text-large { font-size: 20px; color: #000; font-weight: bold; }
        
        /* Print optimizations */
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
            
            .label-container {
                page-break-inside: avoid;
                margin: 2mm;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="label-container">
        <!-- Header -->
        <div class="header">
            <div class="header-content">
                ${data.logoInfo && data.logoInfo.displayLogoOnWaybill ? `
                <div class="logo-container">
                    <img src="${data.logoInfo.url}" alt="Company Logo" />
                </div>
                ` : ''}
                <div class="header-text">
                    <div class="courier-name">${data.courierService.toUpperCase()}</div>
                    <div class="payment-info">Payment: ${data.paymentType}${data.paymentType === 'COD' && data.codAmount ? ` (₹${data.codAmount})` : ''}</div>
                </div>
            </div>
        </div>
        
        <!-- Barcode Section -->
        <div class="barcode-section">
            ${data.barcode ? `
                <img src="${data.barcode}" alt="Barcode" class="barcode-image" />
            ` : ''}
        </div>
        
        <!-- Recipient Address -->
        <div class="address-section">
            <div class="section-title">Ship To:</div>
            <div class="address-details">
                <div class="address-line text-bold">${data.recipientName}</div>
                <div class="address-line">${data.recipientAddress}</div>
                <div class="address-line">${data.recipientCity}, ${data.recipientState}</div>
                <div class="address-line">PIN: ${data.recipientPincode}</div>
                <div class="address-line">Mobile: ${data.recipientMobile}</div>
            </div>
        </div>
        
        <!-- Sender Information -->
        ${data.senderName ? `
        <div class="sender-section">
            <div class="section-title">From:</div>
            <div class="address-details">
                <div class="address-line text-bold">${data.senderName}</div>
                ${data.senderAddress && data.courierService.toLowerCase() === 'india_post' ? `<div class="address-line">${data.senderAddress}</div>` : ''}
                ${data.senderMobile ? `<div class="address-line">Mobile: ${data.senderMobile}</div>` : ''}
            </div>
        </div>
        ` : ''}
        
        <!-- Reference -->
        ${data.referenceNumber ? `
        <div class="reference-section">
            <div class="text-bold">${data.referenceNumber}</div>
        </div>
        ` : ''}
        
        <!-- Package Details -->
        ${data.quantity ? `
        <div class="reference-section">
            <div class="text-bold">Quantity: ${data.quantity} item${data.quantity > 1 ? 's' : ''}</div>
        </div>
        ` : ''}
        
        <!-- Date -->
        ${data.date ? `
        <div class="reference-section">
            <div class="text-small">Date: ${data.date}</div>
        </div>
        ` : ''}
        
        ${data.footerNote && data.footerNote.enabled && data.footerNote.text ? `
        <!-- Footer Note -->
        <div class="footer-note">
            ${data.footerNote.text}
        </div>
        ` : ''}
        
        <!-- Footer -->
        <div class="footer">
            <div>Generated by Scan2Ship</div>
        </div>
    </div>
</body>
</html>
  `
  
  return html
}

/**
 * Generate thermal label data from order and package info
 */
export function createThermalLabelData(order: any, packageInfo: any): ThermalLabelData {
  // Determine sender name and mobile
  const senderName = order.reseller_name && 
                    order.reseller_name.trim() !== '' && 
                    order.reseller_name.toLowerCase() !== 'no name' 
                    ? order.reseller_name : undefined;
  
  const senderMobile = order.reseller_mobile && 
                      order.reseller_mobile.trim() !== '' && 
                      order.reseller_mobile.toLowerCase() !== 'no number' 
                      ? order.reseller_mobile : undefined;

  // Determine sender address - use seller_address if available, otherwise use client address as fallback
  let senderAddress = undefined;
  
  // First try seller_address field
  if (order.seller_address && 
      order.seller_address.trim() !== '' && 
      order.seller_address.toLowerCase() !== 'no address') {
    senderAddress = order.seller_address;
  }
  // If no seller_address, try to construct from client address fields
  else if (order.client_address || order.client_city || order.client_state || order.client_pincode) {
    const addressParts = [];
    if (order.client_address) addressParts.push(order.client_address);
    if (order.client_city) addressParts.push(order.client_city);
    if (order.client_state) addressParts.push(order.client_state);
    if (order.client_pincode) addressParts.push(order.client_pincode);
    
    if (addressParts.length > 0) {
      senderAddress = addressParts.join(', ');
    }
  }

  return {
    waybillNumber: packageInfo.wbn || order.delhivery_waybill_number || order.tracking_id || 'N/A',
    barcode: packageInfo.barcode,
    recipientName: order.name || 'N/A',
    recipientAddress: order.address || 'N/A',
    recipientCity: order.city || 'N/A',
    recipientState: order.state || 'N/A',
    recipientPincode: order.pincode || 'N/A',
    recipientMobile: order.mobile || 'N/A',
    senderName,
    senderMobile,
    senderAddress,
    courierService: order.courier_service || 'Delhivery',
    paymentType: packageInfo.pt || 'Pre-paid',
    codAmount: order.cod_amount,
    referenceNumber: packageInfo.oid || order.reference_number,
    packageValue: order.package_value,
    quantity: order.total_items,
    date: new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

/**
 * Generate multiple thermal labels for bulk printing
 */
export function generateBulkThermalLabels(labelDataArray: ThermalLabelData[]): string {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Bulk Thermal Labels - ${labelDataArray.length} Labels</title>
    <style>
        @page {
            size: 80mm auto;
            margin: 0;
        }
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Courier New', monospace;
            margin: 0;
            padding: 0;
            background-color: white;
        }
        
        .label-page {
            width: 80mm;
            max-width: 80mm;
            margin: 2mm auto;
            page-break-after: always;
        }
        
        .label-page:last-child {
            page-break-after: avoid;
        }
        
        /* Include all the thermal label styles here */
        .label-container {
            width: 80mm;
            max-width: 80mm;
            padding: 0;
            margin: 2mm;
            background-color: white;
            border: 1px solid #000;
        }
        
        .header {
            text-align: center;
            border-bottom: 1px solid #000;
            padding-bottom: 2mm;
            margin-bottom: 2mm;
        }
        
        .courier-name {
            font-size: 18px;
            font-weight: bold;
            margin: 0;
            text-transform: uppercase;
        }
        
        .payment-info {
            font-size: 16px;
            margin: 1mm 0;
            color: #000;
            font-weight: bold;
        }
        
        .barcode-section {
            text-align: center;
            margin: 2mm 0;
            padding: 1mm;
            border: 1px solid #000;
        }
        
        .barcode-image {
            max-width: 100%;
            height: auto;
            max-height: 25mm;
            display: block;
            margin: 0 auto;
        }
        
        .address-section {
            margin: 2mm 0;
            border: 1px solid #000;
            padding: 2mm;
        }
        
        .section-title {
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 1mm;
            border-bottom: 1px solid #000;
            padding-bottom: 1mm;
        }
        
        .address-details {
            font-size: 16px;
            line-height: 1.3;
            color: #000;
            font-weight: bold;
        }
        
        .address-line {
            margin: 0.5mm 0;
            word-wrap: break-word;
            color: #000;
            font-weight: bold;
        }
        
        .sender-section {
            margin: 2mm 0;
            border: 1px solid #000;
            padding: 2mm;
            background-color: #f8f8f8;
        }
        
        .reference-section {
            text-align: center;
            margin: 2mm 0;
            padding: 1mm;
            border: 1px solid #000;
            font-size: 16px;
            color: #000;
            font-weight: bold;
        }
        
        .footer {
            text-align: center;
            font-size: 16px;
            margin-top: 2mm;
            padding-top: 1mm;
            border-top: 1px solid #000;
            color: #000;
            font-weight: bold;
        }
        
        .text-center { text-align: center; color: #000; font-weight: bold; }
        .text-bold { font-weight: bold; color: #000; }
        .text-small { font-size: 16px; color: #000; font-weight: bold; }
        .text-large { font-size: 20px; color: #000; font-weight: bold; }
        
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
            
            .label-page {
                page-break-inside: avoid;
                margin: 2mm auto;
            }
            
            .label-container {
                page-break-inside: avoid;
                margin: 2mm;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    ${labelDataArray.map((data, index) => `
        <div class="label-page">
            <div class="label-container">
                <!-- Header -->
                <div class="header">
                    <div class="courier-name">${data.courierService.toUpperCase()}</div>
                    <div class="payment-info">Payment: ${data.paymentType}</div>
                </div>
                
                <!-- Barcode Section -->
                <div class="barcode-section">
                    ${data.barcode ? `
                        <img src="${data.barcode}" alt="Barcode" class="barcode-image" />
                    ` : ''}
                </div>
                
                <!-- Recipient Address -->
                <div class="address-section">
                    <div class="section-title">Ship To:</div>
                    <div class="address-details">
                        <div class="address-line text-bold">${data.recipientName}</div>
                        <div class="address-line">${data.recipientAddress}</div>
                        <div class="address-line">${data.recipientCity}, ${data.recipientState}</div>
                        <div class="address-line">PIN: ${data.recipientPincode}</div>
                        <div class="address-line">Mobile: ${data.recipientMobile}</div>
                    </div>
                </div>
                
                <!-- Sender Information -->
                ${data.senderName ? `
                <div class="sender-section">
                    <div class="section-title">From:</div>
                    <div class="address-details">
                        <div class="address-line text-bold">${data.senderName}</div>
                        ${data.senderAddress && data.courierService.toLowerCase() === 'india_post' ? `<div class="address-line">${data.senderAddress}</div>` : ''}
                        ${data.senderMobile ? `<div class="address-line">Mobile: ${data.senderMobile}</div>` : ''}
                    </div>
                </div>
                ` : ''}
                
                <!-- Reference -->
                ${data.referenceNumber ? `
                <div class="reference-section">
                    <div class="text-bold">${data.referenceNumber}</div>
                </div>
                ` : ''}
                

                
                <!-- Date -->
                ${data.date ? `
                <div class="reference-section">
                    <div class="text-small">Date: ${data.date}</div>
                </div>
                ` : ''}
                
                <!-- Footer -->
                <div class="footer">
                    <div>Generated by Scan2Ship</div>
                </div>
            </div>
        </div>
    `).join('')}
</body>
</html>
  `
  
  return html
}
