'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
// import { PaginationBar } from '@/components/ListControls';
import { ProductRatingBadge, ProductSellingTag } from '@/components/ProductBadges';
import { api, ApiError } from '@/lib/api';
import { money } from '@/lib/format';
import { productImageSrc } from '@/lib/product-image';
import { usePagedList } from '@/lib/use-paged-list';
import type {
  CartItem,
  Category,
  Order,
  Product,
  ShopSettings,
} from '@/lib/types';

export default function WaiterOrderPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableLabel, setTableLabel] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  useEffect(() => {
    Promise.all([
      api<Product[]>('/products/menu'),
      api<Category[]>('/categories?activeOnly=true'),
      api<ShopSettings>('/shop'),
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

  const categoryFiltered = useMemo(() => {
    if (activeCategory === 'all') return products;
    return products.filter((p) => p.categoryId === activeCategory);
  }, [products, activeCategory]);

  const filterFn = useCallback((product: Product, q: string) => {
    if (!q) return true;
    return (
      product.name.toLowerCase().includes(q) ||
      (product.description || '').toLowerCase().includes(q) ||
      (product.category?.name || '').toLowerCase().includes(q)
    );
  }, []);

  const list = usePagedList(categoryFiltered, filterFn);

  useEffect(() => {
    list.setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  const subtotal = cart.reduce(
    (sum, line) => sum + Number(line.product.price) * line.quantity,
    0,
  );
  const taxPercent = Number(shop?.taxPercent ?? 0);
  const tax = Math.round(subtotal * (taxPercent / 100) * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        const updated = { ...existing, quantity: existing.quantity + 1 };
        return [updated, ...prev.filter((l) => l.product.id !== product.id)];
      }
      return [{ product, quantity: 1 }, ...prev];
    });
  }

  function setQty(productId: string, quantity: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product.id === productId ? { ...l, quantity } : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }

  async function sendToCashier() {
    if (!cart.length) return;
    if (!tableLabel.trim()) {
      setError('Enter the table number (e.g. Table 4)');
      return;
    }
    setBusy(true);
    setError('');
    setOk('');
    try {
      const order = await api<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          tableLabel: tableLabel.trim(),
          note: note.trim() || undefined,
          items: cart.map((l) => ({
            productId: l.product.id,
            quantity: l.quantity,
          })),
        }),
      });
      setCart([]);
      setNote('');
      setLastOrder(order);
      setOk(
        `${order.orderNumber} sent to cashier as unpaid walk-in (waiter) order. Cashier will take payment and print.`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send order');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="waiter-page">
        <div className="page-header waiter-page-header">
          <div>
            <h1>Waiter order</h1>
            <p>
              Take table orders — sent unpaid to cashier for payment &amp; print
            </p>
          </div>
        </div>
        {error && <div className="error">{error}</div>}
        {ok && <div className="success-banner">{ok}</div>}
        {lastOrder && (
          <div className="success-banner">
            Last sent: <strong>{lastOrder.orderNumber}</strong> ·{' '}
            {lastOrder.note || '—'} · {money(lastOrder.total, shop?.currency)} ·
            UNPAID
          </div>
        )}
        <div className="pos-layout waiter-layout">
          <section className="pos-menu-panel">
            <div className="pos-menu-toolbar">
              <input
                className="list-search"
                type="search"
                value={list.search}
                onChange={(e) => list.setSearch(e.target.value)}
                placeholder="Search products…"
              />
            </div>
            <div className="category-tabs">
              <button
                type="button"
                className={activeCategory === 'all' ? 'active' : ''}
                onClick={() => setActiveCategory('all')}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={activeCategory === c.id ? 'active' : ''}
                  onClick={() => setActiveCategory(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div className="pos-product-scroll">
              <div className="product-grid">
                {list.filtered.map((product) => (
                  <button
                    key={product.id}
                    className="product-tile"
                    onClick={() => addToCart(product)}
                    disabled={
                      product.inventory != null &&
                      product.inventory.quantity <= 0
                    }
                  >
                    <div className="product-tile-media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={productImageSrc(product, 'thumb')}
                        alt={product.name}
                        className="product-tile-image"
                        loading="lazy"
                        decoding="async"
                        width={320}
                        height={240}
                      />
                      <ProductSellingTag product={product} />
                    </div>
                    <div className="product-tile-body">
                      <strong>{product.name}</strong>
                      <ProductRatingBadge product={product} />
                      <span>{money(product.price, shop?.currency)}</span>
                    </div>
                  </button>
                ))}
                {!list.filtered.length && (
                  <p className="empty">No products match your search.</p>
                )}
              </div>
            </div>
            {/* Pagination hidden on waiter menu — show full scrollable list
            <PaginationBar
              page={list.page}
              totalPages={list.totalPages}
              totalFiltered={list.totalFiltered}
              pageSize={list.pageSize}
              onPageChange={list.setPage}
            />
            */}
          </section>
          <aside className="cart-panel waiter-cart-panel">
            <h2>Table order</h2>
            <div className="waiter-cart-meta">
              <div className="form-row">
                <label htmlFor="tableLabel">Table / seat *</label>
                <input
                  id="tableLabel"
                  value={tableLabel}
                  onChange={(e) => setTableLabel(e.target.value)}
                  placeholder="e.g. Table 4"
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="waiterNote">Note (optional)</label>
                <input
                  id="waiterNote"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="No onion, extra spicy…"
                />
              </div>
            </div>
            <div className="cart-items waiter-cart-items">
              {!cart.length && <p className="empty">Tap items to add</p>}
              {cart.map((line) => (
                <div className="cart-line" key={line.product.id}>
                  <div className="cart-line-info">
                    <strong>{line.product.name}</strong>
                    <div className="qty">
                      <button
                        type="button"
                        onClick={() =>
                          setQty(line.product.id, line.quantity - 1)
                        }
                      >
                        −
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setQty(line.product.id, line.quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="cart-line-price">
                    {money(
                      Number(line.product.price) * line.quantity,
                      shop?.currency,
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-footer waiter-cart-footer">
              <div className="cart-totals">
                <div
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <span>Subtotal</span>
                  <span>{money(subtotal, shop?.currency)}</span>
                </div>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <span>Tax ({taxPercent}%)</span>
                  <span>{money(tax, shop?.currency)}</span>
                </div>
                <div className="total">
                  <span>Total</span>
                  <span>{money(total, shop?.currency)}</span>
                </div>
              </div>
              <button
                className="btn btn-pay btn-pay-cash"
                style={{ width: '100%' }}
                disabled={!cart.length || busy || !tableLabel.trim()}
                onClick={() => void sendToCashier()}
              >
                {busy ? 'Sending…' : 'Send to cashier'}
              </button>
              <div className="waiter-cart-footer-row">
                <p className="muted-note">
                  Cashier collects payment &amp; prints
                </p>
                <button
                  className="btn"
                  disabled={!cart.length || busy}
                  onClick={() => setCart([])}
                >
                  Clear
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
