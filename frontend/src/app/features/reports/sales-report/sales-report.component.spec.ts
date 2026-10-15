import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach } from 'vitest';
import { SalesReportComponent } from './sales-report.component';
import { SaleStoreService } from '../../../core/services/sale-store.service';
import { ProductStoreService } from '../../../core/services/product-store.service';
import { CategoryStoreService } from '../../../core/services/category-store.service';

describe('SalesReportComponent', () => {
  let component: SalesReportComponent;
  let saleStore: SaleStoreService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [SalesReportComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        SaleStoreService,
        ProductStoreService,
        CategoryStoreService,
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SalesReportComponent);
    component = fixture.componentInstance;
    saleStore = TestBed.inject(SaleStoreService);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with today period', () => {
    expect((component as any).selectedPeriod()).toBe('today');
    expect((component as any).summary().date).toBe('วันนี้');
  });

  it('should change period when setPeriod is called', () => {
    component.setPeriod('last7days');
    expect((component as any).selectedPeriod()).toBe('last7days');
    expect((component as any).summary().date).toBe('7 วันล่าสุด');
    expect((component as any).selectedOrder()).toBeNull();
  });

  it('should toggle selected order detail view', () => {
    const orders = (component as any).summary().orders;
    if (orders.length > 0) {
      const order = orders[0];
      component.viewOrderDetail(order);
      expect((component as any).selectedOrder()?.id).toBe(order.id);

      // Clicking again toggles off
      component.viewOrderDetail(order);
      expect((component as any).selectedOrder()).toBeNull();

      // Open and close via closeOrderDetail
      component.viewOrderDetail(order);
      expect((component as any).selectedOrder()).not.toBeNull();
      component.closeOrderDetail();
      expect((component as any).selectedOrder()).toBeNull();
    }
  });

  it('should filter products by search query', () => {
    (component as any).searchQuery.set('มาม่า');
    const filtered = (component as any).filteredProducts();
    for (const p of filtered) {
      const matches =
        p.productName.toLowerCase().includes('มาม่า') ||
        p.sku.toLowerCase().includes('มาม่า') ||
        p.barcode.includes('มาม่า');
      expect(matches).toBe(true);
    }
  });

  it('should execute exportCsv without error', () => {
    expect(() => component.exportCsv()).not.toThrow();
  });
});
