import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { ProductFormComponent } from './product-form.component';
import { ProductStoreService } from '../../../core/services/product-store.service';
import { CategoryStoreService } from '../../../core/services/category-store.service';
import { ProductLookupService } from '../../../core/services/product-lookup.service';

describe('ProductFormComponent', () => {
  let router: Router;
  let productStore: ProductStoreService;
  let categoryStore: CategoryStoreService;

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('should initialize in create mode when no id param is provided', async () => {
    await TestBed.configureTestingModule({
      imports: [ProductFormComponent],
      providers: [
        provideRouter([{ path: 'products', children: [] }]),
        provideNoopAnimations(),
        ProductStoreService,
        CategoryStoreService,
        {
          provide: ProductLookupService,
          useValue: { lookupByBarcode: () => of(null) },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => null } },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProductFormComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect((component as any).isEditMode()).toBe(false);
    expect((component as any).pageTitle()).toBe('เพิ่มสินค้าใหม่');
  });

  it('should safely edit product with null imageUrl and submit without null.trim error', async () => {
    await TestBed.configureTestingModule({
      imports: [ProductFormComponent],
      providers: [
        provideRouter([{ path: 'products', children: [] }]),
        provideNoopAnimations(),
        ProductStoreService,
        CategoryStoreService,
        {
          provide: ProductLookupService,
          useValue: { lookupByBarcode: () => of(null) },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: (key: string) => (key === 'id' ? '6' : null) } },
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    productStore = TestBed.inject(ProductStoreService);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const updateSpy = vi.spyOn(productStore, 'updateProduct');

    // Simulate product 6 having null imageUrl (as returned from backend DB)
    const mockProduct6 = {
      id: 6,
      sku: 'P006',
      barcode: '8851234567895',
      name: 'โค้ก 325ml',
      price: 15,
      costPrice: 10,
      categoryId: 1,
      imageUrl: null as any,
      stock: 80,
      minStock: 20,
      active: true,
    };
    vi.spyOn(productStore, 'findById').mockReturnValue(mockProduct6 as any);

    const fixture = TestBed.createComponent(ProductFormComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect((component as any).isEditMode()).toBe(true);
    expect((component as any).pageTitle()).toBe('แก้ไขสินค้า');

    // The form control imageUrl value should be patched safely (either '' or null)
    // Now trigger submit() and assert it does NOT throw Cannot read properties of null (reading 'trim')
    expect(() => {
      component.submit();
    }).not.toThrow();

    expect(updateSpy).toHaveBeenCalledWith(
      6,
      expect.objectContaining({
        sku: 'P006',
        barcode: '8851234567895',
        name: 'โค้ก 325ml',
        imageUrl: undefined,
      }),
    );
    expect(navigateSpy).toHaveBeenCalledWith(['/products']);
  });

  it('should not submit if form is invalid', async () => {
    await TestBed.configureTestingModule({
      imports: [ProductFormComponent],
      providers: [
        provideRouter([{ path: 'products', children: [] }]),
        provideNoopAnimations(),
        ProductStoreService,
        CategoryStoreService,
        {
          provide: ProductLookupService,
          useValue: { lookupByBarcode: () => of(null) },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => null } },
          },
        },
      ],
    }).compileComponents();

    productStore = TestBed.inject(ProductStoreService);
    const createSpy = vi.spyOn(productStore, 'createProduct');

    const fixture = TestBed.createComponent(ProductFormComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    // Invalidate form by clearing name
    (component as any).form.controls.name.setValue('');
    component.submit();

    expect(createSpy).not.toHaveBeenCalled();
    expect((component as any).form.invalid).toBe(true);
  });
});
