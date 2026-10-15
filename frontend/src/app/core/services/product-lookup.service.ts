import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BackendLookupResponse } from '../../models/product-lookup.model';
import { CategoryStoreService } from './category-store.service';
import { resolveCategoryIdFromHints } from '../utils/category-mapper.util';

@Injectable({ providedIn: 'root' })
export class ProductLookupService {
  private readonly http = inject(HttpClient);
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

    const url = `${environment.apiUrl}/lookup/barcode/${clean}${refresh ? '?refresh=true' : ''}`;
    return this.http.get<BackendLookupResponse>(url).pipe(
      map((res) => {
        if (res.suggestion && res.suggestion.categoryHint) {
          const matchedId = resolveCategoryIdFromHints(
            this.categoryStore.activeCategories(),
            res.suggestion.categoryHint
          );
          if (matchedId) {
            res.suggestion.categoryId = matchedId;
          }
        }
        return res;
      }),
      catchError((err) => {
        return of({
          status: 'NOT_FOUND',
          barcode: clean,
          validChecksum: true,
          message: err?.error?.message || 'ไม่พบข้อมูลหรือระบบกำลังเชื่อมต่อบริการค้นหา',
        } as BackendLookupResponse);
      })
    );
  }
}
