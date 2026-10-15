export const THAI_GS1_PREFIX = '885';

export function normalizeBarcode(value: string): string {
  return value.replace(/\D/g, '');
}

export function isThaiGs1Barcode(barcode: string): boolean {
  const normalized = normalizeBarcode(barcode);
  return normalized.length >= 8 && normalized.startsWith(THAI_GS1_PREFIX);
}

export interface ThaiBarcodeProduct {
  barcode: string;
  name: string;
  nameTh?: string;
  brand?: string;
  imageUrl?: string;
  categoryHints?: string;
  quantity?: string;
}
