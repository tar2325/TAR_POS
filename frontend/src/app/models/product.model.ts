export interface Product {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  price: number;
  costPrice?: number;
  categoryId: number;
  imageUrl?: string;
  stock: number;
  minStock: number;
  active: boolean;
}

export interface ProductPayload {
  sku: string;
  barcode: string;
  name: string;
  price: number;
  costPrice?: number;
  categoryId: number;
  imageUrl?: string;
  stock: number;
  minStock: number;
  active: boolean;
}

export interface StockAdjustDialogData {
  product: Product;
  neededQty: number;
  message: string;
}

export interface StockAdjustDialogResult {
  addedQty: number;
  newStock: number;
}
