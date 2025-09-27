'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { CatalogProduct, OrderItem } from '@/types/catalog';
import { debounce } from '@/lib/debounce';
import { useAuth } from '@/contexts/AuthContext';
// Using regular img tag to avoid Image constructor conflict

interface ProductSelectionProps {
  onProductsChange: (items: OrderItem[]) => void;
  currentClient?: any;
  onReset?: () => void; // Callback to reset the component
}

export default function ProductSelection({ onProductsChange, currentClient, onReset }: ProductSelectionProps) {
  const { currentSession } = useAuth();
  const [selectedProducts, setSelectedProducts] = useState<CatalogProduct[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<CatalogProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCatalogConnected, setIsCatalogConnected] = useState<boolean | null>(null); // null = checking, true = connected, false = not connected

  useEffect(() => {
    onProductsChange(orderItems);
  }, [orderItems, onProductsChange]);

  // Check catalog integration status on component mount
  useEffect(() => {
    const checkCatalogIntegration = async () => {
      console.log('🔍 [PRODUCT_SELECTION] Checking catalog integration...');
      console.log('🔍 [PRODUCT_SELECTION] currentSession:', currentSession);
      console.log('🔍 [PRODUCT_SELECTION] currentSession?.token:', currentSession?.token);
      
      if (!currentSession?.token) {
        console.log('❌ [PRODUCT_SELECTION] No session token, setting isCatalogConnected to false');
        setIsCatalogConnected(false);
        return;
      }

      try {
        console.log('🔍 [PRODUCT_SELECTION] Making test connection request...');
        // Make a test request to check if catalog integration is configured
        const response = await fetch('/api/catalog', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession.token}`,
          },
          body: JSON.stringify({
            action: 'test_connection',
            data: {}
          }),
        });

        console.log('🔍 [PRODUCT_SELECTION] Response status:', response.status);
        console.log('🔍 [PRODUCT_SELECTION] Response ok:', response.ok);

        if (response.ok) {
          console.log('✅ [PRODUCT_SELECTION] Catalog integration is available');
          setIsCatalogConnected(true);
        } else {
          const errorData = await response.json();
          console.log('❌ [PRODUCT_SELECTION] Error response:', errorData);
          
          if (errorData.error?.includes('not configured') || errorData.error?.includes('integration')) {
            console.log('❌ [PRODUCT_SELECTION] Integration not configured, hiding component');
            setIsCatalogConnected(false);
          } else {
            console.log('⚠️ [PRODUCT_SELECTION] Other error, still showing component');
            // Other errors might be temporary, so we'll still show the component
            setIsCatalogConnected(true);
          }
        }
      } catch (error) {
        console.error('❌ [PRODUCT_SELECTION] Error checking catalog integration:', error);
        setIsCatalogConnected(false);
      }
    };

    checkCatalogIntegration();
  }, [currentSession?.token]);

  // Auto-convert out-of-stock items to preorders on component load (only if product allows preorders)
  useEffect(() => {
    const hasOutOfStockItems = orderItems.some(item => 
      !item.isPreorder && (item.product.stockLevel || 0) <= 0 && item.product.allowPreorder
    );
    
    if (hasOutOfStockItems) {
      console.log('📦 [AUTO_CONVERT] Found out-of-stock items that allow preorders, auto-converting');
      const updatedItems = orderItems.map(item => 
        !item.isPreorder && (item.product.stockLevel || 0) <= 0 && item.product.allowPreorder
          ? { ...item, isPreorder: true }
          : item
      );
      setOrderItems(updatedItems);
      setSuccess('Out-of-stock items auto-converted to preorders');
      setTimeout(() => setSuccess(''), 3000);
    }
  }, []); // Run once on component mount

  const handleProductSelect = (product: CatalogProduct, isPreorder: boolean = false) => {
    console.log('🔍 [PRODUCT_SELECTION] Product selected:', product.name);
    console.log('🔍 [PRODUCT_SELECTION] Is preorder:', isPreorder);
    console.log('🔍 [PRODUCT_SELECTION] Product thumbnailUrl:', product.thumbnailUrl);
    console.log('🔍 [PRODUCT_SELECTION] Full product data:', product);
    
    // Check stock availability
    const currentStock = product.stockLevel || 0;
    const minStock = product.minStock || 0;
    const requestedQuantity = 1; // Always adding 1 initially
    
    console.log('📦 [STOCK_CHECK] Current stock:', currentStock);
    console.log('📦 [STOCK_CHECK] Min stock:', minStock);
    console.log('📦 [STOCK_CHECK] Requested quantity:', requestedQuantity);
    console.log('📦 [STOCK_CHECK] Is preorder:', isPreorder);
    
    // If not a preorder, check stock availability
    if (!isPreorder) {
      // Check if product is out of stock
      if (currentStock <= 0) {
        if (product.allowPreorder) {
          setError(`${product.name} is out of stock (Stock: ${currentStock}). Please use the "Preorder" button instead.`);
        } else {
          setError(`${product.name} is out of stock (Stock: ${currentStock}) and preorders are not allowed for this product.`);
        }
        setTimeout(() => setError(''), 5000);
        return;
      }
      
      // Check if adding this product would go below minimum stock
      const existingItem = orderItems.find(item => item.product.sku === product.sku);
      const newTotalQuantity = existingItem ? existingItem.quantity + requestedQuantity : requestedQuantity;
      const remainingStock = currentStock - newTotalQuantity;
      
      if (remainingStock < minStock) {
        const maxAllowedQuantity = currentStock - minStock;
        if (maxAllowedQuantity <= 0) {
          setError(`${product.name} cannot be added. Adding would go below minimum stock level (Min: ${minStock}, Available: ${currentStock})`);
          setTimeout(() => setError(''), 5000);
          return;
        } else {
          setError(`${product.name} - Only ${maxAllowedQuantity} units available to maintain minimum stock (Min: ${minStock})`);
          setTimeout(() => setError(''), 5000);
          return;
        }
      }
    }
    
    const existingItem = orderItems.find(item => item.product.sku === product.sku);
    
    if (existingItem) {
      // Update quantity
      const updatedItems = orderItems.map(item =>
        item.product.sku === product.sku
          ? { ...item, quantity: item.quantity + 1, isPreorder: isPreorder || item.isPreorder }
          : item
      );
      setOrderItems(updatedItems);
    } else {
      // Add new product
      const newItem: OrderItem = {
        product,
        quantity: 1,
        price: parseFloat(product.price) || 0,
        isPreorder: isPreorder
      };
      setOrderItems([...orderItems, newItem]);
    }
    
    // Clear search term and results after selection
    clearSearch();
    
    const newTotalQuantity = existingItem ? existingItem.quantity + 1 : 1;
    const remainingStock = currentStock - newTotalQuantity;
    
    if (isPreorder) {
      setSuccess(`Added ${product.name} as PREORDER to order (Stock will go to: ${remainingStock})`);
    } else {
      setSuccess(`Added ${product.name} to order (Stock: ${remainingStock} remaining)`);
    }
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleQuantityChange = (sku: string, quantity: number) => {
    if (quantity <= 0) {
      // Remove item
      const updatedItems = orderItems.filter(item => item.product.sku !== sku);
      setOrderItems(updatedItems);
    } else {
      // Find the product to check stock
      const existingItem = orderItems.find(item => item.product.sku === sku);
      if (!existingItem) return;
      
      const product = existingItem.product;
      const currentStock = product.stockLevel || 0;
      const minStock = product.minStock || 0;
      
      // Skip stock validation for preorder items
      if (existingItem.isPreorder) {
        console.log('📦 [QUANTITY_CHANGE] Preorder item - no quantity restrictions');
        // Update quantity without stock validation
        const updatedItems = orderItems.map(item =>
          item.product.sku === sku
            ? { ...item, quantity }
            : item
        );
        setOrderItems(updatedItems);
        return;
      }

      // Auto-convert to preorder if product is out of stock and allows preorders
      if (currentStock <= 0 && product.allowPreorder) {
        console.log('📦 [QUANTITY_CHANGE] Product out of stock (stock:', currentStock, '), auto-converting to preorder');
        const updatedItems = orderItems.map(item =>
          item.product.sku === sku
            ? { ...item, quantity, isPreorder: true }
            : item
        );
        setOrderItems(updatedItems);
        setSuccess(`${product.name} auto-converted to preorder (stock: ${currentStock})`);
        setTimeout(() => setSuccess(''), 3000);
        return;
      }
      
      // Check if the new quantity would exceed available stock (only for non-preorder items)
      const remainingStock = currentStock - quantity;
      
      if (remainingStock < minStock) {
        const maxAllowedQuantity = currentStock - minStock;
        if (maxAllowedQuantity <= 0) {
          setError(`${product.name} - Cannot increase quantity. Would go below minimum stock (Min: ${minStock}, Available: ${currentStock})`);
          setTimeout(() => setError(''), 5000);
          return;
        } else {
          setError(`${product.name} - Maximum quantity allowed: ${maxAllowedQuantity} (to maintain minimum stock of ${minStock})`);
          setTimeout(() => setError(''), 5000);
          return;
        }
      }
      
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

  const handleConvertToPreorder = (sku: string) => {
    const updatedItems = orderItems.map(item =>
      item.product.sku === sku
        ? { ...item, isPreorder: true }
        : item
    );
    setOrderItems(updatedItems);
    setSuccess('Item converted to preorder - no quantity restrictions apply');
    setTimeout(() => setSuccess(''), 3000);
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
      
      if (!currentSession?.token) {
        throw new Error('Authentication required. Please log in to search products.');
      }
      
      const response = await fetch('/api/catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.token}`,
        },
        body: JSON.stringify({
          action: 'search_products',
          data: { query: term, page: 1, limit: 10 }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // If catalog integration is not configured, hide the component
        if (errorData.error?.includes('not configured') || errorData.error?.includes('integration')) {
          setIsCatalogConnected(false);
          return;
        }
        
        throw new Error(errorData.error || 'Failed to search products');
      }

      const data = await response.json();
      console.log('🔍 [PRODUCT_SELECTION] Search response:', data);
      console.log('🔍 [PRODUCT_SELECTION] Products with thumbnails:', data.products?.map(p => ({ name: p.name, sku: p.sku, thumbnailUrl: p.thumbnailUrl })));
      setSearchResults(data.products || []);
    } catch (error) {
      console.error('❌ [PRODUCT_SELECTION] Product search error:', error);
      setError('Failed to search products. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const debouncedSearchProducts = useMemo(
    () => debounce(searchProducts, 500),
    []
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

  const resetProductSelection = useCallback(() => {
    console.log('🔄 [PRODUCT_SELECTION] Resetting product selection');
    setSelectedProducts([]);
    setOrderItems([]);
    setSearchTerm('');
    setSearchResults([]);
    setError('');
    setSuccess('');
    setShowProductSearch(false);
    if (debouncedSearchProducts.cancel) {
      debouncedSearchProducts.cancel();
    }
  }, [debouncedSearchProducts]);

  // Expose reset function to parent component
  useEffect(() => {
    if (onReset) {
      console.log('🔄 [PRODUCT_SELECTION] Exposing reset function to parent');
      onReset(resetProductSelection);
    }
  }, [onReset, resetProductSelection]);

  const handleSearchChange = (value: string) => {
    console.log('🔍 [PRODUCT_SELECTION] Search change:', value);
    setSearchTerm(value);
    debouncedSearchProducts(value);
  };


  // Debug logging
  console.log('🔍 [PRODUCT_SELECTION] Render state - isCatalogConnected:', isCatalogConnected);

  // Show loading state while checking catalog integration
  if (isCatalogConnected === null) {
    console.log('🔄 [PRODUCT_SELECTION] Showing loading state');
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking catalog integration...</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render the component if catalog integration is not available
  if (isCatalogConnected === false) {
    console.log('❌ [PRODUCT_SELECTION] Integration not available, hiding component');
    return null;
  }

  console.log('✅ [PRODUCT_SELECTION] Integration available, showing component');

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
              {searchResults.map((product) => {
                const currentStock = product.stockLevel || 0;
                const minStock = product.minStock || 0;
                const isOutOfStock = currentStock <= 0;
                const isLowStock = currentStock <= minStock;
                const canAdd = currentStock > 0 && currentStock > minStock;
                
                console.log('🔍 [PRODUCT_SELECTION] Rendering product:', { name: product.name, sku: product.sku, thumbnailUrl: product.thumbnailUrl });
                
                return (
                  <div
                    key={product.sku}
                    className={`p-3 border-b border-gray-100 last:border-b-0 ${
                      canAdd ? 'hover:bg-gray-50 cursor-pointer' : 'bg-gray-50 cursor-not-allowed opacity-60'
                    }`}
                    onClick={() => canAdd && handleProductSelect(product)}
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
                            onLoad={() => {
                              console.log('✅ Image loaded successfully:', product.thumbnailUrl);
                            }}
                            onError={(e) => {
                              console.error('❌ Image failed to load:', product.thumbnailUrl);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        {!product.thumbnailUrl && (
                          <div className="w-10 h-10 bg-gray-200 rounded-md mr-3 flex items-center justify-center">
                            <span className="text-xs text-gray-500">No Image</span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                          <div className="flex items-center space-x-2">
                            <p className={`text-sm ${
                              isOutOfStock ? 'text-red-600 font-medium' : 
                              isLowStock ? 'text-orange-600 font-medium' : 
                              'text-gray-500'
                            }`}>
                              Stock: {currentStock}
                            </p>
                            {isOutOfStock && (
                              <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                Out of Stock
                              </span>
                            )}
                            {isLowStock && !isOutOfStock && (
                              <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                                Low Stock
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">₹{(parseFloat(product.price) || 0).toFixed(2)}</p>
                        <div className="flex space-x-1 mt-1">
                          {canAdd && (
                            <button 
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProductSelect(product, false);
                              }}
                            >
                              Add
                            </button>
                          )}
                          {isOutOfStock && product.allowPreorder && (
                            <button 
                              className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProductSelect(product, true);
                              }}
                            >
                              Preorder
                            </button>
                          )}
                          {!canAdd && !isOutOfStock && (
                            <button 
                              className="px-2 py-1 text-xs bg-gray-400 text-gray-200 cursor-not-allowed rounded"
                              disabled
                            >
                              Low Stock
                            </button>
                          )}
                          {isOutOfStock && !product.allowPreorder && (
                            <button 
                              className="px-2 py-1 text-xs bg-gray-400 text-gray-200 cursor-not-allowed rounded"
                              disabled
                            >
                              No Preorder
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-gray-900">{item.product.name}</p>
                    {item.isPreorder && (
                      <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full font-medium">
                        PREORDER
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">SKU: {item.product.sku}</p>
                  <p className="text-sm text-gray-500">Price: ₹{item.price.toFixed(2)}</p>
                  {item.isPreorder && (
                    <p className="text-xs text-orange-600 font-medium">
                      ⚠️ {item.product.stockLevel <= 0 ? 'Out of stock - will be backordered' : 'Preorder - no quantity restrictions'}
                    </p>
                  )}
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
                {!item.isPreorder && (item.product.stockLevel || 0) <= 0 && item.product.allowPreorder && (
                  <button
                    onClick={() => handleConvertToPreorder(item.product.sku)}
                    className="ml-2 px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                  >
                    Convert to Preorder
                  </button>
                )}
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
