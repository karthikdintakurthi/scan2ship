import { useState, useEffect } from 'react'
import { getPickupLocations, getDefaultOrderFormValues } from '@/lib/order-form-config'

export function usePickupLocation() {
  const [selectedPickupLocation, setSelectedPickupLocation] = useState<string>('')
  const [pickupLocations, setPickupLocations] = useState<Array<{value: string, label: string}>>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Ensure component is mounted on client side
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Load pickup locations from API and selected location from localStorage
  useEffect(() => {
    if (!isMounted) return

    const loadPickupLocations = async () => {
      try {
        // Get pickup locations from API
        const config = await import('@/lib/order-form-config');
        const dynamicConfig = await config.getOrderFormConfig();
        setPickupLocations(dynamicConfig.pickupLocations);
        
        // Load selected location from localStorage
        const savedLocation = localStorage.getItem('selectedPickupLocation');
        
        if (savedLocation && dynamicConfig.pickupLocations.some(loc => loc.value === savedLocation)) {
          setSelectedPickupLocation(savedLocation);
        } else {
          // Use first available location if saved location is not valid
          const defaultLocation = dynamicConfig.pickupLocations[0]?.value || getDefaultOrderFormValues().pickup_location;
          setSelectedPickupLocation(defaultLocation);
        }
        
        setIsLoaded(true);
      } catch (error) {
        console.error('Error loading pickup locations:', error);
        // Fallback to default values
        setPickupLocations(getPickupLocations());
        const savedLocation = localStorage.getItem('selectedPickupLocation');
        if (savedLocation) {
          setSelectedPickupLocation(savedLocation);
        } else {
          setSelectedPickupLocation(getDefaultOrderFormValues().pickup_location);
        }
        setIsLoaded(true);
      }
    };

    loadPickupLocations();
  }, [isMounted])

  // Update localStorage when pickup location changes
  const updatePickupLocation = (location: string) => {
    if (!isMounted) return
    
    setSelectedPickupLocation(location)
    localStorage.setItem('selectedPickupLocation', location)
  }

  return {
    selectedPickupLocation,
    updatePickupLocation,
    pickupLocations,
    isLoaded: isMounted && isLoaded
  }
}
