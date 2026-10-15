export type StockMovementType = 'RECEIVE' | 'ADJUST' | 'POS_MANUAL' | 'SALE';

export interface StockMovement {
  id: number;
  productId: number;
  productName: string;
  type: StockMovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  note?: string;
  createdBy: string;
  createdAt: string;
}

export interface StockAdjustRequest {
  productId: number;
  quantity: number;
  type: StockMovementType;
  note?: string;
}
