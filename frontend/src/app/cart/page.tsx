'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { SiteShell } from '@/components/SiteShell';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { money } from '@/lib/format';
import { productImageSrc } from '@/lib/product-image';
import type { Order, ShopSettings } from '@/lib/types';

function CartContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, setQty, remove, clear, subtotal, count } = useCart();
  const { user, isCustomer, loading } = useAuth();
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const wantsCheckout = searchParams.get('checkout') === '1';

  useEffect(() => {
    api<ShopSettings>('/public/shop').then(setShop).catch(() => null);
  }, []);

  const taxPercent = Number(shop?.taxPercent ?? 0);
  const tax = Math.round(subtotal * (taxPercent / 100) * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  async function placeOrder(e?: FormEvent) {
    e?.preventDefault();
    if (!items.length) return;
    if (!user || !isCustomer) {
      router.push('/shop/login?next=/cart?checkout=1');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const created = await api<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          paymentMethod: 'CARD',
          note: note || undefined,
          items: items.map((l) => ({
            productId: l.product.id,
            quantity: l.quantity,
          })),
        }),
      });
      clear();
      setOrder(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Checkout failed');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (loading || !wantsCheckout || !items.length) return;
    if (user && isCustomer) {
      // ready to checkout — no auto submit
    }
  }, [loading, wantsCheckout, user, isCustomer, items.length]);

  return (
    <>
      <section className="site-page-hero reveal">
        <h1>Your cart</h1>
        <p>
          {count
            ? 'Review items, then sign in to place your order.'
            : 'Your cart is empty — browse the menu to get started.'}
        </p>
      </section>

      <section className="site-section cart-layout reveal">
        <div className="cart-list">
          {!items.length && !order && (
            <div className="empty">
              No items yet. <Link href="/menu">Browse menu</Link>
            </div>
          )}
          {items.map((line) => (
            <article key={line.product.id} className="cart-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={productImageSrc(line.product)} alt={line.product.name} />
              <div>
                <strong>{line.product.name}</strong>
                <div className="site-price">
                  {money(line.product.price, shop?.currency)}
                </div>
                <div className="qty">
                  <button
                    type="button"
                    onClick={() => setQty(line.product.id, line.quantity - 1)}
                  >
                    −
                  </button>
                  <span>{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQty(line.product.id, line.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="cart-row-side">
                <strong>
                  {money(Number(line.product.price) * line.quantity, shop?.currency)}
                </strong>
                <button type="button" className="btn" onClick={() => remove(line.product.id)}>
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>

        <aside className="cart-summary">
          {order ? (
            <div className="success-banner">
              <h2>Order placed</h2>
              <p>
                {order.orderNumber} · {money(order.total, shop?.currency)}
              </p>
              <Link href="/shop/dashboard" className="btn btn-primary">
                Go to dashboard
              </Link>
              <Link href="/shop/orders" className="btn">
                Track orders
              </Link>
            </div>
          ) : (
            <form className="form-grid" onSubmit={placeOrder}>
              <h2>Checkout</h2>
              <div className="totals">
                <div>
                  <span>Subtotal</span>
                  <span>{money(subtotal, shop?.currency)}</span>
                </div>
                <div>
                  <span>Tax</span>
                  <span>{money(tax, shop?.currency)}</span>
                </div>
                <div>
                  <strong>Total</strong>
                  <strong>{money(total, shop?.currency)}</strong>
                </div>
              </div>
              <div className="form-row">
                <label>Note (optional)</label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Extra hot, less sugar…"
                />
              </div>
              {error && <div className="error">{error}</div>}
              {!isCustomer && (
                <p className="muted-note">
                  You can keep shopping as a guest. Sign in or create an account
                  to place the order.
                </p>
              )}
              <button
                className="btn btn-primary"
                type="submit"
                disabled={!items.length || busy}
              >
                {busy
                  ? 'Placing order…'
                  : isCustomer
                    ? 'Place order'
                    : 'Sign in to checkout'}
              </button>
              {!isCustomer && (
                <Link href="/shop/register?next=/cart?checkout=1" className="btn">
                  Create account
                </Link>
              )}
            </form>
          )}
        </aside>
      </section>
    </>
  );
}

export default function CartPage() {
  return (
    <SiteShell>
      <Suspense fallback={<p className="empty">Loading cart…</p>}>
        <CartContent />
      </Suspense>
    </SiteShell>
  );
}
