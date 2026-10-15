import { SaleItem, SaleOrder } from '../../models/sale.model';
import { Product } from '../../models/product.model';
import { MOCK_PRODUCTS } from './product-mock.data';

function createDate(daysAgo: number, hours: number, minutes: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

const prodMap = new Map<number, Product>(MOCK_PRODUCTS.map((p) => [p.id, p]));

function makeItem(productId: number, quantity: number, categoryName: string): SaleItem {
  const product = prodMap.get(productId)!;
  const cost = product.costPrice ?? 0;
  const lineCost = Math.round(cost * quantity * 100) / 100;
  const lineTotal = Math.round(product.price * quantity * 100) / 100;
  const lineProfit = Math.round((lineTotal - lineCost) * 100) / 100;
  const marginPercent = lineTotal > 0 ? Math.round((lineProfit / lineTotal) * 10000) / 100 : 0;
  return {
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    barcode: product.barcode,
    categoryName,
    quantity,
    costPrice: cost,
    price: product.price,
    lineCost,
    lineTotal,
    lineProfit,
    marginPercent,
  };
}

function makeOrder(
  id: string,
  receiptNo: string,
  createdAt: string,
  cashierName: string,
  items: SaleItem[],
  discount = 0,
): SaleOrder {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
  const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  const totalCost = Math.round(items.reduce((sum, item) => sum + item.lineCost, 0) * 100) / 100;
  const grossProfit = Math.round((total - totalCost) * 100) / 100;
  const profitMarginPercent = total > 0 ? Math.round((grossProfit / total) * 10000) / 100 : 0;

  return {
    id,
    receiptNo,
    createdAt,
    cashierName,
    items,
    itemCount,
    subtotal,
    discount,
    tax: 0,
    total,
    totalCost,
    grossProfit,
    profitMarginPercent,
  };
}

export function getMockSales(): SaleOrder[] {
  return [
    // Today
    makeOrder(
      'RCP-TD001',
      'RCP-10023401',
      createDate(0, 9, 15),
      'สมชาย ใจดี',
      [
        makeItem(1, 2, 'เครื่องดื่ม'), // น้ำดื่ม
        makeItem(2, 2, 'เบเกอรี่'),    // ขนมปัง
        makeItem(4, 2, 'อาหารแห้ง'),   // มาม่า
      ],
    ),
    makeOrder(
      'RCP-TD002',
      'RCP-10023402',
      createDate(0, 11, 30),
      'สมชาย ใจดี',
      [
        makeItem(3, 3, 'เครื่องดื่ม'), // กาแฟ
        makeItem(10, 2, 'ขนม'),        // ช็อกโกแลต
      ],
    ),
    makeOrder(
      'RCP-TD003',
      'RCP-10023403',
      createDate(0, 13, 45),
      'วิภาดา รักบริการ',
      [
        makeItem(6, 4, 'เครื่องดื่ม'), // โค้ก
        makeItem(5, 1, 'ของสด'),       // ไข่ไก่
        makeItem(8, 1, 'อาหารแห้ง'),   // ข้าวสาร
      ],
      10, // discount 10 baht
    ),
    makeOrder(
      'RCP-TD004',
      'RCP-10023404',
      createDate(0, 16, 20),
      'วิภาดา รักบริการ',
      [
        makeItem(9, 2, 'ของสด'),       // นมสด
        makeItem(7, 3, 'เบเกอรี่'),    // ครัวซองต์
        makeItem(1, 5, 'เครื่องดื่ม'), // น้ำดื่ม
      ],
    ),
    // Yesterday
    makeOrder(
      'RCP-YD001',
      'RCP-10022410',
      createDate(1, 10, 10),
      'สมชาย ใจดี',
      [
        makeItem(8, 2, 'อาหารแห้ง'),   // ข้าวสาร
      ],
    ),
    makeOrder(
      'RCP-YD002',
      'RCP-10022411',
      createDate(1, 14, 25),
      'วิภาดา รักบริการ',
      [
        makeItem(3, 3, 'เครื่องดื่ม'), // กาแฟ
        makeItem(10, 2, 'ขนม'),        // ช็อกโกแลต
        makeItem(4, 2, 'อาหารแห้ง'),   // มาม่า
      ],
    ),
    makeOrder(
      'RCP-YD003',
      'RCP-10022412',
      createDate(1, 18, 50),
      'สมชาย ใจดี',
      [
        makeItem(1, 6, 'เครื่องดื่ม'), // น้ำดื่ม
        makeItem(6, 5, 'เครื่องดื่ม'), // โค้ก
        makeItem(2, 2, 'เบเกอรี่'),    // ขนมปัง
        makeItem(5, 2, 'ของสด'),       // ไข่ไก่
      ],
      20, // discount 20 baht
    ),
    // 3 Days Ago
    makeOrder(
      'RCP-P3001',
      'RCP-10020101',
      createDate(3, 11, 20),
      'วิภาดา รักบริการ',
      [
        makeItem(10, 3, 'ขนม'),        // ช็อกโกแลต
        makeItem(7, 2, 'เบเกอรี่'),    // ครัวซองต์
      ],
    ),
    // 5 Days Ago
    makeOrder(
      'RCP-P5001',
      'RCP-10018021',
      createDate(5, 15, 40),
      'สมชาย ใจดี',
      [
        makeItem(8, 1, 'อาหารแห้ง'),   // ข้าวสาร
        makeItem(3, 4, 'เครื่องดื่ม'), // กาแฟ
      ],
    ),
  ];
}
