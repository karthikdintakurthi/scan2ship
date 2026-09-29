// Shapes of catalog data as returned by /api/catalog (proxied from the catalog app)
// and used by the product selection UI. Type-only: nothing here exists at runtime.

export interface CatalogCategory {
  id?: string;
  name: string;
}

export interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  price: number;
  stockLevel: number;
  minStock: number;
  allowPreorder?: boolean;
  thumbnailUrl?: string | null;
  category?: CatalogCategory | null;
}

export interface OrderItem {
  product: CatalogProduct;
  quantity: number;
  price: number;
  isPreorder?: boolean;
}
