import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import {
  ProductQuickScanDialogComponent,
  QuickScanDialogData,
} from './product-quick-scan-dialog.component';
import { ProductStoreService } from '../../../../core/services/product-store.service';
import { CategoryStoreService } from '../../../../core/services/category-store.service';
import { ProductLookupService } from '../../../../core/services/product-lookup.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Product } from '../../../../models/product.model';

describe('ProductQuickScanDialogComponent', () => {
  let productStore: ProductStoreService;
  let lookupService: ProductLookupService;
  const mockDialogRef = {
    close: vi.fn(),
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockDialogRef.close.mockClear();
  });

  const setup = async (data: QuickScanDialogData = {}) => {
    await TestBed.configureTestingModule({
      imports: [ProductQuickScanDialogComponent],
      providers: [
        provideNoopAnimations(),
        ProductStoreService,
        CategoryStoreService,
        {
          provide: MatDialogRef,
          useValue: mockDialogRef,
        },
        {
          provide: MAT_DIALOG_DATA,
          useValue: data,
        },
        {
          provide: ProductLookupService,
          useValue: {
            lookupByBarcode: vi.fn().mockReturnValue(
              of({
                status: 'FOUND',
                barcode: '8851952350161',
                suggestion: {
                  name: 'น้ำดื่มคริสตัล 600ml',
                  imageUrl: 'https://example.com/crystal.jpg',
                  categoryId: 1,
                },
              })
            ),
          },
        },
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({ displayName: 'เจ้าของร้าน' }),
            hasRole: () => true,
          },
        },
      ],
    }).compileComponents();

    productStore = TestBed.inject(ProductStoreService);
    lookupService = TestBed.inject(ProductLookupService);
    const fixture = TestBed.createComponent(ProductQuickScanDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    return { fixture, component };
  };

  it('should initialize in idle mode when opened without barcode', async () => {
    const { component } = await setup({});
    expect((component as any).mode()).toBe('idle');
  });

  it('should switch to create mode and auto lookup when new barcode is scanned', async () => {
    const { component } = await setup({ barcode: '8851952350161' });
    expect((component as any).mode()).toBe('create');
    expect((component as any).newName()).toBe('น้ำดื่มคริสตัล 600ml');
    expect((component as any).newImageUrl()).toBe('https://example.com/crystal.jpg');
    expect((component as any).newCategoryId()).toBe(1);
  });

  it('should save new product and close dialog when saveCreate is called', async () => {
    const { component } = await setup({ barcode: '8859999000123' });
    (component as any).newName.set('สินค้าทดสอบ');
    (component as any).newPrice.set(50);
    (component as any).newStock.set(10);

    const createSpy = vi.spyOn(productStore, 'createProduct');
    (component as any).saveCreate(false);

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        barcode: '8859999000123',
        name: 'สินค้าทดสอบ',
        price: 50,
        stock: 10,
      })
    );
    expect(mockDialogRef.close).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'created' })
    );
  });

  it('should switch to restock mode when existing product barcode is scanned', async () => {
    const existing: Product = {
      id: 99,
      sku: 'P099',
      barcode: '8851111222333',
      name: 'ช็อคโกแลตบาร์',
      price: 25,
      costPrice: 15,
      categoryId: 1,
      stock: 5,
      minStock: 10,
      active: true,
    };
    const { component } = await setup({});
    vi.spyOn(productStore, 'findByBarcode').mockReturnValue(existing);

    component.processBarcode('8851111222333');

    expect((component as any).mode()).toBe('restock');
    expect((component as any).existingProduct()).toEqual(existing);
    expect((component as any).restockQty()).toBe(1);
    expect((component as any).editPrice()).toBe(25);
  });

  it('should adjust stock when saveRestock is called', async () => {
    const existing: Product = {
      id: 99,
      sku: 'P099',
      barcode: '8851111222333',
      name: 'ช็อคโกแลตบาร์',
      price: 25,
      costPrice: 15,
      categoryId: 1,
      stock: 5,
      minStock: 10,
      active: true,
    };
    const { component } = await setup({});
    vi.spyOn(productStore, 'findByBarcode').mockReturnValue(existing);
    vi.spyOn(productStore, 'findById').mockReturnValue(existing);
    const adjustSpy = vi.spyOn(productStore, 'adjustStock');

    component.processBarcode('8851111222333');
    (component as any).addQuickQty(11); // 1 + 11 = 12 (โหล)
    expect((component as any).restockQty()).toBe(12);

    (component as any).saveRestock(false);

    expect(adjustSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 99,
        quantity: 12,
        type: 'RECEIVE',
      }),
      'เจ้าของร้าน'
    );
    expect(mockDialogRef.close).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'restocked', quantityAdded: 12 })
    );
  });
});
