import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PickupLocation {
  id: string;
  value: string;
  label: string;
  delhiveryApiKey?: string;
  clientId: string;
}

export function usePickupLocations() {
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, isAuthenticated } = useAuth();

  const fetchPickupLocations = async () => {
    if (!isAuthenticated || !currentUser) {
      setPickupLocations([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/pickup-locations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch pickup locations: ${response.statusText}`);
      }

      const data = await response.json();
      setPickupLocations(data.data || []);
    } catch (err) {
      console.error('Error fetching pickup locations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pickup locations');
      setPickupLocations([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPickupLocations();
  }, [currentUser, isAuthenticated]);

  return {
    pickupLocations,
    isLoading,
    error,
    refetch: fetchPickupLocations
  };
}
