import { CartItem, CartSummary } from './cart-item.model';

export interface ReceiptData {
  receiptNo: string;
  createdAt: Date;
  cashierName: string;
  items: CartItem[];
  summary: CartSummary;
}
