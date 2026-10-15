const TH_EAN_PREFIX = '885';

export function calculateEan13CheckDigit(base12: string): number {
  const digits = base12.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

export function buildEan13FromNumericCode(code: string | number): string {
  const numeric = String(code).replace(/\D/g, '');
  const padded = numeric.padStart(9, '0').slice(-9);
  const base12 = `${TH_EAN_PREFIX}${padded}`;
  return `${base12}${calculateEan13CheckDigit(base12)}`;
}

/** สร้างบาร์โค้ด EAN-13 จากเลข SKU / รหัสสินค้า (ใช้ prefix 885 สำหรับไทย) */
export function generateBarcodeFromSku(sku: string, fallbackId?: number): string {
  const trimmed = sku.trim();
  if (!trimmed) {
    if (fallbackId !== undefined) {
      return buildEan13FromNumericCode(fallbackId);
    }
    throw new Error('กรุณาระบุ SKU หรือเลขสินค้า');
  }

  if (/^\d{13}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{8,12}$/.test(trimmed)) {
    const base12 = trimmed.padStart(12, '0').slice(-12);
    return `${base12}${calculateEan13CheckDigit(base12)}`;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length > 0) {
    return buildEan13FromNumericCode(digits);
  }

  if (fallbackId !== undefined) {
    return buildEan13FromNumericCode(fallbackId);
  }

  throw new Error(`ไม่สามารถสร้างบาร์โค้ดจาก SKU "${sku}"`);
}

export function suggestNextSku(existingSkus: string[]): string {
  let max = 0;
  for (const sku of existingSkus) {
    const match = sku.trim().match(/(\d+)$/);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }
  return `P${String(max + 1).padStart(3, '0')}`;
}

export interface ParsedBulkProductRow {
  line: number;
  sku: string;
  name: string;
  categoryName?: string;
  stock: number;
  price: number;
}

export function parseBulkProductText(text: string): { rows: ParsedBulkProductRow[]; errors: string[] } {
  const rows: ParsedBulkProductRow[] = [];
  const errors: string[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((rawLine, index) => {
    const lineNo = index + 1;
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      return;
    }

    const parts = line.split(/[,\t|]/).map((part) => part.trim());
    if (parts.length < 2) {
      errors.push(`บรรทัด ${lineNo}: ต้องมีอย่างน้อย SKU และชื่อสินค้า`);
      return;
    }

    const [sku, name, categoryName, stockRaw, priceRaw] = parts;
    if (!sku || !name) {
      errors.push(`บรรทัด ${lineNo}: SKU หรือชื่อสินค้าว่าง`);
      return;
    }

    const stock = stockRaw ? Number(stockRaw) : 0;
    const price = priceRaw ? Number(priceRaw) : 0;
    if (Number.isNaN(stock) || stock < 0) {
      errors.push(`บรรทัด ${lineNo}: สต็อกไม่ถูกต้อง`);
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      errors.push(`บรรทัด ${lineNo}: ราคาไม่ถูกต้อง`);
      return;
    }

    rows.push({
      line: lineNo,
      sku,
      name,
      categoryName: categoryName || undefined,
      stock,
      price,
    });
  });

  return { rows, errors };
}
