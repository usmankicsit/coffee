'use client';

import type { Product, SellingTag } from '@/lib/types';

const TAG_CLASS: Record<SellingTag, string> = {
  MOST_SELLING: 'product-tag most-selling',
  TOP_LISTED: 'product-tag top-listed',
  POPULAR: 'product-tag popular',
};

export function ProductSellingTag({ product }: { product: Product }) {
  if (!product.sellingTag || !product.sellingLabel) return null;
  return (
    <span className={TAG_CLASS[product.sellingTag]}>{product.sellingLabel}</span>
  );
}

export function ProductRatingBadge({ product }: { product: Product }) {
  if (!product.ratingAvg || !product.ratingCount) return null;
  return (
    <span className="rating-badge">
      ★ {product.ratingAvg} ({product.ratingCount})
    </span>
  );
}
