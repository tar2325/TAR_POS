import { Component, computed, inject, OnInit, signal } from '@angular/core';
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
import { ProductStoreService } from '../../../core/services/product-store.service';
import { CategoryStoreService } from '../../../core/services/category-store.service';
import { getProductImageUrl } from '../../../core/utils/product-image.util';
import { Product } from '../../../models/product.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { AuthService } from '../../../core/services/auth.service';
import { ProductBulkImportDialogComponent } from '../components/product-bulk-import-dialog/product-bulk-import-dialog.component';

@Component({
  selector: 'app-product-list',
  imports: [
    CurrencyPipe, FormsModule, RouterLink, PageHeaderComponent, LoadingComponent, EmptyStateComponent,
    MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSnackBarModule,
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

  protected readonly breadcrumbs = [
    { label: 'แดชบอร์ด', route: '/dashboard' },
    { label: 'สินค้า' },
  ];
  protected readonly loading = signal(true);
  protected readonly products = signal<Product[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly canEdit = computed(() => this.authService.hasRole(['ADMIN', 'MANAGER']));
  protected readonly displayedColumns = ['image', 'sku', 'name', 'category', 'price', 'stock', 'actions'];

  ngOnInit(): void {
    this.loadProducts();
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.products.set(this.store.search(query));
  }

  deleteProduct(product: Product): void {
    if (!confirm(`ลบสินค้า "${product.name}"?`)) return;
    this.store.deleteProduct(product.id);
    this.onSearch(this.searchQuery());
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
        this.loadProducts();
        const message =
          result.errors.length > 0
            ? `นำเข้า ${result.created} รายการ (มีข้อผิดพลาด ${result.errors.length} บรรทัด)`
            : `นำเข้าสินค้า ${result.created} รายการสำเร็จ`;
        this.snackBar.open(message, 'ปิด', { duration: 4000 });
      });
  }

  private loadProducts(): void {
    this.products.set(this.store.getProducts());
    this.loading.set(false);
  }
}
