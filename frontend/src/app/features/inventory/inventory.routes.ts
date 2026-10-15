import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const INVENTORY_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard(['ADMIN', 'MANAGER'])],
    loadComponent: () =>
      import('./inventory-list/inventory-list.component').then((m) => m.InventoryListComponent),
  },
];
