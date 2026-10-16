import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MOCK_CATEGORIES } from '../data/category-mock.data';
import { Category, CategoryPayload } from '../../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryStoreService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly categories = signal<Category[]>(
    MOCK_CATEGORIES.map((item) => ({ ...item })).sort((a, b) => a.sortOrder - b.sortOrder),
  );

  readonly categoryList = this.categories.asReadonly();

  readonly activeCategories = computed(() =>
    this.categories()
      .filter((category) => category.active)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  );

  constructor() {
    this.loadCategories();
  }

  loadCategories(): void {
    if (typeof window === 'undefined' || !this.http) return;
    this.http.get<Category[]>(`${environment.apiUrl}/categories`).subscribe({
      next: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          this.categories.set([...data].sort((a, b) => a.sortOrder - b.sortOrder));
        }
      },
      error: (err) => {
        console.warn('Failed to load categories from API, using fallback data:', err?.message || err);
      },
    });
  }

  getCategories(): Category[] {
    return [...this.categories()].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  findById(id: number): Category | undefined {
    return this.categories().find((category) => category.id === id);
  }

  findByName(name: string): Category | undefined {
    const normalized = name.trim().toLowerCase();
    return this.categories().find((category) => category.name.toLowerCase() === normalized);
  }

  createCategory(payload: CategoryPayload): Category {
    const category: Category = {
      id: this.getNextCategoryId(),
      ...payload,
    };
    this.categories.update((items) => [...items, category]);

    if (this.http) {
      this.http.post<Category>(`${environment.apiUrl}/categories`, payload).subscribe({
        next: (created) => {
          this.categories.update((items) =>
            items.map((it) => (it.id === category.id ? created : it)),
          );
        },
        error: (err) => console.error('Failed to create category on API:', err),
      });
    }

    return category;
  }

  updateCategory(id: number, payload: CategoryPayload): Category | undefined {
    let updated: Category | undefined;
    this.categories.update((items) =>
      items.map((item) => {
        if (item.id !== id) {
          return item;
        }
        updated = { id, ...payload };
        return updated;
      }),
    );

    if (this.http) {
      this.http.put<Category>(`${environment.apiUrl}/categories/${id}`, payload).subscribe({
        next: (res) => {
          this.categories.update((items) => items.map((it) => (it.id === id ? res : it)));
        },
        error: (err) => console.error('Failed to update category on API:', err),
      });
    }

    return updated;
  }

  deleteCategory(id: number): boolean {
    const exists = this.categories().some((item) => item.id === id);
    if (!exists) {
      return false;
    }
    this.categories.update((items) => items.filter((item) => item.id !== id));

    if (this.http) {
      this.http.delete<void>(`${environment.apiUrl}/categories/${id}`).subscribe({
        error: (err) => console.error('Failed to delete category on API:', err),
      });
    }

    return true;
  }

  private getNextCategoryId(): number {
    return this.categories().reduce((max, category) => Math.max(max, category.id), 0) + 1;
  }
}
