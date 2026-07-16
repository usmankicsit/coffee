import type { Product } from './types';

const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
).replace(/\/$/, '');

export const FALLBACK_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80';

const NAME_DEFAULTS: Record<string, string> = {
  Espresso:
    'https://images.unsplash.com/photo-1510590337019-5ef8d3d32116?auto=format&fit=crop&w=600&q=80',
  Americano:
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
  Latte:
    'https://images.unsplash.com/photo-1561882468-9110e03e0f78?auto=format&fit=crop&w=600&q=80',
  Cappuccino:
    'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80',
  'Flat White':
    'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80',
  'Drip Coffee':
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80',
  'Cold Brew':
    'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80',
  Croissant:
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
  'Blueberry Muffin':
    'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=600&q=80',
  'Chocolate Cookie':
    'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=600&q=80',
};

/** Display image: custom upload/URL, else name-based dummy, else fallback. */
export function productImageSrc(product: Pick<Product, 'name' | 'imageUrl'>) {
  if (product.imageUrl) {
    if (product.imageUrl.startsWith('http')) return product.imageUrl;
    return `${API_ORIGIN}${product.imageUrl}`;
  }
  return NAME_DEFAULTS[product.name] || FALLBACK_PRODUCT_IMAGE;
}

export function hasCustomImage(product: Pick<Product, 'imageUrl'>) {
  return Boolean(product.imageUrl);
}
