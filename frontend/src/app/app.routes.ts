import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layout/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadChildren: () => import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES) },
      { path: 'products', loadChildren: () => import('./features/products/products.routes').then((m) => m.PRODUCTS_ROUTES) },
      { path: 'categories', loadChildren: () => import('./features/categories/categories.routes').then((m) => m.CATEGORIES_ROUTES) },
      { path: 'inventory', loadChildren: () => import('./features/inventory/inventory.routes').then((m) => m.INVENTORY_ROUTES) },
      {
        path: 'reports',
        canActivate: [roleGuard(['ADMIN', 'MANAGER'])],
        loadChildren: () => import('./features/reports/reports.routes').then((m) => m.REPORTS_ROUTES),
      },
    ],
  },
  {
    path: 'pos',
    canActivate: [authGuard],
    loadComponent: () => import('./core/layout/pos-layout/pos-layout.component').then((m) => m.PosLayoutComponent),
    loadChildren: () => import('./features/pos/pos.routes').then((m) => m.POS_ROUTES),
  },
  { path: '**', redirectTo: 'dashboard' },
];
