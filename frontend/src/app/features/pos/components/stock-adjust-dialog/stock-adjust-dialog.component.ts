import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/services/auth.service';
import { ProductStoreService } from '../../../../core/services/product-store.service';
import { StockAdjustDialogData, StockAdjustDialogResult } from '../../../../models/product.model';

@Component({
  selector: 'app-stock-adjust-dialog',
  imports: [
    ReactiveFormsModule, MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatIconModule,
  ],
  templateUrl: './stock-adjust-dialog.component.html',
  styleUrl: './stock-adjust-dialog.component.scss',
})
export class StockAdjustDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(MatDialogRef<StockAdjustDialogComponent, StockAdjustDialogResult>);
  private readonly store = inject(ProductStoreService);
  private readonly auth = inject(AuthService);
  readonly data = inject<StockAdjustDialogData>(MAT_DIALOG_DATA);

  protected readonly form = this.fb.nonNullable.group({
    addQty: [
      Math.max(this.data.neededQty - this.data.product.stock, 1),
      [Validators.required, Validators.min(1)],
    ],
  });

  confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const addQty = this.form.controls.addQty.value;
    const user = this.auth.currentUser()?.displayName ?? 'พนักงานขาย';
    const updated = this.store.addStock(this.data.product.id, addQty, user, 'เพิ่มสต็อกจากหน้า POS');
    if (!updated) return;
    this.ref.close({ addedQty: addQty, newStock: updated.stock });
  }

  cancel(): void {
    this.ref.close();
  }
}
