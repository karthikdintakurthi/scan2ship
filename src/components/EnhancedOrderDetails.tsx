'use client';

import { useState, useEffect } from 'react';
import { catalogService, CatalogProduct } from '@/lib/catalog-service';

interface OrderItem {
  product: CatalogProduct;
  quantity: number;
  price: number;
  total: number;
}

interface EnhancedOrderDetailsProps {
  order: any;
  onOrderUpdate?: (orderData: any) => void;
  onOrderDelete?: (orderId: string) => void;
  canEdit?: boolean;
}

export default function EnhancedOrderDetails({ 
  order, 
  onOrderUpdate, 
  onOrderDelete, 
  canEdit = false 
}: EnhancedOrderDetailsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isCatalogConnected, setIsCatalogConnected] = useState(false);

  useEffect(() => {
    // Check if catalog is connected
    const isConnected = catalogService.loadStoredAuth();
    setIsCatalogConnected(isConnected);

    // Load order items if available
    if (order.items && Array.isArray(order.items)) {
      setOrderItems(order.items);
    } else if (order.catalog_integration?.products) {
      // Load product details for catalog integration
      loadProductDetails(order.catalog_integration.products);
    }
  }, [order]);

  const loadProductDetails = async (products: any[]) => {
    if (!isCatalogConnected) return;

    setIsLoading(true);
    try {
      const productDetails = await Promise.all(
        products.map(async (item) => {
          try {
            const product = await catalogService.getProductBySku(item.sku);
            if (product) {
              return {
                product,
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity
              };
            }
            return null;
          } catch (error) {
            console.error(`Failed to load product ${item.sku}:`, error);
            return null;
          }
        })
      );

      setOrderItems(productDetails.filter(item => item !== null) as OrderItem[]);
    } catch (error) {
      console.error('Failed to load product details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInventoryRestore = async () => {
    if (!isCatalogConnected || !order.catalog_integration?.products) {
      setError('Catalog integration not available');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const inventoryItems = order.catalog_integration.products.map((item: any) => ({
        sku: item.sku,
        quantity: item.quantity
      }));

      await catalogService.restoreInventory(inventoryItems);
      setSuccess('Inventory restored successfully');
    } catch (error: any) {
      setError(error.message || 'Failed to restore inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'in_transit':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateTotals = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const codAmount = order.is_cod ? parseFloat(order.cod_amount) || 0 : 0;
    const total = subtotal + codAmount;
    
    return { subtotal, codAmount, total };
  };

  const { subtotal, codAmount, total } = calculateTotals();

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Order #{order.id}
          </h1>
          <p className="text-gray-600">
            Created on {formatDate(order.created_at)}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.tracking_status)}`}>
            {order.tracking_status || 'Pending'}
          </span>
          
          {order.tracking_id && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {order.tracking_id}
            </span>
          )}
        </div>
      </div>

      {/* Catalog Integration Status */}
      {order.catalog_integration && (
        <div className="mb-6">
          <div className={`p-4 rounded-lg border ${
            order.catalog_integration.connected 
              ? 'bg-green-50 border-green-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                order.catalog_integration.connected ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              <span className="font-medium text-gray-900">
                Catalog Integration: {order.catalog_integration.connected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            {order.catalog_integration.connected && (
              <p className="text-sm text-gray-600 mt-1">
                This order includes {order.catalog_integration.products?.length || 0} catalog products
              </p>
            )}
          </div>
        </div>
      )}

      {/* Customer Information */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Name</p>
              <p className="text-gray-900">{order.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Mobile</p>
              <p className="text-gray-900">{order.mobile}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-gray-700">Address</p>
              <p className="text-gray-900">
                {order.address}, {order.city}, {order.state} - {order.pincode}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Order Items */}
      {orderItems.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-4">
              {orderItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-white rounded p-4">
                  <div className="flex items-center space-x-4">
                    {item.product.media && item.product.media.length > 0 && (
                      <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                        <img
                          src={item.product.media[0].url}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900">{item.product.name}</h3>
                      <p className="text-sm text-gray-500">SKU: {item.product.sku}</p>
                      {item.product.category && (
                        <p className="text-sm text-gray-500">Category: {item.product.category.name}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    <p className="text-sm text-gray-500">Price: {formatPrice(item.price)}</p>
                    <p className="font-medium text-gray-900">Total: {formatPrice(item.total)}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Order Summary */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm">
                <span>Subtotal:</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {order.is_cod && (
                <div className="flex justify-between items-center text-sm">
                  <span>COD Amount:</span>
                  <span>{formatPrice(codAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center font-semibold text-lg pt-2 border-t border-gray-200">
                <span>Total:</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Details */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Courier Service</p>
              <p className="text-gray-900 capitalize">{order.courier_service}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Package Value</p>
              <p className="text-gray-900">{formatPrice(order.package_value)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Weight</p>
              <p className="text-gray-900">{order.weight}g</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Total Items</p>
              <p className="text-gray-900">{order.total_items}</p>
            </div>
            {order.reference_number && (
              <div>
                <p className="text-sm font-medium text-gray-700">Reference Number</p>
                <p className="text-gray-900">{order.reference_number}</p>
              </div>
            )}
            {order.pickup_location && (
              <div>
                <p className="text-sm font-medium text-gray-700">Pickup Location</p>
                <p className="text-gray-900">{order.pickup_location}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tracking Information */}
      {order.tracking_id && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tracking Information</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Tracking ID</p>
                <p className="text-gray-900 font-mono">{order.tracking_id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Status</p>
                <p className="text-gray-900">{order.tracking_status || 'Pending'}</p>
              </div>
              {order.delhivery_waybill_number && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Waybill Number</p>
                  <p className="text-gray-900 font-mono">{order.delhivery_waybill_number}</p>
                </div>
              )}
              {order.last_delhivery_attempt && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Last Update</p>
                  <p className="text-gray-900">{formatDate(order.last_delhivery_attempt)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error and Success Messages */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* Action Buttons */}
      {canEdit && (
        <div className="flex justify-end space-x-4">
          {isCatalogConnected && order.catalog_integration?.connected && (
            <button
              onClick={handleInventoryRestore}
              disabled={isLoading}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Restoring...' : 'Restore Inventory'}
            </button>
          )}
          
          <button
            onClick={() => onOrderUpdate?.(order)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Edit Order
          </button>
          
          <button
            onClick={() => onOrderDelete?.(order.id)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Delete Order
          </button>
        </div>
      )}
    </div>
  );
}
