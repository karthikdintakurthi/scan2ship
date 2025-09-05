'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authenticatedGet } from '@/lib/api-client';

interface Client {
  id: string;
  name: string;
  companyName: string;
  email: string;
  isActive: boolean;
}

interface PickupLocation {
  id: string;
  value: string;
  label: string;
  clientId: string;
}

export default function AddUserPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [pickupLocationsLoading, setPickupLocationsLoading] = useState(false);
  const [selectedPickupLocations, setSelectedPickupLocations] = useState<string[]>([]);

  // User registration form state
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    clientId: '',
    role: 'user'
  });

  // Fetch clients for dropdown
  const fetchClients = async () => {
    try {
      setClientsLoading(true);
      const response = await authenticatedGet('/api/admin/clients');
      
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      } else {
        setError('Failed to fetch clients');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      setError('Error fetching clients');
    } finally {
      setClientsLoading(false);
    }
  };

  // Fetch pickup locations for selected client
  const fetchPickupLocations = async (clientId: string) => {
    if (!clientId) {
      setPickupLocations([]);
      return;
    }

    try {
      setPickupLocationsLoading(true);
      
      // For client admin, use the regular pickup locations API (automatically filters by their client)
      // For master admin, use the admin clients API
      const endpoint = currentUser?.role === 'admin' 
        ? '/api/pickup-locations' 
        : `/api/admin/clients/${clientId}/pickup-locations`;
      
      const response = await authenticatedGet(endpoint);
      
      if (response.ok) {
        const data = await response.json();
        setPickupLocations(data.pickupLocations || []);
      } else {
        setError('Failed to fetch pickup locations');
        setPickupLocations([]);
      }
    } catch (error) {
      console.error('Error fetching pickup locations:', error);
      setError('Error fetching pickup locations');
      setPickupLocations([]);
    } finally {
      setPickupLocationsLoading(false);
    }
  };

  // Check if user is admin or master admin and fetch clients
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'master_admin') {
      router.push('/');
    } else if (currentUser && currentUser.role === 'master_admin') {
      fetchClients();
    } else if (currentUser && currentUser.role === 'admin') {
      // For client admin, set their client automatically
      setUserData(prev => ({ ...prev, clientId: currentUser.clientId }));
    }
  }, [currentUser, router]);

  // Fetch pickup locations when role is child_user
  useEffect(() => {
    if (userData.role === 'child_user') {
      // For client admin, use their own clientId, for master admin use selected clientId
      const clientId = currentUser?.role === 'admin' ? currentUser.clientId : userData.clientId;
      if (clientId) {
        fetchPickupLocations(clientId);
      }
    } else {
      setPickupLocations([]);
      setSelectedPickupLocations([]);
    }
  }, [userData.clientId, userData.role, currentUser]);

  // Show loading if checking authentication
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not admin or master admin
  if (currentUser.role !== 'admin' && currentUser.role !== 'master_admin') {
    return null;
  }

  const handleUserRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (userData.password !== userData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (userData.role === 'child_user' && selectedPickupLocations.length === 0) {
      setError('Please select at least one pickup location for child users');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          name: userData.name,
          email: userData.email,
          password: userData.password,
          clientId: userData.clientId,
          role: userData.role,
          pickupLocationIds: userData.role === 'child_user' ? selectedPickupLocations : [],
          aiImageProcessingEnabled: userData.aiImageProcessingEnabled,
          aiTextProcessingEnabled: userData.aiTextProcessingEnabled
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('User registered successfully!');
            setUserData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      clientId: '',
      role: 'user'
    });
        setSelectedPickupLocations([]);
      } else {
        setError(data.error || 'Failed to register user');
      }
    } catch (error) {
      console.error('Error registering user:', error);
      setError('Network error occurred');
    }

    setIsLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              {currentUser.role === 'master_admin' ? 'Add New User' : 'Manage Users'}
            </h1>
            <p className="text-gray-600 mt-2">
              {currentUser.role === 'master_admin' 
                ? 'Create a new user account for an existing client'
                : 'Add new users to your client organization and manage existing users'
              }
            </p>
          </div>
          <div className="ml-6 flex-shrink-0">
            <Link
              href="/admin"
              className="inline-flex items-center bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors whitespace-nowrap"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleUserRegistration} className="space-y-6">
          {/* User Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Information</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={userData.name}
                  onChange={(e) => setUserData({...userData, name: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  value={userData.email}
                  onChange={(e) => setUserData({...userData, email: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email"
                />
              </div>
            </div>
          </div>

          {/* Client Assignment */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Assignment</h3>
            <div className="space-y-6">
              {currentUser.role === 'master_admin' ? (
                <div>
                  <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Client *
                  </label>
                  <select
                    id="clientId"
                    value={userData.clientId}
                    onChange={(e) => setUserData({...userData, clientId: e.target.value})}
                    required
                    disabled={clientsLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {clientsLoading ? 'Loading clients...' : 'Select a client'}
                    </option>
                    {clients
                      .filter(client => client.isActive)
                      .map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.companyName} ({client.name})
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select the client to assign this user to
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                    {currentUser.clientName || currentUser.clientId}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Users will be added to your client organization
                  </p>
                </div>
              )}
              
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  id="role"
                  value={userData.role}
                  onChange={(e) => setUserData({...userData, role: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="user">User</option>
                  {currentUser?.role === 'master_admin' && (
                    <>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </>
                  )}
                  <option value="child_user">Child User</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select the user's role within the client organization
                </p>
              </div>


              {/* Pickup Location Assignment - Only for Child Users */}
              {userData.role === 'child_user' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign Pickup Locations *
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3 bg-gray-50">
                    {pickupLocationsLoading ? (
                      <p className="text-sm text-gray-500">Loading pickup locations...</p>
                    ) : pickupLocations.length === 0 ? (
                      <p className="text-sm text-gray-500">No pickup locations found for this client</p>
                    ) : (
                      <div className="space-y-2">
                        {pickupLocations.map((location) => (
                          <label key={location.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedPickupLocations.includes(location.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPickupLocations([...selectedPickupLocations, location.id]);
                                } else {
                                  setSelectedPickupLocations(
                                    selectedPickupLocations.filter(id => id !== location.id)
                                  );
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{location.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Select one or more pickup locations that this child user will have access to
                  </p>
                  {userData.role === 'child_user' && selectedPickupLocations.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      Please select at least one pickup location for child users
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Password */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Password</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  id="password"
                  value={userData.password}
                  onChange={(e) => setUserData({...userData, password: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Create password"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={userData.confirmPassword}
                  onChange={(e) => setUserData({...userData, confirmPassword: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm password"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Link
              href="/admin"
              className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Adding User...' : 'Add User'}
            </button>
          </div>
        </form>

        {/* Existing Users Section - Only for Client Admin */}
        {currentUser.role === 'admin' && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Existing Users</h2>
            <ExistingUsersList />
          </div>
        )}
      </div>
    </div>
  );
}

// Component to show existing users for client admin
function ExistingUsersList() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'user',
    isActive: true
  });
  const [saving, setSaving] = useState(false);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await authenticatedGet('/api/admin/users');
        
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        } else {
          setError('Failed to fetch users');
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Error fetching users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const startEdit = (user: any) => {
    // Don't allow editing self
    if (user.id === currentUser?.id) {
      return;
    }
    
    setEditingUser(user.id);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm({
      name: '',
      email: '',
      role: 'user',
      isActive: true
    });
  };

  const saveEdit = async () => {
    if (!editingUser) return;

    try {
      setSaving(true);
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          userId: editingUser,
          ...editForm
        })
      });

      if (response.ok) {
        // Refresh the users list
        const fetchResponse = await authenticatedGet('/api/admin/users');
        if (fetchResponse.ok) {
          const data = await fetchResponse.json();
          setUsers(data.users || []);
        }
        setEditingUser(null);
        setEditForm({
          name: '',
          email: '',
          role: 'user',
          isActive: true
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setError('Error updating user');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (userId: string) => {
    setDeletingUser(userId);
    setShowDeleteConfirm(true);
  };

  const cancelDelete = () => {
    setDeletingUser(null);
    setShowDeleteConfirm(false);
  };

  const deleteUser = async () => {
    if (!deletingUser) return;

    try {
      setSaving(true);
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          userId: deletingUser
        })
      });

      if (response.ok) {
        // Refresh the users list
        const fetchResponse = await authenticatedGet('/api/admin/users');
        if (fetchResponse.ok) {
          const data = await fetchResponse.json();
          setUsers(data.users || []);
        }
        setDeletingUser(null);
        setShowDeleteConfirm(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Error deleting user');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading users...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No users found for your client organization.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      <ul className="divide-y divide-gray-200">
        {users.map((user) => (
          <li key={user.id} className="px-4 py-4 sm:px-6">
            {editingUser === user.id ? (
              // Edit mode
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="user">User</option>
                      <option value="child_user">Child User</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={editForm.isActive ? 'active' : 'inactive'}
                      onChange={(e) => setEditForm({...editForm, isActive: e.target.value === 'active'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              // View mode
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.name}
                        {user.id === currentUser?.id && (
                          <span className="ml-2 text-xs text-gray-500">(You)</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {user.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'user' ? 'bg-blue-100 text-blue-800' :
                        user.role === 'child_user' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role.replace('_', ' ')}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {user.isActive ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Created: {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                    {user.id !== currentUser?.id && user.role !== 'admin' && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => startEdit(user)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => confirmDelete(user.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                    {user.id !== currentUser?.id && user.role === 'admin' && (
                      <button
                        onClick={() => startEdit(user)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              {/* Icon and Title */}
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete User</h3>
              
              {/* User Info */}
              {deletingUser && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600 text-center">
                    Deleting: <span className="font-medium text-gray-900">
                      {users.find(u => u.id === deletingUser)?.name} ({users.find(u => u.id === deletingUser)?.email})
                    </span>
                  </p>
                </div>
              )}
              
              <p className="text-sm text-gray-600 text-center mb-6">
                Are you sure you want to delete this user? This action cannot be undone.
              </p>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteUser}
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </span>
                  ) : (
                    'Delete User'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
