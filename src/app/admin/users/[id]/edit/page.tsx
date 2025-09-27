'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  clientId: string;
  clients?: {
    id: string;
    name: string;
    companyName: string;
  };
  userSubGroups: Array<{
    subGroups: {
      id: string;
      name: string;
    };
  }>;
  userPickupLocations: Array<{
    pickup_locations: {
      id: string;
      label: string;
    };
  }>;
}

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
  clientId: string;
}

export default function EditUserPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [subGroups, setSubGroups] = useState<SubGroup[]>([]);
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [filteredSubGroups, setFilteredSubGroups] = useState<SubGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    clientId: '',
    email: '',
    name: '',
    password: '',
    role: 'child_user',
    isActive: true,
    subGroupIds: [] as string[],
    pickupLocationIds: [] as string[]
  });

  // Check if user is client admin or higher
  useEffect(() => {
    if (currentUser && !['client_admin', 'super_admin', 'master_admin'].includes(currentUser.role)) {
      router.push('/');
    }
  }, [currentUser, router]);

  // Fetch user data and form data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userResponse, clientsResponse] = await Promise.all([
          fetch(`/api/users/${userId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          }),
          fetch('/api/admin/clients', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          })
        ]);

        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData.data);
          
          // Set form data from user
          setFormData({
            clientId: userData.data.clientId || '',
            email: userData.data.email || '',
            name: userData.data.name || '',
            password: '', // Don't pre-fill password
            role: userData.data.role || 'child_user',
            isActive: userData.data.isActive !== undefined ? userData.data.isActive : true,
            subGroupIds: userData.data.userSubGroups?.map((usg: any) => usg.subGroups.id) || [],
            pickupLocationIds: userData.data.userPickupLocations?.map((upl: any) => upl.pickup_locations.id) || []
          });
        }

        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json();
          setClients(clientsData.data || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser && ['client_admin', 'super_admin', 'master_admin'].includes(currentUser.role)) {
      fetchData();
    }
  }, [currentUser, userId]);

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
          setSubGroups(subGroupsData.data || []);
          setFilteredSubGroups(subGroupsData.data || []);
        }

        if (pickupLocationsResponse.ok) {
          const pickupLocationsData = await pickupLocationsResponse.json();
          setPickupLocations(pickupLocationsData.data || []);
        }
      } catch (error) {
        console.error('Error fetching client data:', error);
        setError('Failed to load client-specific data');
      }
    };

    fetchClientData();
  }, [formData.clientId]);

  const handleSubGroupChange = (subGroupId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      subGroupIds: checked
        ? [...prev.subGroupIds, subGroupId]
        : prev.subGroupIds.filter(id => id !== subGroupId)
    }));
  };

  const handlePickupLocationChange = (locationId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      pickupLocationIds: checked
        ? [...prev.pickupLocationIds, locationId]
        : prev.pickupLocationIds.filter(id => id !== locationId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          ...formData,
          password: formData.password || undefined // Don't send empty password
        })
      });

      if (response.ok) {
        router.push('/admin/users');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setError('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <Link
                  href="/admin/users"
                  className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                >
                  ← Back to Users
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit User</h1>
            <p className="text-gray-600 mt-2">
              Update user information and permissions
            </p>
          </div>
          <Link
            href="/admin/users"
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
          >
            ← Back to Users
          </Link>
        </div>
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
            <div className="grid grid-cols-1 gap-4">
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

          {/* Role & Access */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Role & Access</h3>
            <div className="grid grid-cols-1 gap-4">
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
                  <option value="child_user">Child User - Limited access to own data only</option>
                  <option value="user">User - Standard access</option>
                  <option value="client_admin">Client Admin - Full access to client data</option>
                  <option value="super_admin">Super Admin - System-wide access</option>
                  <option value="master_admin">Master Admin - Full system access</option>
                </select>
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
                  placeholder="Leave empty to keep current password"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Leave empty to keep the current password
                </p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                  User is active
                </label>
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
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? 'Updating...' : 'Update User'}
          </button>
        </div>
      </form>
    </div>
  );
}
