'use client';

import { useState, useEffect } from 'react';

interface ClientCreditCost {
  id: string;
  clientId: string;
  feature: 'ORDER' | 'IMAGE_PROCESSING' | 'TEXT_PROCESSING';
  cost: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ClientCreditCostsManagerProps {
  clientId: string;
  clientName: string;
}

export function ClientCreditCostsManager({ clientId, clientName }: ClientCreditCostsManagerProps) {
  const [costs, setCosts] = useState<ClientCreditCost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCosts, setEditingCosts] = useState<ClientCreditCost[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Helper function to get auth token
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  };

  // Helper function to make authenticated API calls
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      };

      const response = await fetch(url, { ...options, headers });
      return response;
    } catch (error) {
      console.error('Authenticated fetch error:', error);
      throw error;
    }
  };

  const fetchCreditCosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authenticatedFetch(`/api/admin/credits/${clientId}/costs`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setCosts(data.data);
          setEditingCosts(data.data);
        } else {
          setError(data.error || 'Failed to fetch credit costs');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || `Failed to fetch credit costs (${response.status})`);
      }
    } catch (error) {
      console.error('Error fetching credit costs:', error);
      setError('Failed to fetch credit costs - network error');
    } finally {
      setLoading(false);
    }
  };

  const updateCreditCosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch(`/api/admin/credits/${clientId}/costs`, {
        method: 'POST',
        body: JSON.stringify({ costs: editingCosts })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCosts(data.data);
          setIsEditing(false);
          setError(null);
        } else {
          setError(data.error || 'Failed to update credit costs');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || `Failed to update credit costs (${response.status})`);
      }
    } catch (error) {
      console.error('Error updating credit costs:', error);
      setError('Failed to update credit costs - network error');
    } finally {
      setLoading(false);
    }
  };

  const handleCostChange = (feature: string, newCost: number) => {
    if (newCost < 0.5) {
      setError('Credit cost must be at least 0.5 credits');
      return;
    }

    setEditingCosts(prev => 
      prev.map(cost => 
        cost.feature === feature 
          ? { ...cost, cost: newCost }
          : cost
      )
    );
    setError(null);
  };

  const handleCancel = () => {
    setEditingCosts(costs);
    setIsEditing(false);
    setError(null);
  };

  const getFeatureDisplayName = (feature: string) => {
    const displayNames = {
      ORDER: 'Order Creation',
      IMAGE_PROCESSING: 'Image Processing',
      TEXT_PROCESSING: 'Text Processing'
    };
    return displayNames[feature as keyof typeof displayNames] || feature;
  };

  useEffect(() => {
    if (clientId) {
      fetchCreditCosts();
    }
  }, [clientId]);

  if (loading && costs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Credit Costs Configuration</h2>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading credit costs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Credit Costs Configuration</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Edit Costs
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={updateCreditCosts}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Configure credit costs for <span className="font-medium">{clientName}</span>. 
          Costs can range from 0.5 to any positive number.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {editingCosts.map((cost) => (
          <div key={cost.feature} className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              {getFeatureDisplayName(cost.feature)}
            </h3>
            {isEditing ? (
              <div>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={cost.cost}
                  onChange={(e) => handleCostChange(cost.feature, parseFloat(e.target.value) || 0.5)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Min: 0.5 credits</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{cost.cost}</p>
                <p className="text-sm text-gray-500">credits</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {!isEditing && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-blue-800 text-sm">
            <strong>Note:</strong> These costs will be automatically applied when clients use the respective features. 
            Changes take effect immediately.
          </p>
        </div>
      )}
    </div>
  );
}
