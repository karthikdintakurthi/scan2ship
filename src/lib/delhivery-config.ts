import { getPickupLocationConfig, getProductDetails, getReturnAddress, getSellerDetails, getVendorPickupLocation, getShipmentDimensions, getFragileShipment } from './pickup-location-config'

export interface DelhiveryConfig {
  shipment_dimensions: {
    length: number
    breadth: number
    height: number
  }
  product_details: {
    description: string
    commodity_value: number
    tax_value: number
    category: string
    hsn_code: string
  }
  return_address: {
    address: string
    pincode: string
  }
  fragile_shipment: boolean
  seller_details: {
    name: string
    address: string
    gst: string
    cst_no: string
    tin: string
    invoice_number?: string
  }
  vendor_pickup_location: string
  default_weight: number
  default_package_amount: number
}

// Real configuration based on actual business data from JSON
export const delhiveryConfig: DelhiveryConfig = {
  shipment_dimensions: {
    length: 10.0, // 10 cm (from actual data)
    breadth: 10.0, // 10 cm (from actual data)
    height: 10.0, // 10 cm (from actual data)
  },
  product_details: {
    description: "Artificial Jewel", // From actual data
    category: "Artificial Jewel", // From actual data
    commodity_value: 0.0, // Will be overridden by package_value
    tax_value: 0.0, // From actual data (0% tax)
    hsn_code: "", // From actual data
  },
  return_address: {
    address: "CIRCLE19/25-3, CHILAKALAPUDI,\nMACHILIPATNAM \nAndhra Pradesh", // From actual data
    pincode: "521002", // From actual data
  },
  seller_details: {
    name: "VIJAYA8 FRANCHISE", // Business name
    address: "CIRCLE19/25-3, CHILAKALAPUDI,\nMACHILIPATNAM \nAndhra Pradesh", // From actual data
    gst: "", // From actual data (empty)
    invoice_number: "", // From actual data (empty)
    cst_no: "", // From actual data (empty)
    tin: "", // From actual data (empty)
  },
  vendor_pickup_location: "VIJAYA8 FRANCHISE", // From actual data
  fragile_shipment: false, // From actual data
  default_weight: 100, // 100 grams (from actual data)
  default_package_amount: 5000, // ₹5000 (from actual data)
};

// Function to get default values for a new order
export async function getDefaultDelhiveryValues(packageValue: number, pickupLocation: string = 'VIJAYA8 FRANCHISE') {
  const config = await getPickupLocationConfig(pickupLocation)
  
  return {
    shipment_dimensions: {
      length: config?.shipmentDimensions?.length || 10,
      breadth: config?.shipmentDimensions?.breadth || 10,
      height: config?.shipmentDimensions?.height || 10
    },
    product_details: {
      description: config?.productDetails?.description || 'Artificial Jewel',
      commodity_value: packageValue,
      tax_value: config?.productDetails?.tax_value || 0,
      category: config?.productDetails?.category || 'Artificial Jewel',
      hsn_code: config?.productDetails?.hsn_code || '7117'
    },
    return_address: {
      address: config?.returnAddress?.address || 'CIRCLE19/25-3, CHILAKALAPUDI,\nMACHILIPATNAM \nAndhra Pradesh',
      pincode: config?.returnAddress?.pincode || '521002'
    },
    fragile_shipment: config?.fragileShipment || false,
    seller_details: {
      name: config?.sellerDetails?.name || 'VIJAYA8 FRANCHISE',
      address: config?.sellerDetails?.address || 'CIRCLE19/25-3, CHILAKALAPUDI,\nMACHILIPATNAM \nAndhra Pradesh',
      gst: config?.sellerDetails?.gst || '37AABFV1234A1Z5',
      cst_no: config?.sellerDetails?.cst_no || 'CST123456',
      tin: config?.sellerDetails?.tin || 'TIN123456',
      invoice_number: config?.invoiceNumber || ''
    },
    vendor_pickup_location: config?.vendorPickupLocation || 'VIJAYA8 FRANCHISE',
    default_weight: 100,
    default_package_amount: 5000
  }
}

// Function to merge user input with default values
export async function mergeDelhiveryValues(
  userInput: Partial<DelhiveryConfig>,
  packageValue: number
): Promise<DelhiveryConfig> {
  const defaults = await getDefaultDelhiveryValues(packageValue);
  return {
    shipment_dimensions: userInput.shipment_dimensions || defaults.shipment_dimensions!,
    product_details: {
      description: userInput.product_details?.description || defaults.product_details!.description,
      category: userInput.product_details?.category || defaults.product_details!.category,
      commodity_value: userInput.product_details?.commodity_value || packageValue,
      tax_value: 0, // Always 0% tax as per business data
      hsn_code: userInput.product_details?.hsn_code || defaults.product_details!.hsn_code,
    },
    return_address: userInput.return_address || defaults.return_address!,
    seller_details: userInput.seller_details || defaults.seller_details!,
    vendor_pickup_location: userInput.vendor_pickup_location || defaults.vendor_pickup_location!,
    fragile_shipment: userInput.fragile_shipment ?? defaults.fragile_shipment!,
    default_weight: userInput.default_weight || defaults.default_weight!,
    default_package_amount: userInput.default_package_amount || defaults.default_package_amount!,
  };
}
