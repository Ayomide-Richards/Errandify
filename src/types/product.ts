export type ProductType = 'individual' | 'with_options';

export type AvailabilityStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface ProductOptionValue {
  id: string;
  name: string;
  colorHex?: string; // Optional hex code for color swatches
}

export interface ProductOption {
  id: string;
  name: string; // e.g. "Colour", "Size", "Material"
  values: ProductOptionValue[];
}

export interface ProductCombination {
  id: string;
  selectedOptions: Record<string, string>; // e.g. { "Colour": "Black", "Size": "40" }
  title: string; // e.g. "Black / 40"
  price: number;
  discountPrice?: number; // Optional reduced price
  stockQuantity: number;
  isAvailable: boolean;
  sku?: string;
  imageIndex?: number; // Optional index of associated product image
}

export interface ProductImage {
  id: string;
  url: string;
  name: string;
  size?: number;
  isPrimary: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  images: ProductImage[];
  category: string;
  subcategory?: string;
  productType: ProductType;
  
  // Individual Product Fields
  unitOfSale?: string; // e.g. "Kilogram (kg)", "Bag"
  price?: number; // Original Price in Nigerian Naira (₦)
  discountPrice?: number; // Optional Discount Price in Nigerian Naira (₦)
  stockQuantity?: number;
  
  // Product with Options Fields
  options?: ProductOption[];
  combinations?: ProductCombination[];
  
  // Visibility & Timestamps (Publish, Unpublish, Delete)
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  search: string;
  category: string;
  availability: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  publicationStatus: 'all' | 'published' | 'unpublished';
  sortBy: 'recent' | 'name_asc' | 'price_asc' | 'price_desc';
}

export interface SummaryMetrics {
  totalProducts: number;
  publishedProducts: number;
  unpublishedProducts: number;
  outOfStockProducts: number;
}
