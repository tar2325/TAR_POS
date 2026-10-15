import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { CategoryStoreService } from '../../../core/services/category-store.service';
import { ProductStoreService } from '../../../core/services/product-store.service';
import { Category } from '../../../models/category.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-category-list',
  imports: [
    RouterLink,
    PageHeaderComponent,
    LoadingComponent,
    EmptyStateComponent,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
  ],
  templateUrl: './category-list.component.html',
  styleUrl: './category-list.component.scss',
})
export class CategoryListComponent implements OnInit {
  private readonly categoryStore = inject(CategoryStoreService);
  private readonly productStore = inject(ProductStoreService);
  private readonly authService = inject(AuthService);

  protected readonly breadcrumbs = [
    { label: 'แดชบอร์ด', route: '/dashboard' },
    { label: 'หมวดหมู่' },
  ];
  protected readonly loading = signal(true);
  protected readonly categories = signal<Category[]>([]);
  protected readonly canEdit = computed(() => this.authService.hasRole(['ADMIN', 'MANAGER']));
  protected readonly displayedColumns = ['icon', 'name', 'sortOrder', 'products', 'status', 'actions'];

  ngOnInit(): void {
    this.loadCategories();
  }

  productCount(categoryId: number): number {
    return this.productStore.countByCategoryId(categoryId);
  }

  deleteCategory(category: Category): void {
    const count = this.productCount(category.id);
    if (count > 0) {
      alert(`ไม่สามารถลบหมวด "${category.name}" ได้ — มีสินค้า ${count} รายการ`);
      return;
    }
    if (!confirm(`ลบหมวดหมู่ "${category.name}"?`)) {
      return;
    }
    this.categoryStore.deleteCategory(category.id);
    this.loadCategories();
  }

  private loadCategories(): void {
    this.categories.set(this.categoryStore.getCategories());
    this.loading.set(false);
  }
}
