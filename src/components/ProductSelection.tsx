'use client';

import { useState, useEffect, useMemo } from 'react';
import { CatalogService } from '@/lib/catalog-service';
import { CatalogProduct, OrderItem } from '@/types/catalog';
import { debounce } from '@/lib/debounce';
// Using regular img tag to avoid Image constructor conflict

interface ProductSelectionProps {
  onProductsChange: (items: OrderItem[]) => void;
  currentClient?: any;
}

export default function ProductSelection({ onProductsChange, currentClient }: ProductSelectionProps) {
  const [isCatalogConnected, setIsCatalogConnected] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<CatalogProduct[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<CatalogProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const catalogService = useMemo(() => new CatalogService(), []);

  useEffect(() => {
    // Check if catalog is already connected
    const isConnected = catalogService.loadStoredAuth();
    setIsCatalogConnected(isConnected);
    
    // Set client slug for catalog service
    if (currentClient?.slug) {
      catalogService.setClientSlug(currentClient.slug);
    }
  }, [catalogService, currentClient]);

  useEffect(() => {
    onProductsChange(orderItems);
  }, [orderItems, onProductsChange]);

  const handleProductSelect = (product: CatalogProduct) => {
    console.log('🔍 [PRODUCT_SELECTION] Product selected:', product.name);
    console.log('🔍 [PRODUCT_SELECTION] Product thumbnailUrl:', product.thumbnailUrl);
    console.log('🔍 [PRODUCT_SELECTION] Full product data:', product);
    
    const existingItem = orderItems.find(item => item.product.sku === product.sku);
    
    if (existingItem) {
      // Update quantity
      const updatedItems = orderItems.map(item =>
        item.product.sku === product.sku
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      setOrderItems(updatedItems);
    } else {
      // Add new product
      const newItem: OrderItem = {
        product,
        quantity: 1,
        price: parseFloat(product.price) || 0
      };
      setOrderItems([...orderItems, newItem]);
    }
    
    // Clear search term and results after selection
    clearSearch();
    
    setSuccess(`Added ${product.name} to order`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleQuantityChange = (sku: string, quantity: number) => {
    if (quantity <= 0) {
      // Remove item
      const updatedItems = orderItems.filter(item => item.product.sku !== sku);
      setOrderItems(updatedItems);
    } else {
      // Update quantity
      const updatedItems = orderItems.map(item =>
        item.product.sku === sku
          ? { ...item, quantity }
          : item
      );
      setOrderItems(updatedItems);
    }
  };

  const handleRemoveProduct = (sku: string) => {
    const updatedItems = orderItems.filter(item => item.product.sku !== sku);
    setOrderItems(updatedItems);
  };

  const searchProducts = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      console.log('🔍 [PRODUCT_SELECTION] Searching for:', term);
      const response = await catalogService.searchProducts(term);
      console.log('🔍 [PRODUCT_SELECTION] Search response:', response);
      setSearchResults(response.products || []);
    } catch (error) {
      console.error('❌ [PRODUCT_SELECTION] Product search error:', error);
      setError('Failed to search products. Please check your catalog connection.');
    } finally {
      setIsSearching(false);
    }
  };

  const debouncedSearchProducts = useMemo(
    () => debounce(searchProducts, 500),
    [catalogService]
  );

  // Cancel any pending debounced operations when clearing
  const clearSearch = () => {
    console.log('🧹 [PRODUCT_SELECTION] Clearing search term and results');
    setSearchTerm('');
    setSearchResults([]);
    // Cancel any pending debounced search
    if (debouncedSearchProducts.cancel) {
      debouncedSearchProducts.cancel();
    }
  };

  const handleSearchChange = (value: string) => {
    console.log('🔍 [PRODUCT_SELECTION] Search change:', value);
    setSearchTerm(value);
    debouncedSearchProducts(value);
  };

  if (!isCatalogConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Catalog Not Connected
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Connect to your product catalog to select products for this order.{' '}
                <a href="/catalog-connect" className="font-medium underline text-yellow-800 hover:text-yellow-900">
                  Connect now
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Product Selection</h3>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Connected
          </span>
          <button
            onClick={() => setShowProductSearch(!showProductSearch)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {showProductSearch ? 'Hide Search' : 'Add Products'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {showProductSearch && (
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {isSearching && (
              <div className="absolute right-3 top-2.5">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-md max-h-60 overflow-y-auto">
              {searchResults.map((product) => (
                <div
                  key={product.sku}
                  className="p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleProductSelect(product)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {product.thumbnailUrl && (
                        <img
                          src={product.thumbnailUrl}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="rounded-md mr-3 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                        <p className="text-sm text-gray-500">Stock: {product.stockLevel || 0}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">₹{(parseFloat(product.price) || 0).toFixed(2)}</p>
                      <button className="mt-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {orderItems.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Selected Products</h4>
          {orderItems.map((item) => (
            <div key={item.product.sku} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center flex-1">
                {item.product.thumbnailUrl && (
                  <img
                    src={item.product.thumbnailUrl}
                    alt={item.product.name}
                    width={32}
                    height={32}
                    className="rounded-md mr-3 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <div>
                  <p className="font-medium text-gray-900">{item.product.name}</p>
                  <p className="text-sm text-gray-500">SKU: {item.product.sku}</p>
                  <p className="text-sm text-gray-500">Price: ₹{item.price.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleQuantityChange(item.product.sku, item.quantity - 1)}
                  className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                >
                  -
                </button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button
                  onClick={() => handleQuantityChange(item.product.sku, item.quantity + 1)}
                  className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                >
                  +
                </button>
                <button
                  onClick={() => handleRemoveProduct(item.product.sku)}
                  className="ml-2 text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          
          <div className="pt-3 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900">Total Items:</span>
              <span className="font-medium text-gray-900">
                {orderItems.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900">Subtotal:</span>
              <span className="font-medium text-gray-900">
                ₹{orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
