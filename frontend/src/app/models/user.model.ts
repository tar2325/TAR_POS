export type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER';

export interface User {
  id: number;
  username: string;
  displayName: string;
  role: UserRole;
}
