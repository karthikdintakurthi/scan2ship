import { CourierService, courierServiceConfigs } from './courier-service-config'

// Admin interface for managing courier services
export interface CourierServiceAdmin {
  // Enable/disable courier services
  toggleCourierService(value: string, isActive: boolean): void
  
  // Add new courier service
  addCourierService(service: Omit<CourierService, 'value'> & { value?: string }): void
  
  // Update existing courier service
  updateCourierService(value: string, updates: Partial<CourierService>): void
  
  // Remove courier service
  removeCourierService(value: string): void
  
  // Get all configurations (including inactive ones)
  getAllConfigurations(): CourierService[]
  
  // Export configuration to JSON
  exportConfiguration(): string
  
  // Import configuration from JSON
  importConfiguration(jsonConfig: string): void
  
  // Reset to default configuration
  resetToDefaults(): void
}

// In-memory storage for runtime modifications
let runtimeConfigs: CourierService[] = [...courierServiceConfigs]

export const courierServiceAdmin: CourierServiceAdmin = {
  toggleCourierService(value: string, isActive: boolean): void {
    const service = runtimeConfigs.find(s => s.value === value)
    if (service) {
      service.isActive = isActive
      console.log(`Courier service ${value} ${isActive ? 'enabled' : 'disabled'}`)
    }
  },

  addCourierService(service: Omit<CourierService, 'value'> & { value?: string }): void {
    const newService: CourierService = {
      value: service.value || `custom_${Date.now()}`,
      label: service.label,
      description: service.description,
      isActive: service.isActive ?? true,
      supportsCod: service.supportsCod ?? false,
      supportsTracking: service.supportsTracking ?? true,
      apiIntegration: service.apiIntegration ?? 'manual',
      defaultWeight: service.defaultWeight ?? 100,
      defaultPackageValue: service.defaultPackageValue ?? 1000,
      serviceAreas: service.serviceAreas ?? ['all'],
      restrictions: service.restrictions
    }
    
    runtimeConfigs.push(newService)
    console.log(`Added new courier service: ${newService.value}`)
  },

  updateCourierService(value: string, updates: Partial<CourierService>): void {
    const service = runtimeConfigs.find(s => s.value === value)
    if (service) {
      Object.assign(service, updates)
      console.log(`Updated courier service: ${value}`)
    }
  },

  removeCourierService(value: string): void {
    const index = runtimeConfigs.findIndex(s => s.value === value)
    if (index !== -1) {
      runtimeConfigs.splice(index, 1)
      console.log(`Removed courier service: ${value}`)
    }
  },

  getAllConfigurations(): CourierService[] {
    return [...runtimeConfigs]
  },

  exportConfiguration(): string {
    return JSON.stringify(runtimeConfigs, null, 2)
  },

  importConfiguration(jsonConfig: string): void {
    try {
      const configs = JSON.parse(jsonConfig) as CourierService[]
      runtimeConfigs = [...configs]
      console.log('Courier service configuration imported successfully')
    } catch (error) {
      console.error('Failed to import courier service configuration:', error)
      throw new Error('Invalid configuration format')
    }
  },

  resetToDefaults(): void {
    runtimeConfigs = [...courierServiceConfigs]
    console.log('Reset to default courier service configuration')
  }
}

// Export the runtime configurations for use in other parts of the application
export function getRuntimeCourierServices(): CourierService[] {
  return runtimeConfigs
}

export function getActiveRuntimeCourierServices(): CourierService[] {
  return runtimeConfigs.filter(service => service.isActive)
}

// Example usage functions for common modifications
export const courierServiceModifications = {
  // Enable all courier services
  enableAll(): void {
    runtimeConfigs.forEach(service => service.isActive = true)
  },

  // Disable all courier services except Delhivery
  enableOnlyDelhivery(): void {
    runtimeConfigs.forEach(service => {
      service.isActive = service.value === 'Delhivery'
    })
  },

  // Add a custom courier service
  addCustomService(
    label: string,
    description: string,
    supportsCod: boolean = true,
    supportsTracking: boolean = true
  ): void {
    courierServiceAdmin.addCourierService({
      label,
      description,
      supportsCod,
      supportsTracking,
      isActive: true,
      apiIntegration: 'manual',
      defaultWeight: 100,
      defaultPackageValue: 1000,
      serviceAreas: ['all'],
      restrictions: {
        maxWeight: 20000,
        maxPackageValue: 50000,
        minPackageValue: 100,
        restrictedItems: ['hazardous', 'liquids']
      }
    })
  },

  // Update restrictions for a specific service
  updateServiceRestrictions(
    serviceValue: string,
    restrictions: CourierService['restrictions']
  ): void {
    courierServiceAdmin.updateCourierService(serviceValue, { restrictions })
  }
}

// Export default for easy importing
export default courierServiceAdmin
