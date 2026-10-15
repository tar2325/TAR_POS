import { Routes } from '@angular/router';

export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./sales-report/sales-report.component').then((m) => m.SalesReportComponent),
  },
];
