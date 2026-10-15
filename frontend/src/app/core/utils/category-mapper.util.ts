import { Category } from '../../models/category.model';
import type { OpenFoodFactsProduct } from '../../models/product-lookup.model';

const CATEGORY_RULES: { keywords: string[]; names: string[] }[] = [
  {
    keywords: ['beverage', 'drink', 'water', 'soda', 'coffee', 'tea', 'juice', 'soft-drink'],
    names: ['เครื่องดื่ม'],
  },
  {
    keywords: ['bread', 'bakery', 'pastry', 'croissant', 'cake'],
    names: ['เบเกอรี่'],
  },
  {
    keywords: ['snack', 'chocolate', 'candy', 'biscuit', 'cookie', 'confection'],
    names: ['ขนม'],
  },
  {
    keywords: ['noodle', 'pasta', 'rice', 'instant', 'cereal', 'dry'],
    names: ['อาหารแห้ง'],
  },
  {
    keywords: ['dairy', 'milk', 'egg', 'fresh', 'meat', 'yogurt', 'cheese'],
    names: ['ของสด'],
  },
  {
    keywords: [
      'personal',
      'hygiene',
      'soap',
      'shampoo',
      'tissue',
      'wipe',
      'wet-wipe',
      'ทิชชู่',
      'ผ้าเช็ด',
      'ส่วนตัว',
    ],
    names: ['ของใช้ส่วนตัว'],
  },
  {
    keywords: [
      'household',
      'cleaning',
      'detergent',
      'disinfect',
      'ทำความสะอาด',
      'ในบ้าน',
      'น้ำยา',
    ],
    names: ['ของใช้ในบ้าน'],
  },
];

export function resolveCategoryIdFromHints(
  categories: Category[],
  ...hints: (string | undefined)[]
): number | undefined {
  const text = hints.filter(Boolean).join(' ').toLowerCase();
  if (!text) {
    return categories[0]?.id;
  }

  const directMatch = categories.find((category) =>
    text.includes(category.name.toLowerCase()),
  );
  if (directMatch) {
    return directMatch.id;
  }

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      const match = categories.find((category) => rule.names.includes(category.name));
      if (match) {
        return match.id;
      }
    }
  }

  return categories[0]?.id;
}

export function buildProductNameFromOpenFoodFacts(product: {
  product_name?: string;
  product_name_th?: string;
  generic_name?: string;
  generic_name_th?: string;
  brands?: string;
  quantity?: string;
}): string {
  const baseName =
    product.product_name_th?.trim() ||
    product.product_name?.trim() ||
    product.generic_name_th?.trim() ||
    product.generic_name?.trim() ||
    '';

  const brand = product.brands?.split(',')[0]?.trim();
  const quantity = product.quantity?.trim();

  const parts = [brand, baseName, quantity].filter(Boolean);
  const uniqueParts = [...new Set(parts)];
  return uniqueParts.join(' ').trim();
}

export function buildProductNameFromThaiRecord(product: {
  name: string;
  nameTh?: string;
  brand?: string;
  quantity?: string;
}): string {
  const baseName = product.nameTh?.trim() || product.name.trim();
  const parts = [product.brand, baseName, product.quantity].filter(Boolean);
  return [...new Set(parts)].join(' ').trim();
}

export function isThailandOpenFoodFactsProduct(product: OpenFoodFactsProduct): boolean {
  const countries = product.countries_tags ?? [];
  return countries.some((tag: string) => tag.includes('thailand'));
}

