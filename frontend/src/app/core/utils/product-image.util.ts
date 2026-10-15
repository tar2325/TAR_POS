import { Product } from '../../models/product.model';

export function getProductImageUrl(product: Product): string | undefined {
  if (product.imageUrl?.trim()) {
    return product.imageUrl.trim();
  }
  return `https://picsum.photos/seed/pos-${product.id}/240/240`;
}
