import { Category } from '../../models/category.model';

export const MOCK_CATEGORIES: Category[] = [
  { id: 1, name: 'เครื่องดื่ม', icon: 'local_cafe', active: true, sortOrder: 1 },
  { id: 2, name: 'เบเกอรี่', icon: 'bakery_dining', active: true, sortOrder: 2 },
  { id: 3, name: 'อาหารแห้ง', icon: 'ramen_dining', active: true, sortOrder: 3 },
  { id: 4, name: 'ของสด', icon: 'egg_alt', active: true, sortOrder: 4 },
  { id: 5, name: 'ขนม', icon: 'cookie', active: true, sortOrder: 5 },
  { id: 6, name: 'ของใช้ส่วนตัว', icon: 'soap', active: true, sortOrder: 6 },
  { id: 7, name: 'ของใช้ในบ้าน', icon: 'cleaning_services', active: true, sortOrder: 7 },
];
