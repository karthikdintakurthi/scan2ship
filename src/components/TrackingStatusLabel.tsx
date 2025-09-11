import { useState } from 'react';

interface TrackingStatusLabelProps {
  status?: string;
  className?: string;
  orderId?: number;
  trackingId?: string;
  apiKey?: string;
  onStatusUpdate?: (newStatus: string) => void;
}

export default function TrackingStatusLabel({ 
  status, 
  className = '', 
  orderId, 
  trackingId, 
  apiKey, 
  onStatusUpdate 
}: TrackingStatusLabelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!orderId || !trackingId || !apiKey || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/tracking/update-single', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          trackingId,
          apiKey
        })
      });

      const result = await response.json();
      
      if (result.success && onStatusUpdate) {
        onStatusUpdate(result.data.newStatus);
      }
    } catch (error) {
      console.error('Failed to refresh status:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!status) {
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ${className}`}>
        Pending
      </span>
    );
  }

  const getStatusConfig = (status: string) => {
    const lowerStatus = status.toLowerCase();
    
    // Simple mapping: manifested → Not Dispatched, delivered → Delivered, returned → Returned, everything else → In Transit
    if (lowerStatus === 'delivered') {
      return {
        label: 'Delivered',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        icon: '✅'
      };
    }
    
    if (lowerStatus === 'manifested' || lowerStatus === 'not picked') {
      return {
        label: 'Not Dispatched',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        icon: '⏳'
      };
    }
    
    if (lowerStatus === 'returned') {
      return {
        label: 'Returned',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        icon: '↩️'
      };
    }
    
    // Everything else (in_transit, success, dispatched, pending, etc.) → In Transit
    return {
      label: 'In Transit',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      icon: '🚚'
    };
  };

  const config = getStatusConfig(status);

  // If we have refresh capabilities, show a button with refresh option
  if (orderId && trackingId && apiKey) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
          <span className="mr-1">{config.icon}</span>
          {config.label}
        </span>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="ml-1 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          title="Refresh status"
        >
          {isRefreshing ? '⟳' : '↻'}
        </button>
      </div>
    );
  }

  // Default display without refresh capability
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} ${className}`}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </span>
  );
}
