import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { CategoryStoreService } from '../../../../core/services/category-store.service';
import { ProductStoreService } from '../../../../core/services/product-store.service';
import { parseBulkProductText } from '../../../../core/utils/barcode.util';

@Component({
  selector: 'app-product-bulk-import-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './product-bulk-import-dialog.component.html',
  styleUrl: './product-bulk-import-dialog.component.scss',
})
export class ProductBulkImportDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ProductBulkImportDialogComponent>);
  private readonly productStore = inject(ProductStoreService);
  private readonly categoryStore = inject(CategoryStoreService);

  protected readonly categories = this.categoryStore.activeCategories;
  protected readonly bulkText = signal(this.sampleText());
  protected readonly defaultCategoryId = signal(this.categories()[0]?.id ?? 0);
  protected readonly parseErrors = signal<string[]>([]);
  protected readonly importErrors = signal<string[]>([]);
  protected readonly previewCount = signal(0);

  preview(): void {
    const { rows, errors } = parseBulkProductText(this.bulkText());
    this.parseErrors.set(errors);
    this.previewCount.set(rows.length);
    this.importErrors.set([]);
  }

  import(): void {
    const { rows, errors } = parseBulkProductText(this.bulkText());
    this.parseErrors.set(errors);
    if (!rows.length) {
      return;
    }

    const result = this.productStore.bulkCreateProducts(rows, this.defaultCategoryId());
    this.importErrors.set(result.errors);

    if (result.created > 0) {
      this.dialogRef.close({ created: result.created, errors: result.errors });
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  private sampleText(): string {
    const nextSku = this.productStore.suggestNextSku();
    return `# รูปแบบ: SKU,ชื่อสินค้า,หมวด(ไม่บังคับ),สต็อก(ไม่บังคับ),ราคา(ไม่บังคับ)
# บาร์โค้ดสร้างอัตโนมัติจากเลข SKU — ราคาไม่ใส่ = 0 (ตั้งทีหลัง)
${nextSku},สินค้าตัวอย่าง 1,เครื่องดื่ม,10
P999,สินค้าตัวอย่าง 2,,5`;
  }
}
