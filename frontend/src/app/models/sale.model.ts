export interface SaleItem {
  productId: number;
  productName: string;
  sku: string;
  barcode: string;
  categoryName?: string;
  quantity: number;
  costPrice: number;
  price: number;
  lineCost: number;
  lineTotal: number;
  lineProfit: number;
  marginPercent: number;
}

export interface SaleOrder {
  id: string;
  receiptNo: string;
  createdAt: string; // ISO string
  cashierName: string;
  items: SaleItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  totalCost: number;
  grossProfit: number;
  profitMarginPercent: number;
}

export interface ProductSalesSummary {
  productId: number;
  productName: string;
  sku: string;
  barcode: string;
  categoryName?: string;
  quantitySold: number;
  totalSales: number;
  totalCost: number;
  grossProfit: number;
  profitMarginPercent: number;
}

export interface DailySalesSummary {
  date: string; // YYYY-MM-DD or period label
  orderCount: number;
  totalItemsSold: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMarginPercent: number;
  products: ProductSalesSummary[];
  orders: SaleOrder[];
}

export type ReportPeriod = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom';
