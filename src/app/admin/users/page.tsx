'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  parentUserId?: string;
  clientId?: string;
  parentUser?: {
    id: string;
    name: string;
    email: string;
  };
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
  _count: {
    childUsers: number;
  };
}

export default function UserManagementPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check if user is client admin or higher
  useEffect(() => {
    if (currentUser && !['client_admin', 'super_admin', 'master_admin'].includes(currentUser.role)) {
      router.push('/');
    }
  }, [currentUser, router]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        setUsers(data.data);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser && ['client_admin', 'super_admin', 'master_admin'].includes(currentUser.role)) {
      fetchUsers();
    }
  }, [currentUser]);

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      'child_user': { color: 'bg-blue-100 text-blue-800', label: 'Child User' },
      'user': { color: 'bg-green-100 text-green-800', label: 'User' },
      'client_admin': { color: 'bg-purple-100 text-purple-800', label: 'Client Admin' },
      'super_admin': { color: 'bg-orange-100 text-orange-800', label: 'Super Admin' },
      'master_admin': { color: 'bg-red-100 text-red-800', label: 'Master Admin' }
    };

    const config = roleConfig[role as keyof typeof roleConfig] || { color: 'bg-gray-100 text-gray-800', label: role };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-2">
              Manage users, sub-groups, and permissions for your organization
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/admin/users/create"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Create User
            </Link>
            <Link
              href="/admin/sub-groups"
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Manage Sub-Groups
            </Link>
          </div>
        </div>
      </div>

      {/* Group users by client */}
      {(() => {
        // Group users by client
        const usersByClient = users.reduce((acc, user) => {
          const clientKey = user.clients?.companyName || 'Unknown Client';
          if (!acc[clientKey]) {
            acc[clientKey] = {
              client: user.clients,
              users: []
            };
          }
          acc[clientKey].users.push(user);
          return acc;
        }, {} as Record<string, { client?: User['clients']; users: User[] }>);

        return Object.entries(usersByClient).map(([clientName, { client, users: clientUsers }]) => (
          <div key={clientName} className="bg-white shadow overflow-hidden sm:rounded-md mb-6">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {clientName}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                {client?.name && `${client.name} • `}Users ({clientUsers.length})
              </p>
            </div>
            <ul className="divide-y divide-gray-200">
              {clientUsers.map((user) => (
                <li key={user.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                            <div className="ml-2 flex space-x-2">
                              {getRoleBadge(user.role)}
                              {getStatusBadge(user.isActive)}
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          {user.parentUser && (
                            <p className="text-xs text-gray-400">
                              Created by: {user.parentUser.name} ({user.parentUser.email})
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-gray-500">
                          <p>Sub-groups: {user.userSubGroups?.length || 0}</p>
                          <p>Pickup Locations: {user.userPickupLocations?.length || 0}</p>
                          {user._count?.childUsers > 0 && (
                            <p>Child Users: {user._count.childUsers}</p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            View
                          </Link>
                          <Link
                            href={`/admin/users/${user.id}/edit`}
                            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                          >
                            Edit
                          </Link>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-2">
                        {user.userSubGroups?.map((usg) => (
                          <span
                            key={usg.subGroups.id}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {usg.subGroups.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ));
      })()}
    </div>
  );
}
