export interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: ('ADMIN' | 'MANAGER' | 'CASHIER')[];
}
