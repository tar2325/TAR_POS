export const AUTH_STORAGE_KEY = 'pos_auth_session';

export const MOCK_USERS = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    displayName: 'ผู้ดูแลระบบ',
    role: 'ADMIN' as const,
  },
  {
    id: 2,
    username: 'manager',
    password: 'manager123',
    displayName: 'ผู้จัดการ',
    role: 'MANAGER' as const,
  },
  {
    id: 3,
    username: 'cashier',
    password: 'cashier123',
    displayName: 'พนักงานขาย',
    role: 'CASHIER' as const,
  },
];
