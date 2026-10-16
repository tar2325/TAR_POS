import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localeTh from '@angular/common/locales/th';
import { MatDialog } from '@angular/material/dialog';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { ProductListComponent } from './product-list.component';
import { ProductStoreService } from '../../../core/services/product-store.service';
import { CategoryStoreService } from '../../../core/services/category-store.service';
import { AuthService } from '../../../core/services/auth.service';
import { Product } from '../../../models/product.model';

registerLocaleData(localeTh);

describe('ProductListComponent', () => {
  let productStore: ProductStoreService;
  let dialog: MatDialog;
  const mockDialog = {
    open: vi.fn().mockReturnValue({
      afterClosed: () => of(undefined),
    }),
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    mockDialog.open.mockClear();

    await TestBed.configureTestingModule({
      imports: [ProductListComponent],
      providers: [
        provideRouter([{ path: 'products', children: [] }]),
        provideNoopAnimations(),
        ProductStoreService,
        CategoryStoreService,
        {
          provide: MatDialog,
          useValue: mockDialog,
        },
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({ displayName: 'ผู้ดูแลระบบ' }),
            hasRole: () => true,
          },
        },
      ],
    }).compileComponents();

    productStore = TestBed.inject(ProductStoreService);
    dialog = TestBed.inject(MatDialog);
  });

  it('should create the component and display reactive products', () => {
    const fixture = TestBed.createComponent(ProductListComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect((component as any).products().length).toBeGreaterThan(0);
  });

  it('should filter products when searching', () => {
    const fixture = TestBed.createComponent(ProductListComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.onSearch('น้ำดื่ม');
    const filtered = (component as any).products();
    expect(filtered.every((p: Product) => p.name.includes('น้ำดื่ม') || p.sku.includes('น้ำดื่ม'))).toBe(true);
  });

  it('should open quick scan dialog when onBarcodeScan is called', () => {
    const fixture = TestBed.createComponent(ProductListComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.onBarcodeScan('8859999000123');
    expect(mockDialog.open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        data: { barcode: '8859999000123' },
      })
    );
  });

  it('should fast restock (+1) directly when fastRestockMode is ON and product exists', () => {
    const fixture = TestBed.createComponent(ProductListComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const existing: Product = {
      id: 55,
      sku: 'P055',
      barcode: '8858888777666',
      name: 'ช็อคโกแลต',
      price: 20,
      categoryId: 1,
      stock: 10,
      minStock: 5,
      active: true,
    };
    vi.spyOn(productStore, 'findByBarcode').mockReturnValue(existing);
    const adjustSpy = vi.spyOn(productStore, 'adjustStock');

    (component as any).fastRestockMode.set(true);
    component.onBarcodeScan('8858888777666');

    expect(adjustSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 55,
        quantity: 1,
        type: 'RECEIVE',
      }),
      'ผู้ดูแลระบบ'
    );
    expect(mockDialog.open).not.toHaveBeenCalled();
  });
});
