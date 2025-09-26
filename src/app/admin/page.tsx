import Link from 'next/link';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage your application settings and integrations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">API Keys</h3>
          <p className="text-gray-600 text-sm mb-4">Manage API keys for external integrations</p>
          <Link 
            href="/admin/api-keys" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Manage API Keys
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Cross-App Mappings</h3>
          <p className="text-gray-600 text-sm mb-4">Configure integrations with external apps</p>
          <Link 
            href="/admin/cross-app-mappings" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            Manage Mappings
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Clients</h3>
          <p className="text-gray-600 text-sm mb-4">View and manage client accounts</p>
          <Link 
            href="/admin/clients" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
          >
            Manage Clients
          </Link>
        </div>
      </div>
    </div>
  );
}