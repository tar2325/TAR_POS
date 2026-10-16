import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BackendLookupResponse } from '../../models/product-lookup.model';
import { CategoryStoreService } from './category-store.service';
import { resolveCategoryIdFromHints } from '../utils/category-mapper.util';
import { findThaiBarcodeProduct } from '../data/thai-product-barcode.data';

@Injectable({ providedIn: 'root' })
export class ProductLookupService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly categoryStore = inject(CategoryStoreService);

  lookupByBarcode(barcode: string, refresh = false): Observable<BackendLookupResponse> {
    const clean = barcode.replace(/\D/g, '').trim();
    if (clean.length < 8) {
      return of({
        status: 'INVALID',
        barcode: clean,
        validChecksum: false,
        message: 'ความยาวบาร์โค้ดต้องอยู่ระหว่าง 8 ถึง 14 หลัก',
      });
    }

    if (!this.http) {
      return of(this.resolveLocalOrNotFound(clean));
    }

    const url = `${environment.apiUrl}/lookup/barcode/${clean}${refresh ? '?refresh=true' : ''}`;
    return this.http.get<BackendLookupResponse>(url).pipe(
      map((res) => {
        if (res.status === 'FOUND' && res.suggestion) {
          if (res.suggestion.categoryHint) {
            const matchedId = resolveCategoryIdFromHints(
              this.categoryStore.activeCategories(),
              res.suggestion.categoryHint
            );
            if (matchedId) {
              res.suggestion.categoryId = matchedId;
            }
          }
          return res;
        }
        return this.resolveLocalOrNotFound(clean, res.message);
      }),
      catchError((err) => {
        return of(this.resolveLocalOrNotFound(clean, err?.error?.message));
      })
    );
  }

  private resolveLocalOrNotFound(clean: string, defaultMessage?: string): BackendLookupResponse {
    const local = findThaiBarcodeProduct(clean);
    if (local) {
      const categoryId = local.categoryHints
        ? resolveCategoryIdFromHints(this.categoryStore.activeCategories(), local.categoryHints)
        : undefined;

      return {
        status: 'FOUND',
        barcode: clean,
        originCountry: 'ไทย (GS1 885)',
        validChecksum: true,
        message: 'พบข้อมูลสินค้าในฐานข้อมูลไทย',
        suggestion: {
          barcode: clean,
          name: local.nameTh || local.name,
          brand: local.brand,
          quantity: local.quantity,
          imageUrl: local.imageUrl,
          categoryHint: local.categoryHints,
          categoryId: categoryId ?? undefined,
          source: 'THAI_GS1_LOCAL',
          confidence: 95,
        },
      };
    }

    return {
      status: 'NOT_FOUND',
      barcode: clean,
      validChecksum: true,
      message: defaultMessage || 'ไม่พบข้อมูลในฐานข้อมูลออนไลน์ (สามารถกรอกชื่อและราคาเองได้ทันที)',
    };
  }
}
