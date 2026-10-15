import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ProductStoreService } from '../../../core/services/product-store.service';
import { SaleStoreService } from '../../../core/services/sale-store.service';
import { AuthService } from '../../../core/services/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    PageHeaderComponent,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    RouterLink,
    CurrencyPipe,
    DecimalPipe,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly productStore = inject(ProductStoreService);
  private readonly saleStore = inject(SaleStoreService);
  private readonly authService = inject(AuthService);

  protected readonly breadcrumbs = [{ label: 'แดชบอร์ด' }];
  protected readonly lowStockCount = () => this.productStore.lowStockProducts().length;

  protected readonly isManagerOrAdmin = computed(() => {
    const role = this.authService.currentUser()?.role;
    return role === 'ADMIN' || role === 'MANAGER';
  });

  protected readonly todaySummary = this.saleStore.todaySummary;

  protected readonly topSellingProducts = computed(() => {
    return this.todaySummary().products.slice(0, 5);
  });
}
