'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface SubGroup {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  clientId: string;
  clients: {
    id: string;
    name: string;
    companyName: string;
  };
  userSubGroups: Array<{
    users: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  }>;
  _count: {
    userSubGroups: number;
  };
}

interface Client {
  id: string;
  name: string;
  companyName: string;
}

export default function SubGroupsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [subGroups, setSubGroups] = useState<SubGroup[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [newSubGroup, setNewSubGroup] = useState({
    name: '',
    description: '',
    clientId: ''
  });

  // Check if user is client admin or higher
  useEffect(() => {
    if (currentUser && !['client_admin', 'super_admin', 'master_admin'].includes(currentUser.role)) {
      router.push('/');
    }
  }, [currentUser, router]);

  // Fetch clients (for master admin)
  useEffect(() => {
    const fetchClients = async () => {
      if (currentUser?.role === 'master_admin') {
        try {
          const response = await fetch('/api/admin/clients', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            setClients(data.data || []);
          }
        } catch (error) {
          console.error('Error fetching clients:', error);
        }
      }
    };

    fetchClients();
  }, [currentUser]);

  // Fetch sub-groups
  useEffect(() => {
    const fetchSubGroups = async () => {
      try {
        const response = await fetch('/api/sub-groups', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch sub-groups');
        }

        const data = await response.json();
        setSubGroups(data.data);
      } catch (error) {
        console.error('Error fetching sub-groups:', error);
        setError('Failed to load sub-groups');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser && ['client_admin', 'super_admin', 'master_admin'].includes(currentUser.role)) {
      fetchSubGroups();
    }
  }, [currentUser]);

  const handleCreateSubGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For master admin, use selected client ID; for others, use current user's client
    const clientId = currentUser?.role === 'master_admin' ? selectedClientId : currentUser?.clientId;
    
    if (!clientId) {
      setError('Please select a client');
      return;
    }
    
    try {
      const response = await fetch('/api/sub-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          ...newSubGroup,
          clientId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create sub-group');
      }

      const data = await response.json();
      setSubGroups([data.data, ...subGroups]);
      setNewSubGroup({ name: '', description: '', clientId: '' });
      setSelectedClientId('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating sub-group:', error);
      setError(error instanceof Error ? error.message : 'Failed to create sub-group');
    }
  };

  const handleDeleteSubGroup = async (subGroupId: string) => {
    if (!confirm('Are you sure you want to delete this sub-group? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/sub-groups/${subGroupId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete sub-group');
      }

      setSubGroups(subGroups.filter(sg => sg.id !== subGroupId));
    } catch (error) {
      console.error('Error deleting sub-group:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete sub-group');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sub-groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sub-Groups Management</h1>
            <p className="text-gray-600 mt-2">
              Create and manage sub-groups for organizing users within your organization
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Sub-Group
          </button>
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

      {showCreateForm && (
        <div className="mb-8 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Sub-Group</h3>
          <form onSubmit={handleCreateSubGroup}>
            <div className="grid grid-cols-1 gap-4">
              {currentUser?.role === 'master_admin' && (
                <div>
                  <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">
                    Client *
                  </label>
                  <select
                    id="clientId"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  >
                    <option value="">Select a client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.companyName} ({client.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={newSubGroup.name}
                  onChange={(e) => setNewSubGroup({ ...newSubGroup, name: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  value={newSubGroup.description}
                  onChange={(e) => setNewSubGroup({ ...newSubGroup, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setSelectedClientId('');
                  setNewSubGroup({ name: '', description: '', clientId: '' });
                }}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700"
              >
                Create Sub-Group
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Sub-Groups ({subGroups.length})
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            All sub-groups in your organization
          </p>
        </div>
        <ul className="divide-y divide-gray-200">
          {subGroups.map((subGroup) => (
            <li key={subGroup.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h4 className="text-lg font-medium text-gray-900">{subGroup.name}</h4>
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        subGroup.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {subGroup.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {subGroup.description && (
                      <p className="mt-1 text-sm text-gray-500">{subGroup.description}</p>
                    )}
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      <span>{subGroup._count?.userSubGroups || 0} user(s) assigned</span>
                      {subGroup.clients && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {subGroup.clients.companyName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDeleteSubGroup(subGroup.id)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {subGroup.userSubGroups && subGroup.userSubGroups.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Assigned Users:</h5>
                    <div className="flex flex-wrap gap-2">
                      {subGroup.userSubGroups?.map((usg) => (
                        <span
                          key={usg.users.id}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {usg.users.name} ({usg.users.email})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
