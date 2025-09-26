'use client';

import { useState, useEffect, useCallback } from 'react';
import { CatalogProduct } from '@/types/catalog';
import { debounce } from '@/lib/debounce';

interface ProductSearchProps {
  onProductSelect: (product: CatalogProduct) => void;
  selectedProducts: CatalogProduct[];
  disabled?: boolean;
}

export default function ProductSearch({ onProductSelect, selectedProducts, disabled = false }: ProductSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CatalogProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim() || query.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setError('');

      try {
        const response = await fetch('/api/catalog', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'search_products',
            data: { query, page: 1, limit: 10 }
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to search products');
        }

        const data = await response.json();
        setSearchResults(data.products || []);
        setShowResults(true);
      } catch (err: any) {
        setError(err.message || 'Failed to search products');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const handleProductSelect = (product: CatalogProduct) => {
    onProductSelect(product);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  const isProductSelected = (productId: string) => {
    return selectedProducts.some(p => p.id === productId);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(price);
  };

  const getStockStatus = (stockLevel: number, minStock: number) => {
    if (stockLevel === 0) return { text: 'Out of Stock', color: 'text-red-600' };
    if (stockLevel <= minStock) return { text: 'Low Stock', color: 'text-yellow-600' };
    return { text: 'In Stock', color: 'text-green-600' };
  };

  return (
    <div className="relative">
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Search Products
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowResults(searchResults.length > 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter SKU or product name..."
            disabled={disabled}
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-2">
          {error}
        </div>
      )}

      {/* Search Results */}
      {showResults && searchResults.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {searchResults.map((product) => {
            const stockStatus = getStockStatus(product.stockLevel, product.minStock);
            const isSelected = isProductSelected(product.id);
            
            return (
              <div
                key={product.id}
                className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                  isSelected ? 'bg-blue-50 border-blue-200' : ''
                } ${product.stockLevel === 0 ? 'opacity-60' : ''}`}
                onClick={() => !isSelected && product.stockLevel > 0 && handleProductSelect(product)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.name}
                      </p>
                      {isSelected && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                      <p className="text-xs font-medium text-gray-900">
                        {formatPrice(product.price)}
                      </p>
                      <p className={`text-xs font-medium ${stockStatus.color}`}>
                        {stockStatus.text} ({product.stockLevel})
                      </p>
                    </div>
                    {product.category && (
                      <p className="text-xs text-gray-500 mt-1">
                        Category: {product.category.name}
                      </p>
                    )}
                  </div>
                  {product.stockLevel === 0 && (
                    <div className="ml-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No Results */}
      {showResults && searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg p-3">
          <p className="text-sm text-gray-500 text-center">
            No products found for "{searchQuery}"
          </p>
        </div>
      )}

      {/* Selected Products Summary */}
      {selectedProducts.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-700 mb-2">
            Selected Products ({selectedProducts.length})
          </p>
          <div className="space-y-2">
            {selectedProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between bg-gray-50 rounded p-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    SKU: {product.sku} • {formatPrice(product.price)} • Stock: {product.stockLevel}
                  </p>
                </div>
                <button
                  onClick={() => {
                    // Remove product from selection
                    const updated = selectedProducts.filter(p => p.id !== product.id);
                    // This would need to be handled by parent component
                  }}
                  className="ml-2 text-red-600 hover:text-red-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
