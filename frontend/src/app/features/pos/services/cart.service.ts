import { Injectable, computed, inject, signal } from '@angular/core';
import { CartItem, CartSummary } from '../../../models/cart-item.model';
import { Product } from '../../../models/product.model';
import { ProductStoreService } from '../../../core/services/product-store.service';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly productStore = inject(ProductStoreService);
  private readonly items = signal<CartItem[]>([]);

  readonly cartItems = this.items.asReadonly();

  readonly summary = computed<CartSummary>(() => {
    const items = this.items();
    const subtotal = items.reduce((t, i) => t + i.product.price * i.quantity, 0);
    return {
      subtotal,
      discount: 0,
      tax: 0,
      total: subtotal,
      itemCount: items.reduce((c, i) => c + i.quantity, 0),
    };
  });

  getQuantity(productId: number): number {
    return this.items().find((i) => i.product.id === productId)?.quantity ?? 0;
  }

  syncProductData(): void {
    this.items.update((items) =>
      items
        .map((item) => {
          const latest = this.productStore.findById(item.product.id);
          return latest ? { ...item, product: latest } : item;
        })
        .filter((i) => i.quantity > 0),
    );
  }

  addProduct(product: Product): boolean {
    const qty = this.getQuantity(product.id);
    if (!this.productStore.canAddQuantity(product.id, qty, 1)) return false;
    this.items.update((items) => {
      const existing = items.find((i) => i.product.id === product.id);
      if (existing) {
        return items.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...items, { product, quantity: 1 }];
    });
    return true;
  }

  increaseQuantity(productId: number): boolean {
    const qty = this.getQuantity(productId);
    if (!this.productStore.canAddQuantity(productId, qty, 1)) return false;
    this.items.update((items) =>
      items.map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity + 1 } : i)),
    );
    return true;
  }

  decreaseQuantity(productId: number): void {
    this.items.update((items) =>
      items
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0),
    );
  }

  removeItem(productId: number): void {
    this.items.update((items) => items.filter((i) => i.product.id !== productId));
  }

  clear(): void {
    this.items.set([]);
  }
}
