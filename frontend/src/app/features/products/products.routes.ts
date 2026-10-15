import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const PRODUCTS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./product-list/product-list.component').then((m) => m.ProductListComponent) },
  { path: 'new', canActivate: [roleGuard(['ADMIN', 'MANAGER'])], loadComponent: () => import('./product-form/product-form.component').then((m) => m.ProductFormComponent) },
  { path: ':id/edit', canActivate: [roleGuard(['ADMIN', 'MANAGER'])], loadComponent: () => import('./product-form/product-form.component').then((m) => m.ProductFormComponent) },
];
