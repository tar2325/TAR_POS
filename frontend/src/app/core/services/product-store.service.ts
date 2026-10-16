import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MOCK_PRODUCTS } from '../data/product-mock.data';
import { generateBarcodeFromSku, ParsedBulkProductRow, suggestNextSku } from '../utils/barcode.util';
import { StockAdjustRequest, StockMovement } from '../../models/inventory.model';
import { Product, ProductPayload } from '../../models/product.model';
import { CategoryStoreService } from './category-store.service';

export interface BulkCreateProductsResult {
  created: number;
  errors: string[];
}

@Injectable({ providedIn: 'root' })
export class ProductStoreService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly categoryStore = inject(CategoryStoreService);
  private readonly products = signal<Product[]>(MOCK_PRODUCTS.map((item) => ({ ...item })));
  private readonly movements = signal<StockMovement[]>([]);
  private movementId = 1;

  readonly productList = this.products.asReadonly();
  readonly movementList = this.movements.asReadonly();

  readonly activeProducts = computed(() => this.products().filter((product) => product.active));

  readonly lowStockProducts = computed(() =>
    this.products().filter((product) => product.active && product.stock <= product.minStock),
  );

  constructor() {
    this.loadProducts();
    this.loadMovements();
  }

  loadProducts(): void {
    if (typeof window === 'undefined' || !this.http) return;
    this.http.get<Product[]>(`${environment.apiUrl}/products`).subscribe({
      next: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          this.products.set(
            data.map((p) => ({
              ...p,
              costPrice: p.costPrice ?? 0,
            })),
          );
        }
      },
      error: (err) => {
        console.warn('Failed to load products from API, using fallback data:', err?.message || err);
      },
    });
  }

  loadMovements(): void {
    if (typeof window === 'undefined' || !this.http) return;
    this.http.get<StockMovement[]>(`${environment.apiUrl}/stock/movements`).subscribe({
      next: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          this.movements.set(data);
        }
      },
      error: (err) => {
        console.warn('Failed to load stock movements from API:', err?.message || err);
      },
    });
  }

  getProducts(): Product[] {
    return [...this.products()];
  }

  findById(id: number): Product | undefined {
    return this.products().find((product) => product.id === id);
  }

  findByBarcode(barcode: string): Product | undefined {
    const normalized = barcode.trim();
    return this.products().find((product) => product.barcode === normalized && product.active);
  }

  findByBarcodeExact(barcode: string, excludeId?: number): Product | undefined {
    const normalized = barcode.replace(/\D/g, '');
    return this.products().find(
      (product) => product.barcode.replace(/\D/g, '') === normalized && product.id !== excludeId,
    );
  }

  countByCategoryId(categoryId: number): number {
    return this.products().filter((product) => product.categoryId === categoryId).length;
  }

  search(query: string): Product[] {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return this.getProducts();
    }

    return this.products().filter((product) => {
      const categoryName = this.categoryStore.findById(product.categoryId)?.name ?? '';
      return (
        product.name.toLowerCase().includes(keyword) ||
        product.sku.toLowerCase().includes(keyword) ||
        product.barcode.includes(keyword) ||
        categoryName.toLowerCase().includes(keyword)
      );
    });
  }

  canAddQuantity(productId: number, cartQuantity: number, addQty = 1): boolean {
    const product = this.findById(productId);
    if (!product || !product.active) {
      return false;
    }
    return product.stock >= cartQuantity + addQty;
  }

  createProduct(payload: ProductPayload): Product {
    const id = this.getNextProductId();
    const normalized = this.normalizePayload(payload, id);
    const product: Product = { id, ...normalized };
    this.products.update((items) => [...items, product]);

    if (this.http) {
      this.http.post<Product>(`${environment.apiUrl}/products`, {
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        price: product.price,
        costPrice: product.costPrice ?? 0,
        categoryId: product.categoryId,
        imageUrl: product.imageUrl,
        stock: product.stock,
        minStock: product.minStock,
        active: product.active,
      }).subscribe({
        next: (created) => {
          this.products.update((items) =>
            items.map((it) => (it.id === product.id ? { ...it, id: created.id } : it)),
          );
        },
        error: (err) => console.error('Failed to create product on API:', err),
      });
    }

    return product;
  }

  updateProduct(id: number, payload: ProductPayload): Product | undefined {
    let updated: Product | undefined;
    const normalized = this.normalizePayload(payload, id, id);
    this.products.update((items) =>
      items.map((item) => {
        if (item.id !== id) {
          return item;
        }
        updated = { id, ...normalized };
        return updated;
      }),
    );

    if (this.http && updated) {
      this.http.put<Product>(`${environment.apiUrl}/products/${id}`, {
        sku: updated.sku,
        barcode: updated.barcode,
        name: updated.name,
        price: updated.price,
        costPrice: updated.costPrice ?? 0,
        categoryId: updated.categoryId,
        imageUrl: updated.imageUrl,
        stock: updated.stock,
        minStock: updated.minStock,
        active: updated.active,
      }).subscribe({
        error: (err) => console.error('Failed to update product on API:', err),
      });
    }

    return updated;
  }

  suggestNextSku(): string {
    return suggestNextSku(this.products().map((product) => product.sku));
  }

  previewBarcode(sku: string, productId?: number): string {
    const id = productId ?? this.getNextProductId();
    return this.generateUniqueBarcode(sku, id);
  }

  bulkCreateProducts(
    rows: ParsedBulkProductRow[],
    defaultCategoryId: number,
  ): BulkCreateProductsResult {
    const errors: string[] = [];
    let created = 0;

    for (const row of rows) {
      const categoryId = this.resolveCategoryId(row.categoryName, defaultCategoryId);
      if (!categoryId) {
        errors.push(`บรรทัด ${row.line}: ไม่พบหมวด "${row.categoryName}"`);
        continue;
      }

      if (this.isSkuUsed(row.sku)) {
        errors.push(`บรรทัด ${row.line}: SKU "${row.sku}" ซ้ำ`);
        continue;
      }

      try {
        this.createProduct({
          sku: row.sku,
          barcode: '',
          name: row.name,
          categoryId,
          stock: row.stock,
          price: row.price,
          minStock: 10,
          active: true,
        });
        created++;
      } catch (error) {
        errors.push(
          `บรรทัด ${row.line}: ${error instanceof Error ? error.message : 'เพิ่มสินค้าไม่สำเร็จ'}`,
        );
      }
    }

    if (this.http && rows.length > 0) {
      this.http.post<{ created: number; errors: string[] }>(`${environment.apiUrl}/products/bulk`, {
        defaultCategoryId,
        rows: rows.map((r) => ({
          sku: r.sku,
          name: r.name,
          categoryName: r.categoryName,
          stock: r.stock,
          price: r.price,
        })),
      }).subscribe({
        next: () => this.loadProducts(),
        error: (err) => console.error('Failed to sync bulk import to API:', err),
      });
    }

    return { created, errors };
  }

  private normalizePayload(payload: ProductPayload, productId: number, excludeId?: number): ProductPayload {
    const barcode = payload.barcode?.trim()
      ? payload.barcode.trim()
      : this.generateUniqueBarcode(payload.sku, productId, excludeId);

    if (this.isBarcodeUsed(barcode, excludeId)) {
      throw new Error(`บาร์โค้ด ${barcode} ถูกใช้แล้ว`);
    }

    return {
      ...payload,
      barcode,
      price: payload.price ?? 0,
      costPrice: payload.costPrice ?? 0,
      imageUrl: payload.imageUrl?.trim() || undefined,
    };
  }

  private generateUniqueBarcode(sku: string, productId: number, excludeId?: number): string {
    const candidates = [
      generateBarcodeFromSku(sku, productId),
      generateBarcodeFromSku(String(productId), productId),
    ];

    for (const barcode of candidates) {
      if (!this.isBarcodeUsed(barcode, excludeId)) {
        return barcode;
      }
    }

    for (let offset = 0; offset < 100; offset++) {
      const barcode = generateBarcodeFromSku(String(productId + offset), productId + offset);
      if (!this.isBarcodeUsed(barcode, excludeId)) {
        return barcode;
      }
    }

    throw new Error('สร้างบาร์โค้ดไม่สำเร็จ');
  }

  private isSkuUsed(sku: string, excludeId?: number): boolean {
    const normalized = sku.trim().toLowerCase();
    return this.products().some(
      (product) => product.sku.trim().toLowerCase() === normalized && product.id !== excludeId,
    );
  }

  private isBarcodeUsed(barcode: string, excludeId?: number): boolean {
    return this.products().some(
      (product) => product.barcode === barcode && product.id !== excludeId,
    );
  }

  private resolveCategoryId(categoryName: string | undefined, defaultCategoryId: number): number | undefined {
    if (!categoryName) {
      return defaultCategoryId || undefined;
    }

    const byName = this.categoryStore.findByName(categoryName);
    if (byName) {
      return byName.id;
    }

    const asId = Number(categoryName);
    if (!Number.isNaN(asId) && this.categoryStore.findById(asId)) {
      return asId;
    }

    return undefined;
  }

  deleteProduct(id: number): boolean {
    const exists = this.products().some((item) => item.id === id);
    if (!exists) {
      return false;
    }
    this.products.update((items) => items.filter((item) => item.id !== id));

    if (this.http) {
      this.http.delete<void>(`${environment.apiUrl}/products/${id}`).subscribe({
        error: (err) => console.error('Failed to delete product on API:', err),
      });
    }

    return true;
  }

  adjustStock(request: StockAdjustRequest, createdBy: string): Product | undefined {
    if (request.quantity === 0) {
      return undefined;
    }

    let updated: Product | undefined;
    this.products.update((items) =>
      items.map((item) => {
        if (item.id !== request.productId) {
          return item;
        }

        const stockAfter = item.stock + request.quantity;
        if (stockAfter < 0) {
          return item;
        }

        updated = { ...item, stock: stockAfter };
        this.recordMovement({
          productId: item.id,
          productName: item.name,
          type: request.type,
          quantity: request.quantity,
          stockBefore: item.stock,
          stockAfter,
          note: request.note,
          createdBy,
        });
        return updated;
      }),
    );

    if (this.http && updated && request.type !== 'SALE') {
      this.http.post<Product>(`${environment.apiUrl}/stock/adjust`, {
        productId: request.productId,
        quantity: request.quantity,
        type: request.type,
        note: request.note,
      }).subscribe({
        next: (serverProduct) => {
          this.products.update((items) =>
            items.map((it) => (it.id === request.productId ? { ...it, stock: serverProduct.stock } : it)),
          );
          this.loadMovements();
        },
        error: (err) => console.error('Failed to adjust stock on API:', err),
      });
    }

    return updated;
  }

  addStock(productId: number, quantity: number, createdBy: string, note?: string): Product | undefined {
    return this.adjustStock(
      { productId, quantity, type: 'POS_MANUAL', note },
      createdBy,
    );
  }

  private recordMovement(data: Omit<StockMovement, 'id' | 'createdAt'>): void {
    const movement: StockMovement = {
      id: this.movementId++,
      createdAt: new Date().toISOString(),
      ...data,
    };
    this.movements.update((items) => [movement, ...items]);
  }

  private getNextProductId(): number {
    return this.products().reduce((max, product) => Math.max(max, product.id), 0) + 1;
  }
}
