import { Component, computed, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { CategoryStoreService } from '../../../core/services/category-store.service';
import { ProductStoreService } from '../../../core/services/product-store.service';
import { ProductLookupService } from '../../../core/services/product-lookup.service';
import { BackendLookupResponse } from '../../../models/product-lookup.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload.component';

@Component({
  selector: 'app-product-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    ImageUploadComponent,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
  ],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss',
})
export class ProductFormComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(ProductStoreService);
  private readonly categoryStore = inject(CategoryStoreService);
  private readonly lookupService = inject(ProductLookupService);

  protected readonly categories = this.categoryStore.activeCategories;
  protected readonly productId = signal<number | null>(null);
  protected readonly autoBarcode = signal(true);
  protected readonly isEditMode = computed(() => this.productId() !== null);
  protected readonly pageTitle = computed(() => (this.isEditMode() ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'));
  protected readonly breadcrumbs = computed(() => [
    { label: 'แดชบอร์ด', route: '/dashboard' },
    { label: 'สินค้า', route: '/products' },
    { label: this.pageTitle() },
  ]);

  // Online Lookup State
  protected readonly lookupCode = signal('');
  protected readonly isSearchingOnline = signal(false);
  protected readonly lookupResult = signal<BackendLookupResponse | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    sku: ['', Validators.required],
    barcode: [''],
    name: ['', Validators.required],
    categoryId: [0, [Validators.required, Validators.min(1)]],
    imageUrl: [''],
    price: [0, [Validators.min(0)]],
    costPrice: [0, [Validators.min(0)]],
    stock: [0, [Validators.min(0)]],
    minStock: [10, [Validators.min(0)]],
    active: [true],
  });

  private formInitialized = false;

  constructor() {
    effect(() => {
      const id = this.productId();
      if (!id || this.formInitialized) {
        return;
      }
      const product = this.store.findById(id);
      if (product) {
        this.populateForm(product);
        this.formInitialized = true;
      }
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.setupCreateMode();
      return;
    }

    this.productId.set(id);
    this.autoBarcode.set(false);
    const product = this.store.findById(id);
    if (product) {
      this.populateForm(product);
      this.formInitialized = true;
    }
  }

  private populateForm(product: {
    sku?: string | null;
    barcode?: string | null;
    name?: string | null;
    categoryId?: number | null;
    imageUrl?: string | null;
    price?: number | null;
    costPrice?: number | null;
    stock?: number | null;
    minStock?: number | null;
    active?: boolean | null;
  }): void {
    this.form.patchValue({
      sku: product.sku ?? '',
      barcode: product.barcode ?? '',
      name: product.name ?? '',
      categoryId: product.categoryId ?? 0,
      imageUrl: product.imageUrl ?? '',
      price: product.price ?? 0,
      costPrice: product.costPrice ?? 0,
      stock: product.stock ?? 0,
      minStock: product.minStock ?? 10,
      active: product.active ?? true,
    });
  }

  searchBarcodeOnline(codeOverride?: string, refresh = false): void {
    const code = (codeOverride ?? this.lookupCode() ?? '').trim();
    if (!code || code.length < 8) {
      return;
    }

    this.isSearchingOnline.set(true);
    this.lookupResult.set(null);

    this.lookupService.lookupByBarcode(code, refresh)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSearchingOnline.set(false);
          this.lookupResult.set(res);
        },
        error: () => {
          this.isSearchingOnline.set(false);
        },
      });
  }

  applySuggestion(): void {
    const result = this.lookupResult();
    const suggestion = result?.suggestion;
    if (!suggestion) return;

    this.autoBarcode.set(false);
    this.form.patchValue({
      barcode: suggestion.barcode ?? '',
      name: suggestion.name ?? '',
      imageUrl: suggestion.imageUrl || this.form.value.imageUrl || '',
    });

    if (suggestion.categoryId) {
      this.form.patchValue({ categoryId: suggestion.categoryId });
    }

    // Clear lookup card with success feel
    this.lookupResult.set(null);
    this.lookupCode.set('');
  }

  clearLookup(): void {
    this.lookupResult.set(null);
  }

  openRetailer(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  regenerateBarcode(): void {
    const sku = (this.form.controls.sku.value ?? '').trim();
    if (!sku) {
      return;
    }
    const barcode = this.store.previewBarcode(sku, this.productId() ?? undefined);
    this.form.controls.barcode.setValue(barcode);
    this.autoBarcode.set(true);
  }

  toggleAutoBarcode(enabled: boolean): void {
    this.autoBarcode.set(enabled);
    if (enabled) {
      this.regenerateBarcode();
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const barcodeVal = (raw.barcode ?? '').trim();
    const imageUrlVal = (raw.imageUrl ?? '').trim();
    const skuVal = (raw.sku ?? '').trim();
    const nameVal = (raw.name ?? '').trim();

    const payload = {
      ...raw,
      sku: skuVal,
      name: nameVal,
      barcode: this.autoBarcode() ? '' : barcodeVal,
      imageUrl: imageUrlVal || undefined,
    };

    try {
      if (this.isEditMode()) {
        this.store.updateProduct(this.productId()!, payload);
      } else {
        this.store.createProduct(payload);
      }
      this.router.navigate(['/products']);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'บันทึกสินค้าไม่สำเร็จ');
    }
  }

  private setupCreateMode(): void {
    this.setDefaultCategory();
    const nextSku = this.store.suggestNextSku();
    this.form.patchValue({ sku: nextSku });
    this.regenerateBarcode();

    this.form.controls.sku.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.autoBarcode()) {
          this.regenerateBarcode();
        }
      });
  }

  private setDefaultCategory(): void {
    const first = this.categoryStore.activeCategories()[0];
    if (first) {
      this.form.patchValue({ categoryId: first.id });
    }
  }
}
