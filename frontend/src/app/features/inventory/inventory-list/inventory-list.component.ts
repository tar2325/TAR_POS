import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { AuthService } from '../../../core/services/auth.service';
import { ProductStoreService } from '../../../core/services/product-store.service';
import { Product } from '../../../models/product.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { InventoryAdjustDialogComponent } from '../inventory-adjust-dialog/inventory-adjust-dialog.component';

@Component({
  selector: 'app-inventory-list',
  imports: [
    DatePipe, FormsModule, PageHeaderComponent,
    MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatTabsModule, MatDialogModule,
  ],
  templateUrl: './inventory-list.component.html',
  styleUrl: './inventory-list.component.scss',
})
export class InventoryListComponent implements OnInit {
  private readonly store = inject(ProductStoreService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  protected readonly breadcrumbs = [
    { label: 'แดชบอร์ด', route: '/dashboard' },
    { label: 'สต็อกสินค้า' },
  ];
  protected readonly products = signal<Product[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly stockColumns = ['barcode', 'name', 'stock', 'minStock', 'status', 'actions'];
  protected readonly movementColumns = ['createdAt', 'productName', 'type', 'quantity', 'stockAfter', 'createdBy'];
  protected readonly movements = this.store.movementList;
  protected readonly canAdjust = computed(() => this.authService.hasRole(['ADMIN', 'MANAGER']));

  ngOnInit(): void {
    this.loadProducts();
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.loadProducts();
  }

  isLowStock(product: Product): boolean {
    return product.stock <= product.minStock;
  }

  openAdjust(product: Product): void {
    const ref = this.dialog.open(InventoryAdjustDialogComponent, {
      width: '420px',
      data: { product },
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.loadProducts();
    });
  }

  private loadProducts(): void {
    this.products.set(this.store.search(this.searchQuery()));
  }
}
