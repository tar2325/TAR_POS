import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SaleStoreService } from '../../../core/services/sale-store.service';
import { DailySalesSummary, ProductSalesSummary, ReportPeriod, SaleOrder } from '../../../models/sale.model';

@Component({
  selector: 'app-sales-report',
  imports: [
    PageHeaderComponent,
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    CurrencyPipe,
    DecimalPipe,
    DatePipe,
  ],
  templateUrl: './sales-report.component.html',
  styleUrl: './sales-report.component.scss',
})
export class SalesReportComponent {
  private readonly saleStore = inject(SaleStoreService);

  protected readonly breadcrumbs = [
    { label: 'แดชบอร์ด', route: '/dashboard' },
    { label: 'รายงานการขายและกำไร' },
  ];

  protected readonly selectedPeriod = signal<ReportPeriod>('today');
  protected readonly customStart = signal<string>(new Date().toISOString().slice(0, 10));
  protected readonly customEnd = signal<string>(new Date().toISOString().slice(0, 10));
  protected readonly searchQuery = signal<string>('');
  protected readonly selectedOrder = signal<SaleOrder | null>(null);

  protected readonly productColumns = [
    'index',
    'productName',
    'categoryName',
    'quantitySold',
    'totalSales',
    'totalCost',
    'grossProfit',
    'profitMarginPercent',
  ];

  protected readonly orderColumns = [
    'receiptNo',
    'createdAt',
    'cashierName',
    'itemCount',
    'total',
    'totalCost',
    'grossProfit',
    'profitMarginPercent',
    'actions',
  ];

  protected readonly summary = computed<DailySalesSummary>(() => {
    const period = this.selectedPeriod();
    if (period === 'custom') {
      const s = this.customStart() ? new Date(this.customStart()) : undefined;
      const e = this.customEnd() ? new Date(this.customEnd()) : undefined;
      return this.saleStore.getSummaryByPeriod('custom', s, e);
    }
    return this.saleStore.getSummaryByPeriod(period);
  });

  protected readonly filteredProducts = computed<ProductSalesSummary[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const products = this.summary().products;
    if (!query) return products;
    return products.filter(
      (p) =>
        p.productName.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.barcode.includes(query) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(query)),
    );
  });

  protected readonly filteredOrders = computed<SaleOrder[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const orders = this.summary().orders;
    if (!query) return orders;
    return orders.filter(
      (o) =>
        o.receiptNo.toLowerCase().includes(query) ||
        o.cashierName.toLowerCase().includes(query),
    );
  });

  setPeriod(period: ReportPeriod): void {
    this.selectedPeriod.set(period);
    this.selectedOrder.set(null);
  }

  onCustomDateChange(): void {
    if (this.selectedPeriod() === 'custom') {
      // Re-trigger computed signal by updating signal value
      this.selectedPeriod.set('custom');
    }
  }

  viewOrderDetail(order: SaleOrder): void {
    if (this.selectedOrder()?.id === order.id) {
      this.selectedOrder.set(null);
    } else {
      this.selectedOrder.set(order);
    }
  }

  closeOrderDetail(): void {
    this.selectedOrder.set(null);
  }

  printReport(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  exportCsv(): void {
    const s = this.summary();
    let csv = '\uFEFF'; // UTF-8 BOM for Excel Thai language compatibility

    // Header metadata
    csv += `รายงานสรุปยอดขาย ต้นทุน และกำไร\n`;
    csv += `ช่วงเวลา: "${s.date}"\n`;
    csv += `พิมพ์เมื่อ: "${new Date().toLocaleString('th-TH')}"\n\n`;

    // Overview KPIs
    csv += `สรุปภาพรวม\n`;
    csv += `ยอดขายรวม (บาท),ต้นทุนรวม (บาท),กำไรขั้นต้น (บาท),อัตรากำไร (%),จำนวนบิล,สินค้าที่ขายได้ (ชิ้น)\n`;
    csv += `${s.totalRevenue},${s.totalCost},${s.grossProfit},${s.profitMarginPercent}%,${s.orderCount},${s.totalItemsSold}\n\n`;

    // Products breakdown
    csv += `สรุปยอดขายแยกตามรายการสินค้า\n`;
    csv += `ลำดับ,SKU,บาร์โค้ด,ชื่อสินค้า,หมวดหมู่,จำนวนขาย (ชิ้น),ยอดขายรวม (บาท),ต้นทุนรวม (บาท),กำไรขั้นต้น (บาท),อัตรากำไร (%)\n`;

    s.products.forEach((p, index) => {
      const cat = p.categoryName ? `"${p.categoryName}"` : '""';
      csv += `${index + 1},"${p.sku}","${p.barcode}","${p.productName.replace(/"/g, '""')}",${cat},${p.quantitySold},${p.totalSales},${p.totalCost},${p.grossProfit},${p.profitMarginPercent}%\n`;
    });

    // Orders breakdown
    csv += `\nประวัติใบเสร็จการขาย\n`;
    csv += `เลขที่บิล,วัน-เวลา,แคชเชียร์,จำนวนชิ้น,ยอดขาย (บาท),ต้นทุน (บาท),กำไร (บาท),อัตรากำไร (%)\n`;

    s.orders.forEach((o) => {
      const dt = new Date(o.createdAt).toLocaleString('th-TH');
      csv += `"${o.receiptNo}","${dt}","${o.cashierName}",${o.itemCount},${o.total},${o.totalCost},${o.grossProfit},${o.profitMarginPercent}%\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `daily-sales-report-${this.selectedPeriod()}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
