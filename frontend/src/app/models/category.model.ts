export interface Category {
  id: number;
  name: string;
  icon: string;
  active: boolean;
  sortOrder: number;
}

export interface CategoryPayload {
  name: string;
  icon: string;
  active: boolean;
  sortOrder: number;
}

export const CATEGORY_ICON_OPTIONS = [
  { value: 'apps', label: 'ทั่วไป' },
  { value: 'local_cafe', label: 'เครื่องดื่ม' },
  { value: 'bakery_dining', label: 'เบเกอรี่' },
  { value: 'ramen_dining', label: 'อาหารแห้ง' },
  { value: 'egg_alt', label: 'ของสด' },
  { value: 'cookie', label: 'ขนม' },
  { value: 'shopping_bag', label: 'ของใช้' },
  { value: 'liquor', label: 'แอลกอฮอล์' },
  { value: 'icecream', label: 'ไอศกรีม' },
  { value: 'category', label: 'หมวดอื่น' },
] as const;
