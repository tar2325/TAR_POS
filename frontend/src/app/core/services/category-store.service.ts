import { Injectable, computed, signal } from '@angular/core';
import { MOCK_CATEGORIES } from '../data/category-mock.data';
import { Category, CategoryPayload } from '../../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryStoreService {
  private readonly categories = signal<Category[]>(
    MOCK_CATEGORIES.map((item) => ({ ...item })).sort((a, b) => a.sortOrder - b.sortOrder),
  );

  readonly categoryList = this.categories.asReadonly();

  readonly activeCategories = computed(() =>
    this.categories()
      .filter((category) => category.active)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  );

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
    return updated;
  }

  deleteCategory(id: number): boolean {
    const exists = this.categories().some((item) => item.id === id);
    if (!exists) {
      return false;
    }
    this.categories.update((items) => items.filter((item) => item.id !== id));
    return true;
  }

  private getNextCategoryId(): number {
    return this.categories().reduce((max, category) => Math.max(max, category.id), 0) + 1;
  }
}
