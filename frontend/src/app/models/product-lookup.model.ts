export type ProductLookupStatus =
  | 'found_local'
  | 'found_external'
  | 'not_found'
  | 'invalid'
  | 'FOUND'
  | 'LOCAL'
  | 'NOT_FOUND'
  | 'INVALID'
  | 'IN_STORE';

export type ProductLookupSource = 'thai-database' | 'openfoodfacts-thailand' | 'gemini-ai';

export interface ProductLookupSuggestion {
  barcode: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  categoryId?: number;
  quantity?: string;
  categoryHint?: string;
  source?: string | ProductLookupSource;
  confidence?: number;
  aiGenerated?: boolean;
  aiConfidence?: string;
  aiNotes?: string;
}

export interface ProductLookupResult {
  status: ProductLookupStatus;
  message: string;
  localProductId?: number;
  suggestion?: ProductLookupSuggestion;
}

export interface OpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  product_name_th?: string;
  generic_name?: string;
  generic_name_th?: string;
  brands?: string;
  quantity?: string;
  image_front_url?: string;
  image_url?: string;
  categories?: string;
  categories_tags?: string[];
  countries_tags?: string[];
}

export interface OpenFoodFactsResponse {
  status: number;
  status_verbose?: string;
  code?: string;
  product?: OpenFoodFactsProduct;
}

export interface OpenFoodFactsSearchResponse {
  count: number;
  products?: OpenFoodFactsProduct[];
}

export interface RetailerSearchLink {
  id: string;
  name: string;
  url: string;
}

export interface BackendLookupResponse {
  status: ProductLookupStatus;
  barcode: string;
  validChecksum: boolean;
  originCountry?: string;
  message: string;
  localProductId?: number;
  suggestion?: ProductLookupSuggestion;
  retailerLinks?: RetailerSearchLink[];
}
