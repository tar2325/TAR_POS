import { Injectable, computed, inject, signal } from '@angular/core';
import { DailySalesSummary, ProductSalesSummary, ReportPeriod, SaleItem, SaleOrder } from '../../models/sale.model';
import { ReceiptData } from '../../models/receipt.model';
import { ProductStoreService } from './product-store.service';
import { CategoryStoreService } from './category-store.service';
import { getMockSales } from '../data/mock-sales.data';

const STORAGE_KEY = 'pos_sales_history';

@Injectable({ providedIn: 'root' })
export class SaleStoreService {
  private readonly productStore = inject(ProductStoreService);
  private readonly categoryStore = inject(CategoryStoreService);

  private readonly orders = signal<SaleOrder[]>(this.loadOrders());

  readonly orderList = this.orders.asReadonly();

  readonly todaySummary = computed<DailySalesSummary>(() => {
    return this.getSummaryByPeriod('today');
  });

  /**
   * Records a sale from POS terminal checkout
   */
  recordSale(receipt: ReceiptData, cashierName: string): SaleOrder {
    const saleItems: SaleItem[] = receipt.items.map((item) => {
      const liveProduct = this.productStore.findById(item.product.id);
      const costPrice = liveProduct?.costPrice ?? item.product.costPrice ?? 0;
      const price = item.product.price;
      const quantity = item.quantity;
      const lineCost = Math.round(costPrice * quantity * 100) / 100;
      const lineTotal = Math.round(price * quantity * 100) / 100;
      const lineProfit = Math.round((lineTotal - lineCost) * 100) / 100;
      const marginPercent = lineTotal > 0 ? Math.round((lineProfit / lineTotal) * 10000) / 100 : 0;

      const category = liveProduct?.categoryId
        ? this.categoryStore.findById(liveProduct.categoryId)?.name
        : undefined;

      // Automatically adjust inventory
      this.productStore.adjustStock(
        {
          productId: item.product.id,
          quantity: -quantity,
          type: 'SALE',
          note: `ขายสินค้า บิล ${receipt.receiptNo}`,
        },
        cashierName,
      );

      return {
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        barcode: item.product.barcode,
        categoryName: category,
        quantity,
        costPrice,
        price,
        lineCost,
        lineTotal,
        lineProfit,
        marginPercent,
      };
    });

    const totalCost = Math.round(saleItems.reduce((acc, it) => acc + it.lineCost, 0) * 100) / 100;
    const totalRevenue = Math.round(receipt.summary.total * 100) / 100;
    const grossProfit = Math.round((totalRevenue - totalCost) * 100) / 100;
    const profitMarginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 10000) / 100 : 0;
    const itemCount = receipt.items.reduce((acc, it) => acc + it.quantity, 0);

    const newOrder: SaleOrder = {
      id: receipt.receiptNo,
      receiptNo: receipt.receiptNo,
      createdAt: receipt.createdAt instanceof Date ? receipt.createdAt.toISOString() : new Date(receipt.createdAt).toISOString(),
      cashierName: cashierName || receipt.cashierName || 'พนักงานขาย',
      items: saleItems,
      itemCount,
      subtotal: receipt.summary.subtotal,
      discount: receipt.summary.discount,
      tax: receipt.summary.tax,
      total: totalRevenue,
      totalCost,
      grossProfit,
      profitMarginPercent,
    };

    this.orders.update((list) => {
      const updated = [newOrder, ...list];
      this.persistOrders(updated);
      return updated;
    });

    return newOrder;
  }

  /**
   * Aggregates sales by period preset
   */
  getSummaryByPeriod(period: ReportPeriod, customStart?: Date, customEnd?: Date): DailySalesSummary {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let label: string;

    switch (period) {
      case 'today': {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        label = 'วันนี้';
        break;
      }
      case 'yesterday': {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        startDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
        endDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
        label = 'เมื่อวานนี้';
        break;
      }
      case 'last7days': {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        label = '7 วันล่าสุด';
        break;
      }
      case 'last30days': {
        const d = new Date(now);
        d.setDate(d.getDate() - 29);
        startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        label = '30 วันล่าสุด';
        break;
      }
      case 'custom': {
        startDate = customStart
          ? new Date(customStart.getFullYear(), customStart.getMonth(), customStart.getDate(), 0, 0, 0, 0)
          : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = customEnd
          ? new Date(customEnd.getFullYear(), customEnd.getMonth(), customEnd.getDate(), 23, 59, 59, 999)
          : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        label = `${startDate.toLocaleDateString('th-TH')} - ${endDate.toLocaleDateString('th-TH')}`;
        break;
      }
    }

    return this.aggregateOrders(startDate, endDate, label);
  }

  private aggregateOrders(startDate: Date, endDate: Date, periodLabel: string): DailySalesSummary {
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    const filtered = this.orders().filter((order) => {
      const time = new Date(order.createdAt).getTime();
      return time >= startMs && time <= endMs;
    });

    const orderCount = filtered.length;
    let totalItemsSold = 0;
    let totalRevenue = 0;
    let totalCost = 0;

    const productMap = new Map<number, ProductSalesSummary>();

    for (const order of filtered) {
      totalRevenue += order.total;
      totalCost += order.totalCost;

      for (const item of order.items) {
        totalItemsSold += item.quantity;

        const existing = productMap.get(item.productId);
        if (existing) {
          existing.quantitySold += item.quantity;
          existing.totalSales += item.lineTotal;
          existing.totalCost += item.lineCost;
          existing.grossProfit += item.lineProfit;
          existing.profitMarginPercent =
            existing.totalSales > 0
              ? Math.round((existing.grossProfit / existing.totalSales) * 10000) / 100
              : 0;
        } else {
          productMap.set(item.productId, {
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            barcode: item.barcode,
            categoryName: item.categoryName,
            quantitySold: item.quantity,
            totalSales: item.lineTotal,
            totalCost: item.lineCost,
            grossProfit: item.lineProfit,
            profitMarginPercent: item.marginPercent,
          });
        }
      }
    }

    totalRevenue = Math.round(totalRevenue * 100) / 100;
    totalCost = Math.round(totalCost * 100) / 100;
    const grossProfit = Math.round((totalRevenue - totalCost) * 100) / 100;
    const profitMarginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 10000) / 100 : 0;

    const products = Array.from(productMap.values()).sort((a, b) => b.totalSales - a.totalSales);

    return {
      date: periodLabel,
      orderCount,
      totalItemsSold,
      totalRevenue,
      totalCost,
      grossProfit,
      profitMarginPercent,
      products,
      orders: filtered,
    };
  }

  private loadOrders(): SaleOrder[] {
    if (typeof window === 'undefined') {
      return getMockSales();
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getMockSales();
      this.persistOrders(initial);
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return getMockSales();
    }
  }

  private persistOrders(orders: SaleOrder[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error('Failed to persist sales orders to localStorage', e);
    }
  }

  resetData(): void {
    const initial = getMockSales();
    this.orders.set(initial);
    this.persistOrders(initial);
  }
}
