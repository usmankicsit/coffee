'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SiteShell } from '@/components/SiteShell';
import { ProductRatingBadge, ProductSellingTag } from '@/components/ProductBadges';
import { api, ApiError } from '@/lib/api';
import { useCart } from '@/lib/cart-context';
import { money } from '@/lib/format';
import { productImageSrc } from '@/lib/product-image';
import type { Product, ShopSettings } from '@/lib/types';

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const { add } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    Promise.all([
      api<Product[]>('/public/menu'),
      api<ShopSettings>('/public/shop'),
    ])
      .then(([products, s]) => {
        const found = products.find((p) => p.id === params.id) || null;
        setProduct(found);
        setShop(s);
        if (found) {
          setRelated(
            products
              .filter((p) => p.categoryId === found.categoryId && p.id !== found.id)
              .slice(0, 3),
          );
        }
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load product'),
      );
  }, [params?.id]);

  if (error) {
    return (
      <SiteShell>
        <div className="site-section">
          <div className="error">{error}</div>
        </div>
      </SiteShell>
    );
  }

  if (!product) {
    return (
      <SiteShell>
        <div className="site-section">
          <p className="empty">Loading product…</p>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <section className="product-detail reveal">
        <div className="product-detail-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={productImageSrc(product)} alt={product.name} />
          <ProductSellingTag product={product} />
        </div>
        <div className="product-detail-copy">
          <p className="site-eyebrow">{product.category?.name || 'Menu'}</p>
          <h1>{product.name}</h1>
          <ProductRatingBadge product={product} />
          <p className="product-detail-price">
            {money(product.price, shop?.currency)}
          </p>
          <p className="product-detail-desc">
            {product.description ||
              'Crafted fresh to order with our house beans and seasonal ingredients.'}
          </p>
          <div className="product-detail-actions">
            <div className="qty">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                −
              </button>
              <span>{qty}</span>
              <button type="button" onClick={() => setQty((q) => q + 1)}>
                +
              </button>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                add(product, qty);
                setAdded(true);
              }}
            >
              Add to cart
            </button>
          </div>
          {added && (
            <p className="success-banner">
              Added to cart.{' '}
              <Link href="/cart">Go to cart</Link> or keep{' '}
              <Link href="/menu">browsing</Link>.
            </p>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="site-section reveal">
          <div className="site-section-head">
            <h2>You may also like</h2>
          </div>
          <div className="site-product-grid">
            {related.map((item) => (
              <Link key={item.id} href={`/menu/${item.id}`} className="site-product-card">
                <div className="site-product-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={productImageSrc(item)} alt={item.name} />
                </div>
                <div className="site-product-body">
                  <strong>{item.name}</strong>
                  <span className="site-price">{money(item.price, shop?.currency)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </SiteShell>
  );
}
