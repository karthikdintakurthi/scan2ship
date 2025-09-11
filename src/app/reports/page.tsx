'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ReportData {
  totalOrders: number;
  statusBreakdown: {
    pending: number;
    dispatched: number;
    delivered: number;
    returned: number;
    failed: number;
  };
  monthlyTrends: Array<{
    month: string;
    orders: number;
    pending: number;
    dispatched: number;
    delivered: number;
    returned: number;
    failed: number;
  }>;
  dateRange: {
    start: string;
    end: string;
  };
  filters: {
    startDate: string;
    endDate: string;
  };
}

export default function ReportsPage() {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [error, setError] = useState('');
  
  // Date filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Set default date range (August 2025 to current date)
  useEffect(() => {
    if (!startDate || !endDate) {
      const end = new Date();
      const start = new Date('2025-08-01'); // August 1, 2025
      
      // If current date is before August 2025, set end date to August 2025
      const endDate = end < start ? new Date('2025-08-31') : end;
      
      const startDateStr = start.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      console.log('🔄 [REPORTS] Setting default date range:', { startDateStr, endDateStr });
      
      setEndDate(endDateStr);
      setStartDate(startDateStr);
    }
  }, []);

  // Fetch report data
  const fetchReportData = async (start?: string, end?: string) => {
    try {
      const startDateParam = start || startDate;
      const endDateParam = end || endDate;
      console.log('🔄 [REPORTS] Starting to fetch report data...');
      console.log('🔄 [REPORTS] Date range:', { startDateParam, endDateParam });
      setIsLoadingReports(true);
      setError('');

      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const startParam = start || startDate;
      const endParam = end || endDate;
      
      const url = `/api/reports?startDate=${startParam}&endDate=${endParam}&t=${Date.now()}`;
      console.log('📡 [REPORTS] Making API call to:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📊 [REPORTS] API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ [REPORTS] API data received:', data);
        setReportData(data);
      } else {
        const errorData = await response.json();
        console.log('❌ [REPORTS] API error:', errorData);
        setError(errorData.error || 'Failed to fetch report data');
      }
    } catch (error) {
      console.error('❌ [REPORTS] Error fetching report data:', error);
      setError('Failed to load report data');
    } finally {
      setIsLoadingReports(false);
      setIsFiltering(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (isAuthenticated && startDate && endDate) {
      fetchReportData();
    }
  }, [isAuthenticated, startDate, endDate]);

  // Handle date filter changes
  const handleFilterChange = () => {
    if (startDate && endDate) {
      setIsFiltering(true);
      fetchReportData(startDate, endDate);
    }
  };

  // Quick filter presets
  const applyQuickFilter = (preset: string) => {
    const end = new Date();
    const start = new Date();
    
    switch (preset) {
      case 'today':
        // Today: start and end are both today
        break;
      case 'last7days':
        start.setDate(start.getDate() - 7);
        break;
      case 'last30days':
        start.setDate(start.getDate() - 30);
        break;
      case 'last3months':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'last6months':
        start.setMonth(start.getMonth() - 6);
        break;
      case 'last12months':
        start.setMonth(start.getMonth() - 12);
        break;
      case 'thisMonth':
        start.setDate(1);
        break;
      case 'lastMonth':
        start.setMonth(start.getMonth() - 1, 1);
        end.setDate(0);
        break;
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setIsFiltering(true);
    fetchReportData(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-600';
      case 'dispatched':
        return 'bg-blue-50 text-blue-600';
      case 'delivered':
        return 'bg-green-50 text-green-600';
      case 'returned':
        return 'bg-red-50 text-red-600';
      case 'failed':
        return 'bg-gray-50 text-gray-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Not Dispatched';
      case 'dispatched':
        return 'In Transit';
      case 'delivered':
        return 'Delivered';
      case 'returned':
        return 'Returned';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Delhivery Order Reports</h1>
          <p className="mt-2 text-gray-600">Track your order status and performance metrics</p>
          {reportData && (
            <p className="mt-2 text-sm text-gray-500">
              Data from {new Date(reportData.dateRange.start).toLocaleDateString()} to {new Date(reportData.dateRange.end).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Date Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter by Date Range</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleFilterChange}
                disabled={isFiltering || !startDate || !endDate}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFiltering ? 'Filtering...' : 'Apply Filter'}
              </button>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setMonth(start.getMonth() - 12);
                  setStartDate(start.toISOString().split('T')[0]);
                  setEndDate(end.toISOString().split('T')[0]);
                  handleFilterChange();
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Quick Filter Presets */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Quick Filters:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'today', label: 'Today' },
                { key: 'last7days', label: 'Last 7 Days' },
                { key: 'last30days', label: 'Last 30 Days' },
                { key: 'last3months', label: 'Last 3 Months' },
                { key: 'last6months', label: 'Last 6 Months' },
                { key: 'last12months', label: 'Last 12 Months' },
                { key: 'thisMonth', label: 'This Month' },
                { key: 'lastMonth', label: 'Last Month' }
              ].map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => applyQuickFilter(preset.key)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {isLoadingReports ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading reports...</p>
            </div>
          </div>
        ) : reportData ? (
          <div className="space-y-8">
            {/* Total Orders Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900">{formatNumber(reportData.totalOrders)}</p>
                </div>
              </div>
            </div>

            {/* Order Status Breakdown */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {Object.entries(reportData.statusBreakdown).map(([status, count]) => (
                  <div key={status} className={`text-center p-4 rounded-lg ${getStatusColor(status)}`}>
                    <div className="text-2xl font-bold">{formatNumber(count)}</div>
                    <div className="text-sm font-medium">{getStatusLabel(status)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Trends */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Order Trends</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Orders</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Not Dispatched</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In Transit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivered</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Returned</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Failed</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.monthlyTrends.map((month, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{month.month}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(month.orders)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">{formatNumber(month.pending)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{formatNumber(month.dispatched)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{formatNumber(month.delivered)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{formatNumber(month.returned)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatNumber(month.failed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-500">Unable to load report data. Please try refreshing the page.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}