export interface RetailerSearchLink {
  id: string;
  name: string;
  icon: string;
  color: string;
  buildUrl: (query: string) => string;
}

export const THAI_RETAILER_SEARCH_LINKS: RetailerSearchLink[] = [
  {
    id: 'tops',
    name: 'Tops',
    icon: 'store',
    color: '#e11d48',
    buildUrl: (query) =>
      `https://www.tops.co.th/th/search?query=${encodeURIComponent(query)}`,
  },
  {
    id: 'bigc',
    name: 'Big C',
    icon: 'shopping_bag',
    color: '#16a34a',
    buildUrl: (query) =>
      `https://www.bigc.co.th/th/search?query=${encodeURIComponent(query)}`,
  },
  {
    id: 'lotus',
    name: "Lotus's",
    icon: 'local_mall',
    color: '#eab308',
    buildUrl: (query) =>
      `https://www.lotuss.com/th/search?query=${encodeURIComponent(query)}`,
  },
  {
    id: 'makro',
    name: 'Makro',
    icon: 'warehouse',
    color: '#dc2626',
    buildUrl: (query) =>
      `https://www.makroclick.com/th/search?search_query=${encodeURIComponent(query)}`,
  },
  {
    id: 'seven',
    name: '7-Eleven',
    icon: 'storefront',
    color: '#f97316',
    buildUrl: (query) =>
      `https://www.allonline.7eleven.co.th/search?keyword=${encodeURIComponent(query)}`,
  },
];

export function getRetailerSearchQuery(barcode: string, productName?: string): string {
  const normalized = barcode.replace(/\D/g, '');
  if (normalized.length >= 8) {
    return normalized;
  }
  return productName?.trim() || barcode.trim();
}

export function openRetailerSearch(link: RetailerSearchLink, query: string): void {
  const url = link.buildUrl(query);
  window.open(url, '_blank', 'noopener,noreferrer');
}
