import { ThaiBarcodeProduct } from '../utils/thai-barcode.util';

/** ฐานข้อมูลสินค้าไทย (บาร์โค้ด GS1 885) — ขยายได้เรื่อยๆ */
export const THAI_BARCODE_PRODUCTS: ThaiBarcodeProduct[] = [
  {
    barcode: '8850124003850',
    name: 'Nestle Pure Life',
    brand: 'Nestlé',
    imageUrl: 'https://images.openfoodfacts.org/images/products/885/012/400/3850/front_en.5.400.jpg',
    categoryHints: 'beverages water',
    quantity: '600 mL',
  },
  {
    barcode: '8850329102112',
    name: 'นมจืด',
    nameTh: 'นมจืด',
    brand: 'Meiji',
    imageUrl: 'https://images.openfoodfacts.org/images/products/885/032/910/2112/front_th.6.400.jpg',
    categoryHints: 'milk dairy',
    quantity: '1L',
  },
  {
    barcode: '8850124065407',
    name: 'แม็กกี้ เจ ซอสใช้เหยาะหรือจิ้ม',
    nameTh: 'ซอสใช้เหยาะหรือจิ้ม',
    brand: 'Maggi',
    imageUrl: 'https://images.openfoodfacts.org/images/products/885/012/406/5407/front_en.20.400.jpg',
    categoryHints: 'sauce condiment',
    quantity: '100ml',
  },
  {
    barcode: '8850123110412',
    name: 'ขนมปังโฮลวีต',
    nameTh: 'ขนมปังโฮลวีต',
    brand: 'Farmhouse',
    imageUrl: 'https://images.openfoodfacts.org/images/products/885/012/311/0412/front_en.33.400.jpg',
    categoryHints: 'bread bakery',
    quantity: '250g',
  },
  {
    barcode: '8851952350161',
    name: 'น้ำดื่มคริสตัล',
    nameTh: 'น้ำดื่มตราคริสตัล600มล',
    brand: 'Crystal',
    imageUrl: 'https://images.openfoodfacts.org/images/products/885/195/235/0161/front_th.20.400.jpg',
    categoryHints: 'water beverage',
    quantity: '600ml',
  },
  {
    barcode: '8850329145546',
    name: 'เมจิไฮโปรตีน ช็อกโกแลต',
    nameTh: 'เมจิไฮโปรตีน',
    brand: 'Meiji',
    imageUrl: 'https://images.openfoodfacts.org/images/products/885/032/914/5546/front_en.42.400.jpg',
    categoryHints: 'beverage drink protein',
    quantity: '350 ml',
  },
  {
    barcode: '8850653799682',
    name: 'อกไก่นุ่ม',
    nameTh: 'อกไก่นุ่ม (ตรา ซีพีดีไลท์)',
    brand: 'CP Delight',
    imageUrl: 'https://images.openfoodfacts.org/images/products/885/065/379/9682/front_en.18.400.jpg',
    categoryHints: 'poultry fresh',
    quantity: '80 g',
  },
  {
    barcode: '8851351381797',
    name: 'ข้าวไรซ์เบอรี่',
    nameTh: 'ข้าวไรซ์เบอรี่',
    brand: 'EZYGOOD',
    imageUrl: 'https://images.openfoodfacts.org/images/products/885/135/138/1797/front_en.21.400.jpg',
    categoryHints: 'rice dry food',
    quantity: '150 g',
  },
  {
    barcode: '8850370071115',
    name: 'ชาเขียวนม แบรนด์นัมเบอร์วัน',
    brand: 'ChaTraMue',
    categoryHints: 'beverage tea drink',
    quantity: '200g',
  },
  {
    barcode: '8851234567890',
    name: 'น้ำดื่ม 600ml',
    brand: 'ตัวอย่าง',
    categoryHints: 'water beverage',
    quantity: '600ml',
  },
];

export function findThaiBarcodeProduct(barcode: string): ThaiBarcodeProduct | undefined {
  const normalized = barcode.replace(/\D/g, '');
  return THAI_BARCODE_PRODUCTS.find((item) => item.barcode === normalized);
}
