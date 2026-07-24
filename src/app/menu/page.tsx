'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { SiteShell } from '@/components/SiteShell';
import { ProductRatingBadge, ProductSellingTag } from '@/components/ProductBadges';
import { api, ApiError } from '@/lib/api';
import { useCart } from '@/lib/cart-context';
import { money } from '@/lib/format';
import { productImageSrc } from '@/lib/product-image';
import type { Category, Product, ShopSettings } from '@/lib/types';

export default function MenuPage() {
  const { add } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [categoryId, setCategoryId] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api<Product[]>('/public/menu'),
      api<Category[]>('/public/categories'),
      api<ShopSettings>('/public/shop'),
    ])
      .then(([p, c, s]) => {
        setProducts(p);
        setCategories(c);
        setShop(s);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load menu'),
      );
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryId !== 'all' && p.categoryId !== categoryId) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.category?.name || '').toLowerCase().includes(q)
      );
    });
  }, [products, categoryId, search]);

  return (
    <SiteShell>
      <section className="site-page-hero reveal">
        <h1>Menu</h1>
        <p>Search the full list, filter by category, and add items before you sign in.</p>
      </section>

      <section className="site-section reveal">
        <div className="menu-controls">
          <input
            className="menu-search"
            type="search"
            placeholder="Search drinks, pastries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="category-tabs">
            <button
              type="button"
              className={categoryId === 'all' ? 'active' : ''}
              onClick={() => setCategoryId('all')}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={categoryId === c.id ? 'active' : ''}
                onClick={() => setCategoryId(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="site-product-grid">
          {filtered.map((product, index) => (
            <article key={product.id} className="site-product-card">
              <Link href={`/menu/${product.id}`} className="site-product-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={productImageSrc(product, 'thumb')}
                  alt={product.name}
                  width={320}
                  height={240}
                  loading={index < 6 ? 'eager' : 'lazy'}
                  decoding="async"
                />
                <ProductSellingTag product={product} />
              </Link>
              <div className="site-product-body">
                <Link href={`/menu/${product.id}`}>
                  <strong>{product.name}</strong>
                </Link>
                <ProductRatingBadge product={product} />
                {product.description && (
                  <p className="site-product-desc">{product.description}</p>
                )}
                <span className="site-price">{money(product.price, shop?.currency)}</span>
                <div className="site-product-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => add(product)}
                  >
                    Add to cart
                  </button>
                  <Link href={`/menu/${product.id}`} className="btn">
                    Details
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
        {!filtered.length && <p className="empty">No products match your search.</p>}
      </section>
    </SiteShell>
  );
}
