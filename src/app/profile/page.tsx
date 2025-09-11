'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Breadcrumb from '@/components/Breadcrumb';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  clientId: string;
  clients: {
    id: string;
    companyName: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
}

export default function ProfilePage() {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Password strength checker
  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return Math.min(strength, 5);
  };

  // Update password strength when new password changes
  useEffect(() => {
    if (newPassword) {
      setPasswordStrength(checkPasswordStrength(newPassword));
    } else {
      setPasswordStrength(0);
    }
  }, [newPassword]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch('/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setProfile(data);
          setEditedName(data.name);
        } else {
          setError('Failed to fetch profile data');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to fetch profile data');
      }
    };

    if (isAuthenticated) {
      fetchProfile();
    }
  }, [isAuthenticated]);

  const handleEdit = () => {
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedName(profile?.name || '');
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    if (!editedName.trim()) {
      setError('Name is required');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editedName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setIsEditing(false);
        setSuccess('Profile updated successfully');
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = () => {
    setIsChangingPassword(true);
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handlePasswordCancel = () => {
    setIsChangingPassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handlePasswordSave = async () => {
    // Validation
    if (!currentPassword.trim()) {
      setPasswordError('Current password is required');
      return;
    }

    if (!newPassword.trim()) {
      setPasswordError('New password is required');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }

    if (passwordStrength < 3) {
      setPasswordError('New password is too weak. Please use a stronger password with uppercase, lowercase, numbers, and special characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setIsSavingPassword(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setPasswordError('Authentication required');
        return;
      }

      const response = await fetch('/api/users/change-password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      if (response.ok) {
        setIsChangingPassword(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordSuccess('Password changed successfully');
        // Clear success message after 3 seconds
        setTimeout(() => setPasswordSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setPasswordError(errorData.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError('Failed to change password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb />
        
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
              {!isEditing && (
                <button
                  onClick={handleEdit}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {/* Success/Error Messages */}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {profile && (
              <div className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter your full name"
                        />
                      ) : (
                        <p className="text-sm text-gray-900 py-2">{profile.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <p className="text-sm text-gray-900 py-2">{profile.email}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <p className="text-sm text-gray-900 py-2 capitalize">{profile.role}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        profile.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {profile.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Company Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Company Information</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name
                      </label>
                      <p className="text-sm text-gray-900 py-2">{profile.clients.companyName}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Person
                      </label>
                      <p className="text-sm text-gray-900 py-2">{profile.clients.name}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Email
                      </label>
                      <p className="text-sm text-gray-900 py-2">{profile.clients.email}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <p className="text-sm text-gray-900 py-2">{profile.clients.phone || 'Not provided'}</p>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <p className="text-sm text-gray-900 py-2">
                        {profile.clients.address ? (
                          <>
                            {profile.clients.address}
                            {profile.clients.city && `, ${profile.clients.city}`}
                            {profile.clients.state && `, ${profile.clients.state}`}
                            {profile.clients.country && `, ${profile.clients.country}`}
                            {profile.clients.pincode && ` - ${profile.clients.pincode}`}
                          </>
                        ) : (
                          'Not provided'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Password Change Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Password & Security</h3>
                    {!isChangingPassword && (
                      <button
                        onClick={handlePasswordChange}
                        className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      >
                        Change Password
                      </button>
                    )}
                  </div>

                  {/* Password Success/Error Messages */}
                  {passwordSuccess && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">{passwordSuccess}</p>
                    </div>
                  )}

                  {passwordError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">{passwordError}</p>
                    </div>
                  )}

                  {isChangingPassword ? (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Enter your current password"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Enter your new password"
                        />
                        <div className="mt-2">
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              {[1, 2, 3, 4, 5].map((level) => (
                                <div
                                  key={level}
                                  className={`h-2 w-8 rounded ${
                                    level <= passwordStrength
                                      ? passwordStrength <= 2
                                        ? 'bg-red-500'
                                        : passwordStrength <= 3
                                        ? 'bg-yellow-500'
                                        : 'bg-green-500'
                                      : 'bg-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500">
                              {passwordStrength === 0 && 'Enter password'}
                              {passwordStrength === 1 && 'Very Weak'}
                              {passwordStrength === 2 && 'Weak'}
                              {passwordStrength === 3 && 'Fair'}
                              {passwordStrength === 4 && 'Good'}
                              {passwordStrength === 5 && 'Strong'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Password must be at least 8 characters long with uppercase, lowercase, numbers, and special characters
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Confirm your new password"
                        />
                      </div>

                      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                        <button
                          onClick={handlePasswordCancel}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handlePasswordSave}
                          disabled={isSavingPassword}
                          className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSavingPassword ? 'Changing Password...' : 'Change Password'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      <p>Last changed: Not available</p>
                      <p className="mt-1">Click "Change Password" to update your password</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {isEditing && (
                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
