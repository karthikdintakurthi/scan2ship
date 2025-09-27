'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface Client {
  id: string;
  name: string;
  companyName: string;
  email: string;
}

interface SubGroup {
  id: string;
  name: string;
  description?: string;
  clientId: string;
}

interface PickupLocation {
  id: string;
  label: string;
  value: string;
}

export default function CreateUserPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [subGroups, setSubGroups] = useState<SubGroup[]>([]);
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [filteredSubGroups, setFilteredSubGroups] = useState<SubGroup[]>([]);
  
  const [formData, setFormData] = useState({
    clientId: '',
    email: '',
    name: '',
    password: '',
    role: 'child_user',
    subGroupIds: [] as string[],
    pickupLocationIds: [] as string[]
  });

  // Check if user is client admin or higher
  useEffect(() => {
    if (currentUser && !['client_admin', 'super_admin', 'master_admin'].includes(currentUser.role)) {
      router.push('/');
    }
  }, [currentUser, router]);

  // Fetch clients only initially
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const clientsResponse = await fetch('/api/admin/clients', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });

        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json();
          setClients(clientsData.data || []);
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
        setError('Failed to load clients data');
      }
    };

    if (currentUser && ['client_admin', 'super_admin', 'master_admin'].includes(currentUser.role)) {
      fetchClients();
    }
  }, [currentUser]);

  // Fetch client-specific sub-groups and pickup locations when client is selected
  useEffect(() => {
    const fetchClientData = async () => {
      if (!formData.clientId) {
        setFilteredSubGroups([]);
        setPickupLocations([]);
        return;
      }

      try {
        const [subGroupsResponse, pickupLocationsResponse] = await Promise.all([
          fetch(`/api/sub-groups?clientId=${formData.clientId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          }),
          fetch(`/api/pickup-locations?clientId=${formData.clientId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          })
        ]);

        if (subGroupsResponse.ok) {
          const subGroupsData = await subGroupsResponse.json();
          setFilteredSubGroups(subGroupsData.data || []);
        }

        if (pickupLocationsResponse.ok) {
          const pickupLocationsData = await pickupLocationsResponse.json();
          setPickupLocations(pickupLocationsData.data || []);
        }

        // Clear selected assignments when client changes
        setFormData(prev => ({ 
          ...prev, 
          subGroupIds: [], 
          pickupLocationIds: [] 
        }));
      } catch (error) {
        console.error('Error fetching client data:', error);
        setError('Failed to load client-specific data');
      }
    };

    fetchClientData();
  }, [formData.clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      router.push('/admin/users');
    } catch (error) {
      console.error('Error creating user:', error);
      setError(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleSubGroupChange = (subGroupId: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        subGroupIds: [...formData.subGroupIds, subGroupId]
      });
    } else {
      setFormData({
        ...formData,
        subGroupIds: formData.subGroupIds.filter(id => id !== subGroupId)
      });
    }
  };

  const handlePickupLocationChange = (pickupLocationId: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        pickupLocationIds: [...formData.pickupLocationIds, pickupLocationId]
      });
    } else {
      setFormData({
        ...formData,
        pickupLocationIds: formData.pickupLocationIds.filter(id => id !== pickupLocationId)
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New User</h1>
        <p className="text-gray-600 mt-2">
          Add a new user to your organization with appropriate permissions and assignments
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 gap-6">
          {/* Client Selection */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Client Selection</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">
                  Select Client *
                </label>
                <select
                  id="clientId"
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                >
                  <option value="">Choose a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.companyName} ({client.name})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Select the client organization for this user
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
            </div>
          </div>

          {/* Role and Password */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Role & Access</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role *
                </label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                >
                  <option value="child_user">Child User</option>
                  <option value="user">User</option>
                  <option value="client_admin">Client Admin</option>
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  {formData.role === 'child_user' && 'Limited access to own data only'}
                  {formData.role === 'user' && 'Full access to all client data'}
                  {formData.role === 'client_admin' && 'Can manage users and sub-groups'}
                </p>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Leave empty for user to set later"
                />
                <p className="mt-1 text-sm text-gray-500">
                  If left empty, user will need to set password on first login
                </p>
              </div>
            </div>
          </div>

          {/* Sub-Groups Assignment */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Sub-Groups Assignment</h3>
            <div className="space-y-2">
              {!formData.clientId ? (
                <p className="text-sm text-gray-500">Please select a client first to see available sub-groups.</p>
              ) : filteredSubGroups.length === 0 ? (
                <p className="text-sm text-gray-500">No sub-groups available for the selected client. Create sub-groups first.</p>
              ) : (
                filteredSubGroups.map((subGroup) => (
                  <label key={subGroup.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.subGroupIds.includes(subGroup.id)}
                      onChange={(e) => handleSubGroupChange(subGroup.id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {subGroup.name}
                      {subGroup.description && (
                        <span className="text-gray-500"> - {subGroup.description}</span>
                      )}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Pickup Locations Assignment */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Pickup Locations Assignment</h3>
            <div className="space-y-2">
              {!formData.clientId ? (
                <p className="text-sm text-gray-500">Please select a client first to see available pickup locations.</p>
              ) : pickupLocations.length === 0 ? (
                <p className="text-sm text-gray-500">No pickup locations available for the selected client.</p>
              ) : (
                pickupLocations.map((location) => (
                  <label key={location.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.pickupLocationIds.includes(location.id)}
                      onChange={(e) => handlePickupLocationChange(location.id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{location.label}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.push('/admin/users')}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
}
