import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../../core/services/auth.service';
import { ProductStoreService } from '../../../core/services/product-store.service';
import { Product } from '../../../models/product.model';
import { StockMovementType } from '../../../models/inventory.model';

@Component({
  selector: 'app-inventory-adjust-dialog',
  imports: [
    ReactiveFormsModule, MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
  ],
  templateUrl: './inventory-adjust-dialog.component.html',
})
export class InventoryAdjustDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(MatDialogRef<InventoryAdjustDialogComponent>);
  private readonly store = inject(ProductStoreService);
  private readonly auth = inject(AuthService);
  readonly data = inject<{ product: Product }>(MAT_DIALOG_DATA);

  protected readonly form = this.fb.nonNullable.group({
    type: ['RECEIVE' as StockMovementType, Validators.required],
    quantity: [1, [Validators.required]],
    note: [''],
  });

  confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { type, quantity, note } = this.form.getRawValue();
    const qty = type === 'ADJUST' ? quantity : Math.abs(quantity);
    const user = this.auth.currentUser()?.displayName ?? 'ระบบ';
    const result = this.store.adjustStock(
      { productId: this.data.product.id, quantity: qty, type, note },
      user,
    );
    this.ref.close(!!result);
  }

  cancel(): void {
    this.ref.close(false);
  }
}
