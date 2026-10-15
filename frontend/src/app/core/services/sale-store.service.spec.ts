import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { SaleStoreService } from './sale-store.service';
import { ProductStoreService } from './product-store.service';
import { CategoryStoreService } from './category-store.service';
import { ReceiptData } from '../../models/receipt.model';

describe('SaleStoreService', () => {
  let service: SaleStoreService;
  let productStore: ProductStoreService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [SaleStoreService, ProductStoreService, CategoryStoreService],
    });
    service = TestBed.inject(SaleStoreService);
    productStore = TestBed.inject(ProductStoreService);
  });

  it('should initialize with sales order list', () => {
    const orders = service.orderList();
    expect(orders).toBeDefined();
    expect(Array.isArray(orders)).toBe(true);
  });

  it('should record a sale, snapshot costs, compute profit, and reduce inventory', () => {
    const testProduct = productStore.getProducts()[0];
    const initialStock = testProduct.stock;
    const saleQty = 2;
    const unitPrice = testProduct.price;
    const unitCost = testProduct.costPrice ?? 0;

    const receipt: ReceiptData = {
      receiptNo: 'REC-TEST-001',
      createdAt: new Date(),
      items: [
        {
          product: { ...testProduct },
          quantity: saleQty,
        },
      ],
      summary: {
        subtotal: unitPrice * saleQty,
        discount: 0,
        tax: 0,
        total: unitPrice * saleQty,
        itemCount: saleQty,
      },
      payment: {
        method: 'CASH',
        receivedAmount: unitPrice * saleQty,
        changeAmount: 0,
      },
    };

    const recorded = service.recordSale(receipt, 'สมชาย');

    expect(recorded.receiptNo).toBe('REC-TEST-001');
    expect(recorded.cashierName).toBe('สมชาย');
    expect(recorded.items.length).toBe(1);

    const item = recorded.items[0];
    expect(item.quantity).toBe(saleQty);
    expect(item.price).toBe(unitPrice);
    expect(item.costPrice).toBe(unitCost);
    expect(item.lineCost).toBe(unitCost * saleQty);
    expect(item.lineTotal).toBe(unitPrice * saleQty);
    expect(item.lineProfit).toBe((unitPrice - unitCost) * saleQty);

    expect(recorded.totalCost).toBe(unitCost * saleQty);
    expect(recorded.grossProfit).toBe((unitPrice - unitCost) * saleQty);

    // Verify inventory deduction
    const updatedProduct = productStore.findById(testProduct.id);
    expect(updatedProduct?.stock).toBe(initialStock - saleQty);
  });

  it('should aggregate sales summary by period', () => {
    const todaySummary = service.getSummaryByPeriod('today');
    expect(todaySummary.date).toBe('วันนี้');
    expect(todaySummary.totalRevenue).toBeGreaterThanOrEqual(0);
    expect(todaySummary.totalCost).toBeGreaterThanOrEqual(0);
    expect(todaySummary.grossProfit).toBeCloseTo(
      todaySummary.totalRevenue - todaySummary.totalCost,
      1,
    );

    const weekSummary = service.getSummaryByPeriod('last7days');
    expect(weekSummary.date).toBe('7 วันล่าสุด');
    expect(weekSummary.orderCount).toBeGreaterThanOrEqual(0);

    const monthSummary = service.getSummaryByPeriod('last30days');
    expect(monthSummary.date).toBe('30 วันล่าสุด');
    expect(monthSummary.orderCount).toBeGreaterThanOrEqual(0);
  });

  it('should calculate profit margins correctly for zero revenue gracefully', () => {
    const summary = service.getSummaryByPeriod('custom', new Date('2099-01-01'), new Date('2099-01-02'));
    expect(summary.orderCount).toBe(0);
    expect(summary.totalRevenue).toBe(0);
    expect(summary.totalCost).toBe(0);
    expect(summary.grossProfit).toBe(0);
    expect(summary.profitMarginPercent).toBe(0);
    expect(summary.products.length).toBe(0);
  });
});
