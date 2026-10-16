import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { CategoryStoreService } from './category-store.service';
import { CategoryPayload } from '../../models/category.model';

describe('CategoryStoreService', () => {
  let service: CategoryStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CategoryStoreService],
    });
    service = TestBed.inject(CategoryStoreService);
  });

  it('should initialize with sorted categories list', () => {
    const list = service.categoryList();
    expect(list.length).toBeGreaterThan(0);
    // Check that sortOrder is ascending
    for (let i = 0; i < list.length - 1; i++) {
      expect(list[i].sortOrder).toBeLessThanOrEqual(list[i + 1].sortOrder);
    }
  });

  it('should filter active categories', () => {
    const active = service.activeCategories();
    expect(active.every((c) => c.active)).toBe(true);
  });

  it('should find category by id', () => {
    const first = service.getCategories()[0];
    const found = service.findById(first.id);
    expect(found).toEqual(first);

    expect(service.findById(999999)).toBeUndefined();
  });

  it('should find category by name case-insensitively', () => {
    const first = service.getCategories()[0];
    const found = service.findByName(first.name.toLowerCase());
    expect(found?.id).toBe(first.id);

    expect(service.findByName('หมวดหมู่ที่ไม่มีอยู่จริง')).toBeUndefined();
  });

  it('should create, update, and delete a category', () => {
    const payload: CategoryPayload = {
      name: 'หมวดหมู่ทดสอบใหม่',
      icon: 'star',
      sortOrder: 99,
      active: true,
    };

    const created = service.createCategory(payload);
    expect(created.id).toBeDefined();
    expect(created.name).toBe('หมวดหมู่ทดสอบใหม่');
    expect(service.findById(created.id)).toBeDefined();

    const updatePayload: CategoryPayload = {
      name: 'หมวดหมู่ทดสอบแก้ไขแล้ว',
      icon: 'favorite',
      sortOrder: 100,
      active: false,
    };

    const updated = service.updateCategory(created.id, updatePayload);
    expect(updated?.name).toBe('หมวดหมู่ทดสอบแก้ไขแล้ว');
    expect(updated?.active).toBe(false);

    const deleted = service.deleteCategory(created.id);
    expect(deleted).toBe(true);
    expect(service.findById(created.id)).toBeUndefined();

    // Deleting again should return false
    expect(service.deleteCategory(created.id)).toBe(false);
  });
});
