'use client';

import { useState, useEffect } from 'react';
import { authenticatedGet } from '@/lib/api-client';

interface PickupLocation {
  id: string;
  value: string;
  label: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  clients: {
    id: string;
    companyName: string;
  };
  user_pickup_locations?: Array<{
    pickup_locations: PickupLocation;
  }>;
}

interface EditUserModalProps {
  user: User;
  onClose: () => void;
  onSave: (userData: any) => void;
}

export default function EditUserModal({ user, onClose, onSave }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    password: '',
    pickupLocationIds: [] as string[]
  });
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Load pickup locations when role is child_user
  useEffect(() => {
    if (formData.role === 'child_user') {
      fetchPickupLocations();
    }
  }, [formData.role, user.clients.id]);

  // Set initial pickup location selections
  useEffect(() => {
    if (user.user_pickup_locations) {
      const selectedIds = user.user_pickup_locations.map(upl => upl.pickup_locations.id);
      setFormData(prev => ({ ...prev, pickupLocationIds: selectedIds }));
    }
  }, [user.user_pickup_locations]);

  const fetchPickupLocations = async () => {
    try {
      const response = await authenticatedGet(`/api/admin/clients/${user.clients.id}/pickup-locations`);
      if (response.ok) {
        const data = await response.json();
        setPickupLocations(data.pickupLocations);
      }
    } catch (error) {
      console.error('Error fetching pickup locations:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handlePickupLocationChange = (pickupLocationId: string) => {
    setFormData(prev => ({
      ...prev,
      pickupLocationIds: prev.pickupLocationIds.includes(pickupLocationId)
        ? prev.pickupLocationIds.filter(id => id !== pickupLocationId)
        : [...prev.pickupLocationIds, pickupLocationId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validate form
      if (!formData.name || !formData.email || !formData.role) {
        setError('Name, email, and role are required');
        return;
      }

      if (formData.role === 'child_user' && formData.pickupLocationIds.length === 0) {
        setError('At least one pickup location must be selected for child users');
        return;
      }

      // Prepare data for API
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        isActive: formData.isActive
      };

      // Only include password if provided
      if (formData.password) {
        updateData.password = formData.password;
      }

      // Include pickup location IDs for child users
      if (formData.role === 'child_user') {
        updateData.pickupLocationIds = formData.pickupLocationIds;
      }

      onSave(updateData);
    } catch (error) {
      setError('Failed to update user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Edit User</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role *
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="child_user">Child User</option>
                </select>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  New Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Active
              </label>
            </div>

            {/* Pickup Locations for Child Users */}
            {formData.role === 'child_user' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Locations * (Select at least one)
                </label>
                <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
                  {pickupLocations.length === 0 ? (
                    <p className="text-gray-500 text-sm">No pickup locations available</p>
                  ) : (
                    pickupLocations.map((location) => (
                      <div key={location.id} className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id={`pickup-${location.id}`}
                          checked={formData.pickupLocationIds.includes(location.id)}
                          onChange={() => handlePickupLocationChange(location.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`pickup-${location.id}`} className="ml-2 block text-sm text-gray-900">
                          {location.label}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
