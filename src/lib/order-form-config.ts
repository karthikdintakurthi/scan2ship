import { getPickupLocationValues, getPickupLocationLabels } from './pickup-location-config'
import { getActiveCourierServices } from './courier-service-config'

export interface OrderFormConfig {
  // Default form values
  defaultValues: {
    courier_service: string
    pickup_location: string
    package_value: string
    weight: string
    total_items: string
    is_cod: boolean
    cod_amount: string
  }
  
  // Courier service options - now dynamically loaded from database
  courierServices: Array<{
    value: string
    label: string
  }>
  
  // Pickup location options - now dynamically loaded from database
  pickupLocations: Array<{
    value: string
    label: string
  }>
  
  // Form field configurations
  fields: {
    package_value: {
      step: string
      min: string
      placeholder: string
      label: string
      currency: string
    }
    weight: {
      step: string
      min: string
      placeholder: string
      unit: string
      label: string
    }
    total_items: {
      min: string
      placeholder: string
      label: string
    }
    cod_amount: {
      step: string
      min: string
      placeholder: string
      label: string
    }
  }
  
  // Validation messages
  validation: {
    pincode: {
      serviceable: string
      notServiceable: string
      validating: string
    }
  }
  
  // Form sections and labels
  labels: {
    customerInformation: string
    orderInformation: string
    resellerInformation: string
    submitButton: string
    resetButton: string
  }
}

// Default configuration with fallback values
export const orderFormConfig: OrderFormConfig = {
  defaultValues: {
    courier_service: 'Delhivery',
    pickup_location: 'RVD Jewels',
    package_value: '5000',
    weight: '100',
    total_items: '1',
    is_cod: false,
    cod_amount: ''
  },
  
  // Default courier services (will be overridden by async function)
  courierServices: [
    {
      value: 'Delhivery',
      label: 'Delhivery'
    }
  ],
  
  // Default pickup locations (will be overridden by async function)
  pickupLocations: [
    {
      value: 'RVD JEWELS',
      label: 'RVD JEWELS'
    }
  ],
  
  fields: {
    package_value: {
      step: '0.01',
      min: '0',
      placeholder: '5000',
      label: 'Package Value',
      currency: '₹'
    },
    weight: {
      step: '1',
      min: '0',
      placeholder: '100',
      unit: 'g',
      label: 'Weight'
    },
    total_items: {
      min: '1',
      placeholder: '1',
      label: 'Total Items'
    },
    cod_amount: {
      step: '0.01',
      min: '0',
      placeholder: '0.00',
      label: 'COD Amount'
    }
  },
  
  validation: {
    pincode: {
      serviceable: '✅ Serviceable by Delhivery',
      notServiceable: '❌ Not serviceable by Delhivery',
      validating: 'Validating pincode...'
    }
  },
  
  labels: {
    customerInformation: 'Customer Information',
    orderInformation: 'Order Information',
    resellerInformation: 'Reseller Information',
    submitButton: 'Submit Order',
    resetButton: 'Reset Form'
  }
}

// Async function to get order form config with dynamic data
export async function getOrderFormConfig(): Promise<OrderFormConfig> {
  try {
    // Get pickup locations from API
    const pickupValues = await getPickupLocationValues();
    const pickupLabels = await getPickupLocationLabels();
    
    // Get courier services from API
    const courierServices = await getActiveCourierServices();
    
    return {
      ...orderFormConfig,
      courierServices: courierServices.map(service => ({
        value: service.value,
        label: service.label
      })),
      pickupLocations: pickupValues.map((value, index) => ({
        value,
        label: pickupLabels[index] || value
      }))
    };
  } catch (error) {
    console.error('Error loading order form configuration:', error);
    return orderFormConfig;
  }
}

// Helper function to get default values
export function getDefaultOrderFormValues() {
  return orderFormConfig.defaultValues
}

// Helper function to get pickup locations (for backward compatibility)
export function getPickupLocations() {
  return orderFormConfig.pickupLocations
}

// Helper function to get courier services (for backward compatibility)
export function getCourierServices() {
  return orderFormConfig.courierServices
}

// Helper function to get field configuration with proper typing
export function getFieldConfig<T extends keyof OrderFormConfig['fields']>(fieldName: T): OrderFormConfig['fields'][T] {
  return orderFormConfig.fields[fieldName]
}

// Helper function to get validation messages
export function getValidationMessage(type: keyof OrderFormConfig['validation'], key: string) {
  return orderFormConfig.validation[type][key as keyof typeof orderFormConfig.validation[typeof type]]
}
