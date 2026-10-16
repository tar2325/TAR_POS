import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProductStoreService } from '../../../../core/services/product-store.service';
import { CategoryStoreService } from '../../../../core/services/category-store.service';
import { ProductLookupService } from '../../../../core/services/product-lookup.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Product } from '../../../../models/product.model';
import { getProductImageUrl } from '../../../../core/utils/product-image.util';

export interface QuickScanDialogData {
  barcode?: string;
  productId?: number;
}

export interface QuickScanDialogResult {
  action: 'created' | 'restocked';
  product: Product;
  quantityAdded?: number;
}

@Component({
  selector: 'app-product-quick-scan-dialog',
  imports: [
    FormsModule,
    CurrencyPipe,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './product-quick-scan-dialog.component.html',
  styleUrl: './product-quick-scan-dialog.component.scss',
})
export class ProductQuickScanDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<ProductQuickScanDialogComponent>);
  private readonly dialogData = inject<QuickScanDialogData>(MAT_DIALOG_DATA, { optional: true });
  private readonly productStore = inject(ProductStoreService);
  private readonly categoryStore = inject(CategoryStoreService);
  private readonly lookupService = inject(ProductLookupService);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  private readonly barcodeInputRef = viewChild<ElementRef<HTMLInputElement>>('barcodeInput');
  private readonly createNameInputRef = viewChild<ElementRef<HTMLInputElement>>('createNameInput');
  private readonly restockQtyInputRef = viewChild<ElementRef<HTMLInputElement>>('restockQtyInput');

  protected readonly categories = this.categoryStore.activeCategories;
  protected readonly currentBarcode = signal('');
  protected readonly isLookingUp = signal(false);
  protected readonly lookupInfo = signal<string | null>(null);

  // Mode: 'idle' (waiting for scan) | 'create' (new product) | 'restock' (existing product)
  protected readonly mode = signal<'idle' | 'create' | 'restock'>('idle');

  // Existing product when in 'restock' mode
  protected readonly existingProduct = signal<Product | null>(null);
  protected readonly restockQty = signal<number>(1);
  protected readonly editPrice = signal<number>(0);
  protected readonly editCostPrice = signal<number>(0);

  // New product form fields when in 'create' mode
  protected readonly newSku = signal('');
  protected readonly newName = signal('');
  protected readonly newCategoryId = signal<number>(0);
  protected readonly newPrice = signal<number>(0);
  protected readonly newCostPrice = signal<number>(0);
  protected readonly newStock = signal<number>(1);
  protected readonly newMinStock = signal<number>(10);
  protected readonly newImageUrl = signal('');

  protected readonly isNameValid = computed(() => this.newName().trim().length > 0);
  protected readonly isSkuValid = computed(() => this.newSku().trim().length > 0);

  ngOnInit(): void {
    const defaultCatId = this.categories()[0]?.id ?? 1;
    this.newCategoryId.set(defaultCatId);

    if (this.dialogData?.productId) {
      const prod = this.productStore.findById(this.dialogData.productId);
      if (prod) {
        this.selectExistingProduct(prod);
        return;
      }
    }

    const initialCode = this.dialogData?.barcode?.trim();
    if (initialCode) {
      this.currentBarcode.set(initialCode);
      this.processBarcode(initialCode);
    } else {
      this.mode.set('idle');
      setTimeout(() => this.barcodeInputRef()?.nativeElement?.focus(), 100);
    }
  }

  processBarcode(rawCode: string): void {
    const code = rawCode.trim();
    if (!code) {
      return;
    }

    this.currentBarcode.set(code);
    const existing = this.productStore.findByBarcode(code);

    if (existing) {
      this.selectExistingProduct(existing);
    } else {
      this.setupCreateMode(code);
    }
  }

  onBarcodeKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      const code = this.currentBarcode().trim();
      if (code) {
        this.processBarcode(code);
      }
    }
  }

  private selectExistingProduct(product: Product): void {
    this.existingProduct.set(product);
    this.currentBarcode.set(product.barcode);
    this.restockQty.set(1);
    this.editPrice.set(product.price);
    this.editCostPrice.set(product.costPrice ?? 0);
    this.mode.set('restock');

    setTimeout(() => {
      this.restockQtyInputRef()?.nativeElement?.focus();
      this.restockQtyInputRef()?.nativeElement?.select();
    }, 100);
  }

  private setupCreateMode(barcode: string): void {
    this.mode.set('create');
    this.existingProduct.set(null);
    this.newSku.set(this.productStore.suggestNextSku());
    this.newName.set('');
    this.newPrice.set(0);
    this.newCostPrice.set(0);
    this.newStock.set(1);
    this.newMinStock.set(10);
    this.newImageUrl.set('');
    this.lookupInfo.set(null);

    // Default category fallback
    if (!this.newCategoryId() && this.categories().length > 0) {
      this.newCategoryId.set(this.categories()[0].id);
    }

    if (barcode.length >= 8) {
      this.isLookingUp.set(true);
      this.lookupService.lookupByBarcode(barcode).subscribe({
        next: (res) => {
          this.isLookingUp.set(false);
          if (res.status === 'FOUND' && res.suggestion) {
            this.newName.set(res.suggestion.name);
            if (res.suggestion.imageUrl) {
              this.newImageUrl.set(res.suggestion.imageUrl);
            }
            if (res.suggestion.categoryId) {
              this.newCategoryId.set(res.suggestion.categoryId);
            }
            this.lookupInfo.set(`พบข้อมูล: ${res.suggestion.name} (${res.originCountry || res.suggestion.source || 'ออนไลน์'})`);
          } else {
            this.lookupInfo.set(res.message || 'ไม่พบข้อมูลออนไลน์ สามารถกรอกชื่อและราคาเองได้ทันที');
          }
          setTimeout(() => this.focusAppropriateField(), 80);
        },
        error: () => {
          this.isLookingUp.set(false);
          setTimeout(() => this.focusAppropriateField(), 80);
        },
      });
    } else {
      setTimeout(() => this.focusAppropriateField(), 80);
    }
  }

  private focusAppropriateField(): void {
    if (!this.newName().trim()) {
      this.createNameInputRef()?.nativeElement?.focus();
    }
  }

  addQuickQty(amount: number): void {
    this.restockQty.update((prev) => Math.max(1, prev + amount));
  }

  setQuickQty(amount: number): void {
    this.restockQty.set(amount);
  }

  saveRestock(andScanNext = false): void {
    const product = this.existingProduct();
    if (!product) return;

    const qty = Math.max(0, Number(this.restockQty()) || 0);
    const cashierName = this.authService.currentUser()?.displayName ?? 'พนักงานคลัง';

    if (qty > 0) {
      this.productStore.adjustStock(
        {
          productId: product.id,
          quantity: qty,
          type: 'RECEIVE',
          note: `รับสต็อกด่วน (${product.name})`,
        },
        cashierName
      );
    }

    // Check if price or cost changed
    const newP = Number(this.editPrice()) || 0;
    const newC = Number(this.editCostPrice()) || 0;
    if (newP !== product.price || newC !== (product.costPrice ?? 0)) {
      this.productStore.updateProduct(product.id, {
        ...product,
        price: newP,
        costPrice: newC,
      });
    }

    const updated = this.productStore.findById(product.id) ?? product;
    this.snackBar.open(`✅ รับสต็อก "${updated.name}" +${qty} ชิ้น สำเร็จ! (คงเหลือ ${updated.stock})`, 'ปิด', {
      duration: 3000,
    });

    if (andScanNext) {
      this.resetToIdleScan();
    } else {
      this.dialogRef.close({ action: 'restocked', product: updated, quantityAdded: qty });
    }
  }

  saveCreate(andScanNext = false): void {
    if (!this.isNameValid() || !this.isSkuValid()) {
      return;
    }

    const sku = this.newSku().trim();
    const barcode = this.currentBarcode().trim();
    const name = this.newName().trim();
    const price = Math.max(0, Number(this.newPrice()) || 0);
    const costPrice = Math.max(0, Number(this.newCostPrice()) || 0);
    const stock = Math.max(0, Number(this.newStock()) || 0);
    const minStock = Math.max(0, Number(this.newMinStock()) || 10);
    const categoryId = this.newCategoryId() || (this.categories()[0]?.id ?? 1);
    const imageUrl = this.newImageUrl().trim() || undefined;

    try {
      const created = this.productStore.createProduct({
        sku,
        barcode,
        name,
        price,
        costPrice,
        stock,
        minStock,
        categoryId,
        imageUrl,
        active: true,
      });

      this.snackBar.open(`🎉 เพิ่มสินค้าใหม่ "${created.name}" เรียบร้อยแล้ว!`, 'ปิด', { duration: 3000 });

      if (andScanNext) {
        this.resetToIdleScan();
      } else {
        this.dialogRef.close({ action: 'created', product: created });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกสินค้า');
    }
  }

  resetToIdleScan(): void {
    this.mode.set('idle');
    this.currentBarcode.set('');
    this.existingProduct.set(null);
    this.lookupInfo.set(null);
    setTimeout(() => {
      this.barcodeInputRef()?.nativeElement?.focus();
      this.barcodeInputRef()?.nativeElement?.select();
    }, 100);
  }

  productImage(product: Product): string {
    return getProductImageUrl(product) ?? '';
  }

  categoryName(categoryId: number): string {
    return this.categoryStore.findById(categoryId)?.name ?? '-';
  }

  close(): void {
    this.dialogRef.close();
  }
}
