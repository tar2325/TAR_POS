import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ProductStoreService } from './product-store.service';
import { CategoryStoreService } from './category-store.service';

describe('ProductStoreService', () => {
  let service: ProductStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProductStoreService, CategoryStoreService],
    });
    service = TestBed.inject(ProductStoreService);
  });

  it('should initialize with mock products', () => {
    const products = service.getProducts();
    expect(products.length).toBeGreaterThan(0);
  });

  it('should find product by id and barcode', () => {
    const first = service.getProducts()[0];
    const foundById = service.findById(first.id);
    const foundByBarcode = service.findByBarcode(first.barcode);

    expect(foundById).toEqual(first);
    expect(foundByBarcode).toEqual(first);
  });

  it('should search products by name, sku, or barcode', () => {
    const results = service.search('มาม่า');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((p) => p.name.includes('มาม่า'))).toBe(true);

    const emptyResults = service.search('NONEXISTENT_ITEM_XYZ');
    expect(emptyResults.length).toBe(0);
  });

  it('should create a new product and normalize costPrice and price', () => {
    const newProd = service.createProduct({
      sku: 'TEST-SKU-99',
      barcode: '',
      name: 'สินค้าทดสอบ',
      categoryId: 1,
      price: 150,
      costPrice: 90,
      stock: 20,
      minStock: 5,
      active: true,
    });

    expect(newProd.id).toBeDefined();
    expect(newProd.barcode).toBeTruthy();
    expect(newProd.costPrice).toBe(90);
    expect(newProd.price).toBe(150);

    const found = service.findById(newProd.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('สินค้าทดสอบ');
  });

  it('should update product attributes', () => {
    const first = service.getProducts()[0];
    const updated = service.updateProduct(first.id, {
      ...first,
      name: 'ชื่อสินค้าแก้ไขใหม่',
      price: 999,
      costPrice: 500,
    });

    expect(updated).toBeDefined();
    expect(updated?.name).toBe('ชื่อสินค้าแก้ไขใหม่');
    expect(updated?.price).toBe(999);
    expect(updated?.costPrice).toBe(500);
  });

  it('should delete a product', () => {
    const first = service.getProducts()[0];
    const success = service.deleteProduct(first.id);

    expect(success).toBe(true);
    expect(service.findById(first.id)).toBeUndefined();
  });

  it('should return false when deleting non-existent product', () => {
    const success = service.deleteProduct(99999);
    expect(success).toBe(false);
  });

  it('should check canAddQuantity accurately against stock', () => {
    const first = service.getProducts()[0];
    expect(service.canAddQuantity(first.id, 0, first.stock)).toBe(true);
    expect(service.canAddQuantity(first.id, first.stock, 1)).toBe(false);
  });

  describe('adjustStock', () => {
    it('should increase stock and record movement', () => {
      const first = service.getProducts()[0];
      const initialStock = first.stock;

      const updated = service.adjustStock(
        { productId: first.id, quantity: 10, type: 'MANUAL_IN', note: 'รับของเพิ่ม' },
        'ผู้จัดการ',
      );

      expect(updated).toBeDefined();
      expect(updated?.stock).toBe(initialStock + 10);

      const movements = service.movementList();
      expect(movements.length).toBeGreaterThan(0);
      expect(movements[0].type).toBe('MANUAL_IN');
      expect(movements[0].quantity).toBe(10);
      expect(movements[0].stockBefore).toBe(initialStock);
      expect(movements[0].stockAfter).toBe(initialStock + 10);
    });

    it('should decrease stock on sale and record movement', () => {
      const first = service.getProducts()[0];
      const initialStock = first.stock;

      const updated = service.adjustStock(
        { productId: first.id, quantity: -2, type: 'SALE', note: 'บิล 001' },
        'แคชเชียร์ A',
      );

      expect(updated).toBeDefined();
      expect(updated?.stock).toBe(initialStock - 2);
    });

    it('should prevent stock from becoming negative', () => {
      const first = service.getProducts()[0];
      const excessiveDeduction = -(first.stock + 100);

      const updated = service.adjustStock(
        { productId: first.id, quantity: excessiveDeduction, type: 'SALE' },
        'แคชเชียร์ A',
      );

      expect(updated).toBeUndefined();
      expect(service.findById(first.id)?.stock).toBe(first.stock);
    });

    it('should return undefined when quantity is 0', () => {
      const first = service.getProducts()[0];
      const result = service.adjustStock(
        { productId: first.id, quantity: 0, type: 'MANUAL_IN' },
        'แคชเชียร์ A',
      );
      expect(result).toBeUndefined();
    });
  });
});
