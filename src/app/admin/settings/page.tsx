'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authenticatedGet, authenticatedPost } from '@/lib/api-client';

interface Client {
  id: string;
  name: string;
  companyName: string;
  email: string;
  isActive: boolean;
  subscriptionStatus: string;
  _count: {
    users: number;
    orders: number;
  };
}

interface SystemConfig {
  id: string;
  key: string;
  value: string;
  displayValue: string;
  type: string;
  category: string;
  description: string;
  isEncrypted: boolean;
}

interface ConfigCategory {
  [key: string]: SystemConfig[];
}

export default function SystemSettingsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [configByCategory, setConfigByCategory] = useState<ConfigCategory>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editing state
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Check if user is admin or master admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'master_admin') {
      router.push('/');
    }
  }, [currentUser, router]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch clients
        const clientsResponse = await authenticatedGet('/api/admin/clients');
        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json();
          setClients(clientsData.clients);
        }

        // Fetch system config
        const configResponse = await authenticatedGet('/api/admin/system-config');
        if (configResponse.ok) {
          const configData = await configResponse.json();
          setConfigs(configData.configs);
          setConfigByCategory(configData.configByCategory);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Handle authentication errors
        if (error instanceof Error && error.message.includes('Authentication failed')) {
          router.push('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'master_admin')) {
      fetchData();
    }
  }, [currentUser, router]);

  // Update system config
  const updateSystemConfig = async (key: string, value: string) => {
    try {
      const response = await authenticatedPost('/api/admin/system-config', {
        key,
        value
      });

      if (response.ok) {
        // Refresh the configs
        const configResponse = await authenticatedGet('/api/admin/system-config');
        if (configResponse.ok) {
          const configData = await configResponse.json();
          setConfigs(configData.configs);
        }
        setSuccess('Configuration updated successfully!');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update configuration');
      }
    } catch (error) {
      console.error('Error updating config:', error);
      setError('Error updating configuration');
      // Handle authentication errors
      if (error instanceof Error && error.message.includes('Authentication failed')) {
        router.push('/login');
      }
    }
  };

  const handleEditConfig = (config: SystemConfig) => {
    setEditingConfig(config.id);
    setEditValue(config.value);
  };

  const handleSaveConfig = async (configId: string) => {
    try {
      setIsSaving(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('authToken');
      
      const response = await authenticatedPost('/api/admin/system-config', {
        key: configId,
        value: editValue
      });

      if (response.ok) {
        setSuccess('Configuration updated successfully!');
        setEditingConfig(null);
        setEditValue('');
        // Refresh data
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update configuration');
      }
    } catch (error) {
      setError('Error updating configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingConfig(null);
    setEditValue('');
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'courier':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'ai':
        return (
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );

      case 'security':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c-.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
    }
  };

  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {

      courier: 'Courier Service',
      ai: 'AI Services',

      security: 'Security',
      general: 'General Settings'
    };
    return names[category] || category;
  };

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
            <p className="text-gray-600 mt-2">Manage API keys, tokens, and client configurations</p>
          </div>
          <Link
            href="/admin"
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            Back to Admin
          </Link>
        </div>
      </div>

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

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading system settings...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* System Configuration */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">System Configuration</h2>
              
              <div className="space-y-6">
                {Object.entries(configByCategory).map(([category, configs]) => (
                  <div key={category} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-4">
                      {getCategoryIcon(category)}
                      <h3 className="text-lg font-medium text-gray-900 ml-2">
                        {getCategoryName(category)}
                      </h3>
                    </div>
                    
                    <div className="space-y-3">
                      {configs.map((config) => (
                        <div key={config.id} className="border border-gray-100 rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              {config.key}
                            </label>
                            {config.isEncrypted && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Encrypted
                              </span>
                            )}
                          </div>
                          
                          {config.description && (
                            <p className="text-xs text-gray-500 mb-2">{config.description}</p>
                          )}
                          
                          {editingConfig === config.id ? (
                            <div className="space-y-2">
                              <input
                                type={config.type === 'password' ? 'password' : 'text'}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder={`Enter ${config.key.toLowerCase()}`}
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleSaveConfig(config.id)}
                                  disabled={isSaving}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                                >
                                  {isSaving ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={config.displayValue}
                                  readOnly
                                  className="w-full px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-gray-600"
                                />
                              </div>
                              <button
                                onClick={() => handleEditConfig(config)}
                                className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Client Management */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Client Management</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Manage client-specific configurations and settings
                  </p>
                  <Link
                    href="/admin/clients"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View All Clients →
                  </Link>
                </div>

                {clients.length > 0 ? (
                  <div className="space-y-3">
                    {clients.slice(0, 5).map((client) => (
                      <div key={client.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{client.companyName}</h3>
                            <p className="text-sm text-gray-600">{client.email}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                client.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {client.isActive ? 'Active' : 'Inactive'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {client._count.users} users • {client._count.orders} orders
                              </span>
                            </div>
                          </div>
                          <Link
                            href={`/admin/settings/clients/${client.id}`}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                          >
                            Configure
                          </Link>
                        </div>
                      </div>
                    ))}
                    
                    {clients.length > 5 && (
                      <div className="text-center pt-2">
                        <Link
                          href="/admin/clients"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View {clients.length - 5} more clients →
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">No Clients Found</h3>
                    <p className="text-sm text-gray-500 mb-3">No clients have been registered yet.</p>
                    <Link
                      href="/admin/register-client"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Register First Client
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/admin/register-client"
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Register Client</h3>
                    <p className="text-sm text-gray-600">Add new client</p>
                  </div>
                </Link>

                <Link
                  href="/admin/add-user"
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Add User</h3>
                    <p className="text-sm text-gray-600">Add user to client</p>
                  </div>
                </Link>

                <Link
                  href="/admin/clients"
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">View All Clients</h3>
                    <p className="text-sm text-gray-600">Manage clients</p>
                  </div>
                </Link>

                <Link
                  href="/admin/analytics"
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Analytics</h3>
                    <p className="text-sm text-gray-600">View reports</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
