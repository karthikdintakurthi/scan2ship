'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CrossAppMapping {
  id: string;
  scan2shipClientId: string;
  catalogClientId: string;
  catalogApiKey: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  scan2shipClient: {
    id: string;
    name: string;
    companyName: string;
    email: string;
    isActive: boolean;
  };
}

export default function CrossAppMappingsPage() {
  const [mappings, setMappings] = useState<CrossAppMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    scan2shipClientId: '',
    catalogClientId: '',
    catalogApiKey: ''
  });

  const [clients, setClients] = useState<Array<{ id: string; name: string; companyName: string }>>([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  useEffect(() => {
    fetchMappings();
    fetchClients();
  }, []);

  const fetchMappings = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        return;
      }
      
      const response = await fetch('/api/admin/cross-app-mappings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setMappings(data.data || []);
      } else {
        console.error('Failed to fetch mappings:', response.status);
      }
    } catch (error) {
      console.error('Error fetching mappings:', error);
      toast.error('Failed to fetch cross-app mappings');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      setClientsLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        return;
      }
      
      const response = await fetch('/api/admin/clients', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched clients:', data);
        setClients(data.data || []);
      } else {
        console.error('Failed to fetch clients:', response.status);
        const errorData = await response.json();
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setClientsLoading(false);
    }
  };

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        toast.error('Authentication required. Please log in again.');
        return;
      }
      
      const response = await fetch('/api/admin/cross-app-mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setMappings([...mappings, data.data]);
        setShowCreateForm(false);
        setFormData({ scan2shipClientId: '', catalogClientId: '', catalogApiKey: '' });
        toast.success('Cross-app mapping created successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create mapping');
      }
    } catch (error) {
      console.error('Error creating mapping:', error);
      toast.error('Failed to create mapping');
    }
  };

  const handleDeleteMapping = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return;

    try {
      const response = await fetch(`/api/admin/cross-app-mappings/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMappings(mappings.filter(mapping => mapping.id !== id));
        toast.success('Mapping deleted successfully');
      } else {
        toast.error('Failed to delete mapping');
      }
    } catch (error) {
      console.error('Error deleting mapping:', error);
      toast.error('Failed to delete mapping');
    }
  };

  const toggleApiKeyVisibility = (mappingId: string) => {
    setShowApiKey(prev => ({ ...prev, [mappingId]: !prev[mappingId] }));
  };

  const copyToClipboard = async (text: string, mappingId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(mappingId);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const testConnection = async (mapping: CrossAppMapping) => {
    try {
      const response = await fetch('/api/catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'test_connection',
          data: {}
        })
      });

      if (response.ok) {
        toast.success('Connection test successful');
      } else {
        toast.error('Connection test failed');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error('Connection test failed');
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
          <h1 className="text-3xl font-bold text-gray-900">Cross-App Mappings</h1>
          <p className="text-gray-600 mt-2">Manage integrations between Scan2Ship and Catalog App</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Mapping
        </Button>
      </div>

      {/* Create Mapping Form */}
      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Cross-App Mapping</CardTitle>
            <CardDescription>Link a Scan2Ship client with a Catalog App client</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateMapping} className="space-y-4">
              <div>
                <Label htmlFor="scan2shipClientId">Scan2Ship Client ID</Label>
                <Input
                  id="scan2shipClientId"
                  value={formData.scan2shipClientId}
                  onChange={(e) => setFormData({ ...formData, scan2shipClientId: e.target.value })}
                  placeholder="e.g., cmfohvqxb0001jp04hqvisj49"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter the client ID from Scan2Ship (e.g., Vanitha Fashion Jewelry: cmfohvqxb0001jp04hqvisj49)
                </p>
              </div>
              
              <div>
                <Label htmlFor="catalogClientId">Catalog App Client ID</Label>
                <Input
                  id="catalogClientId"
                  value={formData.catalogClientId}
                  onChange={(e) => setFormData({ ...formData, catalogClientId: e.target.value })}
                  placeholder="e.g., cmfohvqxb0001jp04hqvisj49"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter the client ID from Catalog App (should match the Scan2Ship client ID)
                </p>
              </div>

              <div>
                <Label htmlFor="catalogApiKey">Catalog App API Key</Label>
                <Input
                  id="catalogApiKey"
                  type="password"
                  value={formData.catalogApiKey}
                  onChange={(e) => setFormData({ ...formData, catalogApiKey: e.target.value })}
                  placeholder="e.g., cat_sk_..."
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">Create Mapping</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Mappings List */}
      <div className="grid gap-4">
        {mappings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No cross-app mappings found. Create your first mapping to get started.</p>
            </CardContent>
          </Card>
        ) : (
          mappings.map((mapping) => (
            <Card key={mapping.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">
                        {mapping.scan2shipClient.companyName}
                      </h3>
                      <Badge variant={mapping.isActive ? 'default' : 'secondary'}>
                        {mapping.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {mapping.scan2shipClient.isActive ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><strong>Scan2Ship Client:</strong> {mapping.scan2shipClient.name}</p>
                      <p><strong>Email:</strong> {mapping.scan2shipClient.email}</p>
                      <p><strong>Catalog Client ID:</strong> {mapping.catalogClientId}</p>
                      <p><strong>Created:</strong> {formatDate(mapping.createdAt)}</p>
                      <p><strong>Updated:</strong> {formatDate(mapping.updatedAt)}</p>
                    </div>

                    <div className="mt-3">
                      <Label className="text-sm font-medium">Catalog API Key</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type={showApiKey[mapping.id] ? 'text' : 'password'}
                          value={mapping.catalogApiKey}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleApiKeyVisibility(mapping.id)}
                        >
                          {showApiKey[mapping.id] ? 'Hide' : 'Show'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(mapping.catalogApiKey, mapping.id)}
                        >
                          {copiedKey === mapping.id ? <CheckCircle className="h-4 w-4" /> : 'Copy'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testConnection(mapping)}
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Test
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteMapping(mapping.id)}
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
