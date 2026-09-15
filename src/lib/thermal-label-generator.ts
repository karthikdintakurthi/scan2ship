/**
 * Thermal Label Generator for 3-inch (76.2mm) thermal printers
 * High-contrast black/white only — gray fills and 1px hairlines wash out on 203dpi heads.
 */

import { indiaPostCustomerIdHeadingHtml } from '@/lib/india-post-customer-id'

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
  indiaPostCustomerId?: string | null
}

/** Shared CSS for single and bulk thermal labels. */
const THERMAL_LABEL_CSS = `
        @page {
            size: 80mm auto;
            margin: 0;
        }

        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 0;
            width: 80mm;
            max-width: 80mm;
            background-color: #ffffff;
            font-size: 13px;
            line-height: 1.18;
            color: #000000;
            font-weight: 700;
        }

        .label-page {
            width: 80mm;
            max-width: 80mm;
            margin: 0 auto;
            page-break-after: always;
        }

        .label-page:last-child {
            page-break-after: avoid;
        }

        .label-container {
            width: 80mm;
            max-width: 80mm;
            padding: 1mm;
            margin: 0;
            background-color: #ffffff;
            border: 2px solid #000000;
        }

        .header {
            text-align: center;
            margin-bottom: 0.8mm;
            position: relative;
        }

        .header-content {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5mm;
            flex-wrap: wrap;
        }

        .logo-container {
            position: absolute;
            left: 5px;
            top: 0px;
        }

        .logo-container img {
            max-height: 8mm;
            max-width: 20mm;
            object-fit: contain;
            filter: grayscale(1) contrast(1.6);
        }

        .header-text {
            flex: 1;
            min-width: 40mm;
        }

        .courier-name {
            font-size: 15px;
            font-weight: 800;
            margin: 0;
            padding: 0.8mm 1.5mm;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            background: #000000;
            color: #ffffff;
        }

        .customer-id {
            font-size: 12px;
            margin: 0.6mm 0 0 0;
            padding: 0.6mm 1.5mm;
            color: #000000;
            font-weight: 800;
            border: 2px solid #000000;
        }

        .payment-info {
            font-size: 13px;
            margin: 0.6mm 0 0 0;
            padding: 0.6mm 1.5mm;
            color: #000000;
            font-weight: 800;
            border: 2px solid #000000;
            text-transform: uppercase;
        }

        .payment-info.cod {
            background: #000000;
            color: #ffffff;
        }

        .barcode-section {
            text-align: center;
            margin: 0.8mm 0;
            padding: 0.8mm;
            border: 2px solid #000000;
            background: #ffffff;
        }

        .barcode-image {
            max-width: 100%;
            height: auto;
            max-height: 16mm;
            display: block;
            margin: 0 auto;
            image-rendering: pixelated;
        }

        .barcode-number {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 15px;
            font-weight: 900;
            color: #000000;
            letter-spacing: 0.6px;
            margin-top: 0.6mm;
            line-height: 1.15;
            -webkit-text-stroke: 0.3px #000000;
            text-rendering: geometricPrecision;
        }

        .address-section,
        .sender-section,
        .reference-section,
        .footer-note {
            margin: 0.8mm 0;
            border: 2px solid #000000;
            padding: 0.8mm 1.5mm;
            background: #ffffff;
        }

        .section-title {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            margin: 0 0 0.5mm 0;
            border-bottom: 2px solid #000000;
            padding-bottom: 0.4mm;
            color: #000000;
        }

        .address-details,
        .address-line {
            font-size: 13px;
            line-height: 1.2;
            color: #000000;
            font-weight: 700;
            word-wrap: break-word;
        }

        .address-line {
            margin: 0.15mm 0;
        }

        .reference-section {
            text-align: left;
            font-size: 13px;
            font-weight: 800;
            color: #000000;
        }

        .footer {
            text-align: center;
            font-size: 11px;
            margin-top: 0.8mm;
            padding-top: 0.6mm;
            border-top: 2px solid #000000;
            color: #000000;
            font-weight: 700;
        }

        .footer-note {
            font-size: 12px;
            font-weight: 800;
            text-align: center;
            color: #000000;
        }

        .text-center { text-align: center; color: #000000; font-weight: 700; }
        .text-bold { font-weight: 800; color: #000000; }
        .text-small { font-size: 12px; color: #000000; font-weight: 700; }
        .text-large { font-size: 15px; color: #000000; font-weight: 800; }

        @media print {
            html, body {
                margin: 0;
                padding: 0;
                background: #ffffff;
                color: #000000;
            }

            .label-page,
            .label-container {
                page-break-inside: avoid;
                margin: 0;
            }

            .courier-name,
            .payment-info.cod {
                background: #000000 !important;
                color: #ffffff !important;
            }
        }
`

function paymentClass(paymentType: string): string {
  return paymentType.toUpperCase().includes('COD') ? 'payment-info cod' : 'payment-info'
}

function thermalLabelBody(data: ThermalLabelData, includeHeaderFlex: boolean): string {
  const paymentLine = `Payment: ${data.paymentType}${data.paymentType === 'COD' && data.codAmount ? ` (₹${data.codAmount})` : ''}`
  const headerInner = includeHeaderFlex
    ? `
            <div class="header-content">
                ${data.logoInfo && data.logoInfo.displayLogoOnWaybill ? `
                <div class="logo-container">
                    <img src="${data.logoInfo.url}" alt="Company Logo" />
                </div>
                ` : ''}
                <div class="header-text">
                    <div class="courier-name">${data.courierService.toUpperCase()}</div>
                    ${indiaPostCustomerIdHeadingHtml(data.courierService, data.indiaPostCustomerId)}
                    <div class="${paymentClass(data.paymentType)}">${paymentLine}</div>
                </div>
            </div>`
    : `
                    <div class="courier-name">${data.courierService.toUpperCase()}</div>
                    ${indiaPostCustomerIdHeadingHtml(data.courierService, data.indiaPostCustomerId)}
                    <div class="${paymentClass(data.paymentType)}">${paymentLine}</div>`

  return `
            <div class="label-container">
                <div class="header">${headerInner}
                </div>

                <div class="barcode-section">
                    ${data.barcode ? `<img src="${data.barcode}" alt="Barcode" class="barcode-image" />` : ''}
                    <div class="barcode-number">${data.waybillNumber}</div>
                </div>

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

                ${data.referenceNumber || data.quantity || data.date ? `
                <div class="reference-section">
                    ${data.referenceNumber ? `<div class="text-bold">${data.referenceNumber}</div>` : ''}
                    ${data.quantity ? `<div class="text-small">Qty: ${data.quantity}</div>` : ''}
                    ${data.date ? `<div class="text-small">${data.date}</div>` : ''}
                </div>
                ` : ''}

                ${data.footerNote && data.footerNote.enabled && data.footerNote.text ? `
                <div class="footer-note">
                    <strong>${data.footerNote.text}</strong>
                </div>
                ` : ''}

                <div class="footer">
                    <div>Generated by Scan2Ship</div>
                </div>
            </div>`
}

export function generateThermalLabelHTML(data: ThermalLabelData): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Thermal Label - ${data.waybillNumber}</title>
    <style>
${THERMAL_LABEL_CSS}
    </style>
</head>
<body>
${thermalLabelBody(data, true)}
</body>
</html>
  `
}

/**
 * Generate thermal label data from order and package info
 */
export function createThermalLabelData(order: any, packageInfo: any): ThermalLabelData {
  const senderName = order.reseller_name &&
                    order.reseller_name.trim() !== '' &&
                    order.reseller_name.toLowerCase() !== 'no name'
                    ? order.reseller_name : undefined

  const senderMobile = order.reseller_mobile &&
                      order.reseller_mobile.trim() !== '' &&
                      order.reseller_mobile.toLowerCase() !== 'no number'
                      ? order.reseller_mobile : undefined

  let senderAddress = undefined

  if (order.seller_address &&
      order.seller_address.trim() !== '' &&
      order.seller_address.toLowerCase() !== 'no address') {
    senderAddress = order.seller_address
  } else if (order.client_address || order.client_city || order.client_state || order.client_pincode) {
    const addressParts = []
    if (order.client_address) addressParts.push(order.client_address)
    if (order.client_city) addressParts.push(order.client_city)
    if (order.client_state) addressParts.push(order.client_state)
    if (order.client_pincode) addressParts.push(order.client_pincode)

    if (addressParts.length > 0) {
      senderAddress = addressParts.join(', ')
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

export function generateBulkThermalLabels(labelDataArray: ThermalLabelData[]): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Bulk Thermal Labels - ${labelDataArray.length} Labels</title>
    <style>
${THERMAL_LABEL_CSS}
    </style>
</head>
<body>
    ${labelDataArray.map((data) => `
        <div class="label-page">
${thermalLabelBody(data, true)}
        </div>
    `).join('')}
</body>
</html>
  `
}
