'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  isActive: boolean;
  permissions: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  clients: {
    id: string;
    name: string;
    companyName: string;
  };
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showKey, setShowKey] = useState<{ [key: string]: boolean }>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    clientSlug: '',
    permissions: [] as string[],
    expiresAt: ''
  });

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        toast.error('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/api-keys', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.data || []);
      } else if (response.status === 401) {
        toast.error('Authentication expired. Please log in again.');
      } else {
        toast.error('Failed to fetch API keys');
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  };


  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.clientId || !formData.clientSlug) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        toast.error('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          clientId: formData.clientId,
          permissions: formData.permissions,
          expiresAt: formData.expiresAt
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setApiKeys([...apiKeys, data.data]);
        setShowCreateForm(false);
        setFormData({ name: '', clientId: '', clientSlug: '', permissions: [], expiresAt: '' });
        toast.success('API key created successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create API key');
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error('Failed to create API key');
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        toast.error('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch(`/api/admin/api-keys/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setApiKeys(apiKeys.filter(key => key.id !== id));
        toast.success('API key deleted successfully');
      } else if (response.status === 401) {
        toast.error('Authentication expired. Please log in again.');
      } else {
        toast.error('Failed to delete API key');
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('Failed to delete API key');
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKey(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const copyToClipboard = async (text: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(keyId);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API Keys Management</h1>
          <p className="text-gray-600 mt-2">Manage API keys for cross-app integration</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create API Key
        </Button>
      </div>

      {/* Create API Key Form */}
      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New API Key</CardTitle>
            <CardDescription>Generate a new API key for cross-app integration</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateApiKey} className="space-y-4">
              <div>
                <Label htmlFor="name">Key Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Catalog Integration Key"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    placeholder="e.g., cmfohvqxb0001jp04hqvisj49"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">The unique identifier for the client</p>
                </div>
                
                <div>
                  <Label htmlFor="clientSlug">Client Slug</Label>
                  <Input
                    id="clientSlug"
                    value={formData.clientSlug}
                    onChange={(e) => setFormData({ ...formData, clientSlug: e.target.value })}
                    placeholder="e.g., vanitha-fashion-jewelry"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">The URL-friendly identifier for the client</p>
                </div>
              </div>

              <div>
                <Label>Permissions</Label>
                <div className="space-y-2 mt-2">
                  {['inventory:read', 'inventory:write', 'products:read', 'products:write'].map((permission) => (
                    <label key={permission} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(permission)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              permissions: [...formData.permissions, permission]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              permissions: formData.permissions.filter(p => p !== permission)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{permission}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={!formData.name || !formData.clientId || !formData.clientSlug}
                >
                  Create API Key
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* API Keys List */}
      <div className="grid gap-4">
        {apiKeys.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No API keys found. Create your first API key to get started.</p>
            </CardContent>
          </Card>
        ) : (
          apiKeys.map((apiKey) => (
            <Card key={apiKey.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{apiKey.name}</h3>
                      <Badge variant={apiKey.isActive ? 'default' : 'secondary'}>
                        {apiKey.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><strong>Client:</strong> {apiKey.clients?.companyName || apiKey.clients?.name || 'Unknown'}</p>
                      <p><strong>Created:</strong> {formatDate(apiKey.createdAt)}</p>
                      {apiKey.lastUsedAt && (
                        <p><strong>Last Used:</strong> {formatDate(apiKey.lastUsedAt)}</p>
                      )}
                      {apiKey.expiresAt && (
                        <p><strong>Expires:</strong> {formatDate(apiKey.expiresAt)}</p>
                      )}
                    </div>

                    <div className="mt-3">
                      <Label className="text-sm font-medium">API Key</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type={showKey[apiKey.id] ? 'text' : 'password'}
                          value={apiKey.key}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                        >
                          {showKey[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(apiKey.key, apiKey.id)}
                        >
                          {copiedKey === apiKey.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <Label className="text-sm font-medium">Permissions</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {apiKey.permissions.map((permission) => (
                          <Badge key={permission} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteApiKey(apiKey.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
