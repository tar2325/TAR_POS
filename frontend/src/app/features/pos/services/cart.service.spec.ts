import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { CartService } from './cart.service';
import { ProductStoreService } from '../../../core/services/product-store.service';
import { CategoryStoreService } from '../../../core/services/category-store.service';
import { Product } from '../../../models/product.model';

describe('CartService', () => {
  let service: CartService;
  let productStore: ProductStoreService;

  const sampleProduct: Product = {
    id: 1,
    sku: 'P001',
    barcode: '8850123456789',
    name: 'สบู่ก้อน',
    categoryId: 1,
    price: 35,
    costPrice: 20,
    stock: 5,
    minStock: 2,
    active: true,
  };

  const sampleProduct2: Product = {
    id: 2,
    sku: 'P002',
    barcode: '8850123456790',
    name: 'ยาสระผม',
    categoryId: 1,
    price: 120,
    costPrice: 80,
    stock: 10,
    minStock: 2,
    active: true,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CartService, ProductStoreService, CategoryStoreService],
    });
    service = TestBed.inject(CartService);
    productStore = TestBed.inject(ProductStoreService);
    service.clear();
  });

  it('should initialize with empty cart and zero summary', () => {
    expect(service.cartItems()).toEqual([]);
    expect(service.summary().total).toBe(0);
    expect(service.summary().itemCount).toBe(0);
  });

  it('should add a product to cart and update summary', () => {
    const success = service.addProduct(sampleProduct);

    expect(success).toBe(true);
    expect(service.cartItems().length).toBe(1);
    expect(service.getQuantity(1)).toBe(1);
    expect(service.summary().total).toBe(35);
    expect(service.summary().itemCount).toBe(1);
  });

  it('should increment existing item when adding same product again', () => {
    service.addProduct(sampleProduct);
    service.addProduct(sampleProduct);

    expect(service.cartItems().length).toBe(1);
    expect(service.getQuantity(1)).toBe(2);
    expect(service.summary().total).toBe(70);
    expect(service.summary().itemCount).toBe(2);
  });

  it('should not add product when stock check fails', () => {
    const outOfStockProduct: Product = {
      ...sampleProduct,
      id: 999,
      stock: 0,
    };
    const success = service.addProduct(outOfStockProduct);

    expect(success).toBe(false);
    expect(service.getQuantity(999)).toBe(0);
  });

  it('should increase quantity when allowed by stock', () => {
    service.addProduct(sampleProduct);
    const success = service.increaseQuantity(1);

    expect(success).toBe(true);
    expect(service.getQuantity(1)).toBe(2);
  });

  it('should decrease quantity and remove item when reaching 0', () => {
    service.addProduct(sampleProduct);
    service.increaseQuantity(1);
    expect(service.getQuantity(1)).toBe(2);

    service.decreaseQuantity(1);
    expect(service.getQuantity(1)).toBe(1);

    service.decreaseQuantity(1);
    expect(service.getQuantity(1)).toBe(0);
    expect(service.cartItems().length).toBe(0);
  });

  it('should remove item completely by productId', () => {
    service.addProduct(sampleProduct);
    service.addProduct(sampleProduct2);
    expect(service.cartItems().length).toBe(2);

    service.removeItem(1);
    expect(service.cartItems().length).toBe(1);
    expect(service.getQuantity(1)).toBe(0);
    expect(service.getQuantity(2)).toBe(1);
  });

  it('should clear all items', () => {
    service.addProduct(sampleProduct);
    service.addProduct(sampleProduct2);
    service.clear();

    expect(service.cartItems().length).toBe(0);
    expect(service.summary().total).toBe(0);
    expect(service.summary().itemCount).toBe(0);
  });
});
