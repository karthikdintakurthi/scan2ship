'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { catalogService, CatalogProduct, CatalogAuthResponse } from '@/lib/catalog-service';
import CatalogAuth from './CatalogAuth';
import ProductSearch from './ProductSearch';

interface OrderItem {
  product: CatalogProduct;
  quantity: number;
  price: number;
  total: number;
}

interface EnhancedOrderFormProps {
  onOrderCreate: (orderData: any) => void;
  onOrderUpdate?: (orderData: any) => void;
  initialData?: any;
  isEdit?: boolean;
}

export default function EnhancedOrderForm({ 
  onOrderCreate, 
  onOrderUpdate, 
  initialData, 
  isEdit = false 
}: EnhancedOrderFormProps) {
  const { currentClient } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Catalog integration state
  const [isCatalogConnected, setIsCatalogConnected] = useState(false);
  const [catalogAuth, setCatalogAuth] = useState<CatalogAuthResponse | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<CatalogProduct[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  
  // Order form state
  const [formData, setFormData] = useState({
    customer_name: '',
    mobile_number: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    tracking_number: '',
    reference_number: '',
    reseller_name: '',
    reseller_mobile: '',
    courier_service: 'delhivery',
    pickup_location: '',
    is_cod: false,
    cod_amount: '',
    skip_tracking: false,
    notes: ''
  });

  useEffect(() => {
    // Check if catalog is already connected
    const isConnected = catalogService.loadStoredAuth();
    setIsCatalogConnected(isConnected);
    
    if (isConnected) {
      const userData = localStorage.getItem('catalog_user');
      if (userData) {
        setCatalogAuth({ user: JSON.parse(userData), token: localStorage.getItem('catalog_auth_token') || '' });
      }
    }

    // Set client slug for catalog service
    if (currentClient?.slug) {
      catalogService.setClientSlug(currentClient.slug);
    }

    // Load initial data if editing
    if (isEdit && initialData) {
      setFormData(initialData);
      // Load existing order items if available
      if (initialData.items) {
        setOrderItems(initialData.items);
        setSelectedProducts(initialData.items.map((item: any) => item.product));
      }
    }
  }, [currentClient, isEdit, initialData]);

  const handleCatalogAuthSuccess = (authData: CatalogAuthResponse) => {
    setCatalogAuth(authData);
    setIsCatalogConnected(true);
    setSuccess('Successfully connected to catalog app');
  };

  const handleCatalogAuthError = (error: string) => {
    setError(error);
  };

  const handleProductSelect = (product: CatalogProduct) => {
    if (selectedProducts.find(p => p.id === product.id)) {
      setError('Product already selected');
      return;
    }

    setSelectedProducts(prev => [...prev, product]);
    
    // Add to order items with default quantity 1
    const newItem: OrderItem = {
      product,
      quantity: 1,
      price: product.price,
      total: product.price
    };
    
    setOrderItems(prev => [...prev, newItem]);
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
    setOrderItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    
    setOrderItems(prev => prev.map(item => {
      if (item.product.id === productId) {
        const updatedItem = {
          ...item,
          quantity,
          total: item.price * quantity
        };
        return updatedItem;
      }
      return item;
    }));
  };

  const calculateTotals = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const codAmount = formData.is_cod ? parseFloat(formData.cod_amount) || 0 : 0;
    const total = subtotal + codAmount;
    
    return { subtotal, codAmount, total };
  };

  const validateForm = () => {
    if (!formData.customer_name.trim()) {
      setError('Customer name is required');
      return false;
    }
    
    if (!formData.mobile_number.trim()) {
      setError('Mobile number is required');
      return false;
    }
    
    if (!formData.address.trim()) {
      setError('Address is required');
      return false;
    }
    
    if (!formData.city.trim()) {
      setError('City is required');
      return false;
    }
    
    if (!formData.state.trim()) {
      setError('State is required');
      return false;
    }
    
    if (!formData.pincode.trim()) {
      setError('Pincode is required');
      return false;
    }
    
    if (orderItems.length === 0) {
      setError('At least one product is required');
      return false;
    }
    
    // Check inventory availability
    for (const item of orderItems) {
      if (item.quantity > item.product.stockLevel) {
        setError(`Insufficient stock for ${item.product.name}. Available: ${item.product.stockLevel}, Requested: ${item.quantity}`);
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      // Prepare order data
      const { subtotal, codAmount, total } = calculateTotals();
      
      const orderData = {
        // Map form fields to API expected fields
        name: formData.customer_name,
        mobile: formData.mobile_number,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        pincode: formData.pincode,
        tracking_id: formData.tracking_number,
        reference_number: formData.reference_number,
        reseller_name: formData.reseller_name,
        reseller_mobile: formData.reseller_mobile,
        courier_service: formData.courier_service,
        pickup_location: formData.pickup_location,
        is_cod: formData.is_cod,
        cod_amount: formData.is_cod ? codAmount.toString() : '',
        skip_tracking: formData.skip_tracking,
        notes: formData.notes,
        // Additional calculated fields
        package_value: subtotal,
        weight: orderItems.reduce((sum, item) => sum + (item.product.weight || 100), 0),
        total_items: orderItems.reduce((sum, item) => sum + item.quantity, 0),
        // Catalog integration data
        items: orderItems,
        catalog_integration: {
          connected: isCatalogConnected,
          products: orderItems.map(item => ({
            sku: item.product.sku,
            quantity: item.quantity,
            price: item.price
          }))
        }
      };

      // If catalog is connected, reduce inventory
      if (isCatalogConnected) {
        // Debug catalog service state before inventory reduction
        catalogService.debugState();
        
        const inventoryItems = orderItems.map(item => ({
          sku: item.product.sku,
          quantity: item.quantity
        }));

        const inventoryResponse = await catalogService.reduceInventory(inventoryItems);
        
        if (!inventoryResponse.data.allItemsAvailable) {
          setError('Some items are not available in inventory');
          setIsProcessing(false);
          return;
        }
      }

      // Create or update order
      if (isEdit) {
        await onOrderUpdate?.(orderData);
        setSuccess('Order updated successfully');
      } else {
        await onOrderCreate(orderData);
        setSuccess('Order created successfully');
      }

      // Reset form if creating new order
      if (!isEdit) {
        setFormData({
          customer_name: '',
          mobile_number: '',
          address: '',
          city: '',
          state: '',
          country: 'India',
          pincode: '',
          tracking_number: '',
          reference_number: '',
          reseller_name: '',
          reseller_mobile: '',
          courier_service: 'delhivery',
          pickup_location: '',
          is_cod: false,
          cod_amount: '',
          skip_tracking: false,
          notes: ''
        });
        setSelectedProducts([]);
        setOrderItems([]);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to process order');
    } finally {
      setIsProcessing(false);
    }
  };

  const { subtotal, codAmount, total } = calculateTotals();

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isEdit ? 'Edit Order' : 'Create New Order'}
        </h2>
        <p className="text-gray-600">
          {isEdit ? 'Update order details and inventory' : 'Create a new order with product integration'}
        </p>
      </div>

      {/* Catalog Integration Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Catalog Integration</h3>
        <CatalogAuth
          onAuthSuccess={handleCatalogAuthSuccess}
          onAuthError={handleCatalogAuthError}
        />
      </div>

      {/* Product Selection Section */}
      {isCatalogConnected && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Selection</h3>
          <ProductSearch
            onProductSelect={handleProductSelect}
            selectedProducts={selectedProducts}
            disabled={isProcessing}
          />
        </div>
      )}

      {/* Order Items */}
      {orderItems.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-3">
              {orderItems.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between bg-white rounded p-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.product.name}</p>
                        <p className="text-sm text-gray-500">SKU: {item.product.sku}</p>
                        <p className="text-sm text-gray-500">
                          Stock: {item.product.stockLevel} | Price: ₹{item.price}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-700">Qty:</label>
                        <input
                          type="number"
                          min="1"
                          max={item.product.stockLevel}
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.product.id, parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                          disabled={isProcessing}
                        />
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">₹{item.total}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveProduct(item.product.id)}
                        className="text-red-600 hover:text-red-800"
                        disabled={isProcessing}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Order Summary */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm">
                <span>Subtotal:</span>
                <span>₹{subtotal}</span>
              </div>
              {formData.is_cod && (
                <div className="flex justify-between items-center text-sm">
                  <span>COD Amount:</span>
                  <span>₹{codAmount}</span>
                </div>
              )}
              <div className="flex justify-between items-center font-semibold text-lg pt-2 border-t border-gray-200">
                <span>Total:</span>
                <span>₹{total}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isProcessing}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                value={formData.mobile_number}
                onChange={(e) => setFormData(prev => ({ ...prev, mobile_number: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isProcessing}
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isProcessing}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isProcessing}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State *
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isProcessing}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pincode *
                </label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isProcessing}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Courier Service
              </label>
              <select
                value={formData.courier_service}
                onChange={(e) => setFormData(prev => ({ ...prev, courier_service: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isProcessing}
              >
                <option value="delhivery">Delhivery</option>
                <option value="dtdc">DTDC</option>
                <option value="blue_dart">Blue Dart</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference Number
              </label>
              <input
                type="text"
                value={formData.reference_number}
                onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isProcessing}
              />
            </div>
          </div>
        </div>

        {/* COD Section */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <input
              type="checkbox"
              id="is_cod"
              checked={formData.is_cod}
              onChange={(e) => setFormData(prev => ({ ...prev, is_cod: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={isProcessing}
            />
            <label htmlFor="is_cod" className="text-sm font-medium text-gray-700">
              Cash on Delivery (COD)
            </label>
          </div>
          
          {formData.is_cod && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                COD Amount
              </label>
              <input
                type="number"
                value={formData.cod_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, cod_amount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isProcessing}
              />
            </div>
          )}
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => {
              setFormData({
                customer_name: '',
                mobile_number: '',
                address: '',
                city: '',
                state: '',
                country: 'India',
                pincode: '',
                tracking_number: '',
                reference_number: '',
                reseller_name: '',
                reseller_mobile: '',
                courier_service: 'delhivery',
                pickup_location: '',
                is_cod: false,
                cod_amount: '',
                skip_tracking: false,
                notes: ''
              });
              setSelectedProducts([]);
              setOrderItems([]);
              setError('');
              setSuccess('');
            }}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isProcessing}
          >
            Reset
          </button>
          
          <button
            type="submit"
            disabled={isProcessing || orderItems.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : (isEdit ? 'Update Order' : 'Create Order')}
          </button>
        </div>
      </form>
    </div>
  );
}
