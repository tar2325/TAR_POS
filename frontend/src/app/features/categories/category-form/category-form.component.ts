import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { CategoryStoreService } from '../../../core/services/category-store.service';
import { CATEGORY_ICON_OPTIONS } from '../../../models/category.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-category-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
  ],
  templateUrl: './category-form.component.html',
  styleUrl: './category-form.component.scss',
})
export class CategoryFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(CategoryStoreService);

  protected readonly iconOptions = CATEGORY_ICON_OPTIONS;
  protected readonly categoryId = signal<number | null>(null);
  protected readonly isEditMode = computed(() => this.categoryId() !== null);
  protected readonly pageTitle = computed(() => (this.isEditMode() ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'));
  protected readonly breadcrumbs = computed(() => [
    { label: 'แดชบอร์ด', route: '/dashboard' },
    { label: 'หมวดหมู่', route: '/categories' },
    { label: this.pageTitle() },
  ]);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    icon: ['category', Validators.required],
    sortOrder: [1, [Validators.required, Validators.min(1)]],
    active: [true],
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      return;
    }
    this.categoryId.set(id);
    const category = this.store.findById(id);
    if (!category) {
      this.router.navigate(['/categories']);
      return;
    }
    this.form.patchValue(category);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = this.form.getRawValue();
    if (this.isEditMode()) {
      this.store.updateCategory(this.categoryId()!, payload);
    } else {
      this.store.createCategory(payload);
    }
    this.router.navigate(['/categories']);
  }
}
