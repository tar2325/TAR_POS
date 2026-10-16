import { Component, computed, ElementRef, HostListener, inject, OnInit, signal, viewChild } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProductStoreService } from '../../../core/services/product-store.service';
import { CategoryStoreService } from '../../../core/services/category-store.service';
import { getProductImageUrl } from '../../../core/utils/product-image.util';
import { Product } from '../../../models/product.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { AuthService } from '../../../core/services/auth.service';
import { ProductBulkImportDialogComponent } from '../components/product-bulk-import-dialog/product-bulk-import-dialog.component';
import {
  ProductQuickScanDialogComponent,
  QuickScanDialogResult,
} from '../components/product-quick-scan-dialog/product-quick-scan-dialog.component';

@Component({
  selector: 'app-product-list',
  imports: [
    CurrencyPipe,
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    LoadingComponent,
    EmptyStateComponent,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss',
})
export class ProductListComponent implements OnInit {
  private readonly store = inject(ProductStoreService);
  private readonly categoryStore = inject(CategoryStoreService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  private readonly scannerInputRef = viewChild<ElementRef<HTMLInputElement>>('scannerInput');

  protected readonly breadcrumbs = [
    { label: 'แดชบอร์ด', route: '/dashboard' },
    { label: 'สินค้า' },
  ];
  protected readonly loading = signal(true);
  protected readonly searchQuery = signal('');
  protected readonly scanBarcodeInput = signal('');
  protected readonly fastRestockMode = signal(false);

  protected readonly canEdit = computed(() => this.authService.hasRole(['ADMIN', 'MANAGER']));
  protected readonly displayedColumns = ['image', 'sku', 'name', 'category', 'price', 'stock', 'actions'];

  // Reactive product list derived from Store signals
  protected readonly products = computed(() => {
    const list = this.store.productList();
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.barcode.includes(query)
    );
  });

  private barcodeBuffer = '';
  private lastKeyTime = 0;

  @HostListener('window:keydown', ['$event'])
  handleGlobalKeydown(event: KeyboardEvent): void {
    if (event.key === 'F2') {
      event.preventDefault();
      this.focusScanner();
      return;
    }

    // Ignore if user is currently typing in an input, textarea, or select
    const activeEl = document.activeElement;
    const isInputActive =
      activeEl instanceof HTMLInputElement ||
      activeEl instanceof HTMLTextAreaElement ||
      activeEl?.getAttribute('contenteditable') === 'true';

    if (isInputActive) {
      return;
    }

    const now = Date.now();
    if (now - this.lastKeyTime > 250) {
      this.barcodeBuffer = '';
    }
    this.lastKeyTime = now;

    if (event.key === 'Enter') {
      const code = this.barcodeBuffer.trim();
      this.barcodeBuffer = '';
      if (code.length >= 4 && this.canEdit()) {
        event.preventDefault();
        this.onBarcodeScan(code);
      }
    } else if (event.key.length === 1) {
      this.barcodeBuffer += event.key;
    }
  }

  ngOnInit(): void {
    this.loading.set(false);
  }

  focusScanner(): void {
    this.scannerInputRef()?.nativeElement?.focus();
    this.scannerInputRef()?.nativeElement?.select();
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
  }

  onBarcodeScan(codeOverride?: string): void {
    const code = (codeOverride ?? this.scanBarcodeInput()).trim();
    if (!code) {
      return;
    }

    this.scanBarcodeInput.set('');

    // Case 1: Fast Restock Mode is ON (+1 Auto) and product already exists
    const existing = this.store.findByBarcode(code);
    if (this.fastRestockMode() && existing) {
      const cashierName = this.authService.currentUser()?.displayName ?? 'พนักงานคลัง';
      this.store.adjustStock(
        {
          productId: existing.id,
          quantity: 1,
          type: 'RECEIVE',
          note: 'ยิงบาร์โค้ดรับสต็อกด่วน (+1)',
        },
        cashierName
      );

      const updated = this.store.findById(existing.id) ?? existing;
      this.snackBar.open(`⚡ รับสต็อก "${updated.name}" +1 ชิ้น สำเร็จ! (คงเหลือ ${updated.stock})`, 'ปิด', {
        duration: 2500,
      });
      this.focusScanner();
      return;
    }

    // Case 2: Open Quick Scan Dialog (New Product Add or Restock/Edit Modal)
    this.dialog
      .open(ProductQuickScanDialogComponent, {
        width: '680px',
        maxWidth: '95vw',
        data: { barcode: code },
      })
      .afterClosed()
      .subscribe((result?: QuickScanDialogResult) => {
        this.focusScanner();
      });
  }

  openQuickRestock(product: Product): void {
    this.dialog
      .open(ProductQuickScanDialogComponent, {
        width: '680px',
        maxWidth: '95vw',
        data: { productId: product.id },
      })
      .afterClosed()
      .subscribe(() => {
        this.focusScanner();
      });
  }

  openQuickAddDialog(): void {
    this.dialog
      .open(ProductQuickScanDialogComponent, {
        width: '680px',
        maxWidth: '95vw',
      })
      .afterClosed()
      .subscribe(() => {
        this.focusScanner();
      });
  }

  deleteProduct(product: Product): void {
    if (!confirm(`ลบสินค้า "${product.name}"?`)) return;
    this.store.deleteProduct(product.id);
    this.snackBar.open(`ลบสินค้า "${product.name}" แล้ว`, 'ปิด', { duration: 3000 });
  }

  productImage(product: Product): string {
    return getProductImageUrl(product) ?? '';
  }

  categoryName(categoryId: number): string {
    return this.categoryStore.findById(categoryId)?.name ?? '-';
  }

  openBulkImport(): void {
    this.dialog
      .open(ProductBulkImportDialogComponent, { width: '640px', maxWidth: '95vw' })
      .afterClosed()
      .subscribe((result?: { created: number; errors: string[] }) => {
        if (!result) {
          return;
        }
        const message =
          result.errors.length > 0
            ? `นำเข้า ${result.created} รายการ (มีข้อผิดพลาด ${result.errors.length} บรรทัด)`
            : `นำเข้าสินค้า ${result.created} รายการสำเร็จ`;
        this.snackBar.open(message, 'ปิด', { duration: 4000 });
      });
  }
}
