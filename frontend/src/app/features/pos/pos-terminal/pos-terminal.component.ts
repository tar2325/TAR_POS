import { AfterViewInit, Component, computed, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/services/auth.service';
import { ProductStoreService } from '../../../core/services/product-store.service';
import { CategoryStoreService } from '../../../core/services/category-store.service';
import { SaleStoreService } from '../../../core/services/sale-store.service';
import { getProductImageUrl } from '../../../core/utils/product-image.util';
import { Product, StockAdjustDialogData } from '../../../models/product.model';
import { CartService } from '../services/cart.service';
import { BarcodeInputComponent } from '../components/barcode-input/barcode-input.component';
import { CartPanelComponent } from '../components/cart-panel/cart-panel.component';
import { StockAdjustDialogComponent } from '../components/stock-adjust-dialog/stock-adjust-dialog.component';
import { ReceiptDialogComponent } from '../components/receipt-dialog/receipt-dialog.component';
import { ReceiptData } from '../../../models/receipt.model';

@Component({
  selector: 'app-pos-terminal',
  imports: [
    CurrencyPipe, DatePipe, RouterLink, BarcodeInputComponent, CartPanelComponent,
    MatSnackBarModule, MatIconModule, MatButtonModule,
  ],
  templateUrl: './pos-terminal.component.html',
  styleUrl: './pos-terminal.component.scss',
})
export class PosTerminalComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly authService = inject(AuthService);
  private readonly productStore = inject(ProductStoreService);
  private readonly categoryStore = inject(CategoryStoreService);
  private readonly saleStore = inject(SaleStoreService);
  private readonly cartService = inject(CartService);
  private readonly barcodeInput = viewChild(BarcodeInputComponent);

  protected readonly cashierName = computed(() => this.authService.currentUser()?.displayName ?? '');
  protected readonly cartItems = this.cartService.cartItems;
  protected readonly summary = this.cartService.summary;
  protected readonly categories = this.categoryStore.activeCategories;
  protected readonly selectedCategory = signal<number | 'all'>('all');
  protected readonly imageErrors = signal<ReadonlySet<number>>(new Set());
  protected readonly filteredProducts = computed(() => {
    const category = this.selectedCategory();
    const products = this.productStore.activeProducts();
    if (category === 'all') {
      return products;
    }
    return products.filter((product) => product.categoryId === category);
  });
  protected readonly now = signal(new Date());
  protected readonly mobileView = signal<'products' | 'cart'>('products');

  setMobileView(view: 'products' | 'cart'): void {
    this.mobileView.set(view);
  }

  ngAfterViewInit(): void {
    this.focusBarcode();
    interval(30_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.now.set(new Date()));
  }

  onBarcodeScanned(barcode: string): void {
    const product = this.productStore.findByBarcode(barcode);
    if (!product) {
      this.toast('ไม่พบสินค้าจากบาร์โค้ดนี้', 'error');
      return;
    }
    this.tryAdd(product);
  }

  onProductClick(product: Product): void {
    this.tryAdd(product);
  }

  selectCategory(category: number | 'all'): void {
    this.selectedCategory.set(category);
  }

  productImage(product: Product): string {
    return getProductImageUrl(product) ?? '';
  }

  categoryName(categoryId: number): string {
    return this.categoryStore.findById(categoryId)?.name ?? '';
  }

  categoryIcon(categoryId: number): string {
    return this.categoryStore.findById(categoryId)?.icon ?? 'category';
  }

  showProductImage(product: Product): boolean {
    return !this.imageErrors().has(product.id);
  }

  onImageError(productId: number): void {
    this.imageErrors.update((ids) => new Set([...ids, productId]));
  }

  onIncrease(productId: number): void {
    const product = this.productStore.findById(productId);
    if (!product) return;
    if (this.cartService.increaseQuantity(productId)) {
      this.cartService.syncProductData();
      this.focusBarcode();
      return;
    }
    this.openStockDialog(product, this.cartService.getQuantity(productId) + 1);
  }

  onDecrease(productId: number): void {
    this.cartService.decreaseQuantity(productId);
    this.focusBarcode();
  }

  onRemove(productId: number): void {
    this.cartService.removeItem(productId);
    this.focusBarcode();
  }

  onClear(): void {
    this.cartService.clear();
    this.focusBarcode();
  }

  onCheckout(): void {
    const items = this.cartItems();
    if (!items.length) return;

    const receipt: ReceiptData = {
      receiptNo: `RCP-${Date.now().toString().slice(-8)}`,
      createdAt: new Date(),
      cashierName: this.cashierName() || 'พนักงานขาย',
      items: structuredClone(items),
      summary: { ...this.summary() },
    };

    this.dialog
      .open(ReceiptDialogComponent, {
        width: '480px',
        maxWidth: '95vw',
        panelClass: 'receipt-dialog-panel',
        data: receipt,
      })
      .afterClosed()
      .subscribe(() => {
        this.saleStore.recordSale(receipt, this.cashierName() || 'พนักงานขาย');
        this.cartService.clear();
        this.toast('ชำระเงินและบันทึกการขายสำเร็จ', 'success');
        this.focusBarcode();
      });
  }

  private tryAdd(product: Product): void {
    const qty = this.cartService.getQuantity(product.id);
    if (this.productStore.canAddQuantity(product.id, qty, 1)) {
      this.cartService.addProduct(product);
      this.cartService.syncProductData();
      this.toast(`เพิ่ม ${product.name}`, 'success');
      this.focusBarcode();
      return;
    }
    this.openStockDialog(product, qty + 1);
  }

  private openStockDialog(product: Product, neededQty: number): void {
    const data: StockAdjustDialogData = {
      product,
      neededQty,
      message: `สินค้า "${product.name}" สต็อกไม่พอ — เพิ่มสต็อกด้วยตนเอง`,
    };
    this.dialog.open(StockAdjustDialogComponent, { width: '420px', disableClose: true, data })
      .afterClosed()
      .subscribe((result) => {
        if (!result) {
          this.focusBarcode();
          return;
        }
        this.cartService.syncProductData();
        const latest = this.productStore.findById(product.id);
        if (latest && this.cartService.addProduct(latest)) {
          this.cartService.syncProductData();
          this.toast(`เพิ่มสต็อก ${result.addedQty} ชิ้น และใส่ตะกร้าแล้ว`, 'success');
        }
        this.focusBarcode();
      });
  }

  private focusBarcode(): void {
    queueMicrotask(() => this.barcodeInput()?.focus());
  }

  private toast(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'ปิด', {
      duration: 2500,
      panelClass: type === 'error' ? 'snack-error' : 'snack-success',
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }
}
