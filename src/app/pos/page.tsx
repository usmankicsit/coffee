'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PaginationBar } from '@/components/ListControls';
import { ProductRatingBadge, ProductSellingTag } from '@/components/ProductBadges';
import { api, ApiError } from '@/lib/api';
import { money } from '@/lib/format';
import { printInvoice, downloadInvoice } from '@/lib/print-invoice';
import {
  connectPosPrinter,
  disconnectPosPrinter,
  getPrinterPrefs,
  isPrinterConnected,
  isWebSerialSupported,
  openCashDrawerOnly,
  setPrinterPrefs,
  tryReconnectPosPrinter,
  type PrinterPrefs,
} from '@/lib/pos-printer';
import { productImageSrc } from '@/lib/product-image';
import { usePagedList } from '@/lib/use-paged-list';
import type {
  CartItem,
  Category,
  Order,
  PaymentMethod,
  Product,
  ShopSettings,
} from '@/lib/types';

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [printerReady, setPrinterReady] = useState(false);
  const [prefs, setPrefs] = useState<PrinterPrefs>(DEFAULT_SAFE_PREFS);
  const [printerMsg, setPrinterMsg] = useState('');

  useEffect(() => {
    setPrefs(getPrinterPrefs());
    tryReconnectPosPrinter().then((ok) => setPrinterReady(ok));
  }, []);

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
        return prev.map((l) =>
          l.product.id === product.id
            ? { ...l, quantity: l.quantity + 1 }
            : l,
        );
      }
      return [...prev, { product, quantity: 1 }];
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

  async function handleConnectPrinter() {
    setPrinterMsg('');
    try {
      await connectPosPrinter();
      setPrinterReady(true);
      setPrinterMsg('Printer connected. Cash drawer will open with Cash sales / Print.');
    } catch (err) {
      setPrinterReady(false);
      setPrinterMsg(
        err instanceof Error ? err.message : 'Could not connect printer',
      );
    }
  }

  async function handleDisconnectPrinter() {
    await disconnectPosPrinter();
    setPrinterReady(false);
    setPrinterMsg('Printer disconnected.');
  }

  async function handleTestDrawer() {
    setPrinterMsg('');
    try {
      if (!isPrinterConnected()) {
        const ok = await tryReconnectPosPrinter();
        setPrinterReady(ok);
        if (!ok) throw new Error('Connect the printer first.');
      }
      await openCashDrawerOnly();
      setPrinterMsg('Cash drawer kick sent.');
    } catch (err) {
      setPrinterMsg(err instanceof Error ? err.message : 'Drawer test failed');
    }
  }

  async function checkout(paymentMethod: PaymentMethod) {
    if (!cart.length) return;
    setBusy(true);
    setError('');
    try {
      const order = await api<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          paymentMethod,
          items: cart.map((l) => ({
            productId: l.product.id,
            quantity: l.quantity,
          })),
        }),
      });
      setCart([]);
      setLastOrder(order);
      const refreshed = await api<Product[]>('/products/menu');
      setProducts(refreshed);

      const p = getPrinterPrefs();
      const shouldPrint =
        p.autoPrintOnCash &&
        (paymentMethod === 'CASH' || paymentMethod === 'CARD');
      const shouldDrawer =
        paymentMethod === 'CASH' && p.openDrawerOnCash;

      if (shouldPrint || shouldDrawer) {
        try {
          if (!isPrinterConnected()) {
            await tryReconnectPosPrinter();
          }
          if (isPrinterConnected()) {
            await printInvoice(order, shop, {
              openDrawer: shouldDrawer,
            });
          } else if (shouldPrint) {
            await printInvoice(order, shop, { openDrawer: false });
          }
        } catch {
          /* sale already succeeded — print errors are non-fatal */
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Checkout failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1>Point of Sale</h1>
          <p>{shop?.name || 'Coffee Shop'} — tap items to add to cart</p>
        </div>
        <div className="pos-hardware-bar">
          {isWebSerialSupported() ? (
            <>
              <span
                className={`printer-status${printerReady ? ' on' : ''}`}
                title={
                  printerReady
                    ? 'Thermal printer connected'
                    : 'No printer connected'
                }
              >
                {printerReady ? 'Printer linked' : 'Printer off'}
              </span>
              {printerReady ? (
                <button className="btn" type="button" onClick={handleDisconnectPrinter}>
                  Disconnect
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={handleConnectPrinter}
                >
                  Connect printer
                </button>
              )}
              <button className="btn" type="button" onClick={handleTestDrawer}>
                Test drawer
              </button>
              <label className="pos-pref">
                <input
                  type="checkbox"
                  checked={prefs.autoPrintOnCash}
                  onChange={(e) =>
                    setPrefs(
                      setPrinterPrefs({ autoPrintOnCash: e.target.checked }),
                    )
                  }
                />
                Auto print
              </label>
              <label className="pos-pref">
                <input
                  type="checkbox"
                  checked={prefs.openDrawerOnCash}
                  onChange={(e) =>
                    setPrefs(
                      setPrinterPrefs({ openDrawerOnCash: e.target.checked }),
                    )
                  }
                />
                Open drawer on Cash
              </label>
            </>
          ) : (
            <span className="muted-note">
              Use Chrome/Edge on this PC to connect the receipt printer.
            </span>
          )}
        </div>
      </div>
      {printerMsg && <div className="success-banner">{printerMsg}</div>}
      {error && <div className="error">{error}</div>}
      {lastOrder && (
        <div className="success-banner">
          Sale <strong>{lastOrder.orderNumber}</strong> complete —{' '}
          {money(lastOrder.total, shop?.currency)}
          <button
            className="btn btn-primary"
            style={{ marginLeft: '0.75rem' }}
            onClick={() =>
              void printInvoice(lastOrder, shop, {
                openDrawer: lastOrder.paymentMethod === 'CASH',
              })
            }
          >
            Print invoice
          </button>
          <button
            className="btn"
            onClick={() => downloadInvoice(lastOrder, shop)}
          >
            Download invoice
          </button>
        </div>
      )}
      <div className="pos-layout">
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
              {list.pageItems.map((product) => (
                <button
                  key={product.id}
                  className="product-tile"
                  onClick={() => addToCart(product)}
                  disabled={
                    product.inventory != null && product.inventory.quantity <= 0
                  }
                >
                  <div className="product-tile-media">
                    <img
                      src={productImageSrc(product)}
                      alt={product.name}
                      className="product-tile-image"
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
              {!list.pageItems.length && (
                <p className="empty">No products match your search.</p>
              )}
            </div>
          </div>
          <PaginationBar
            page={list.page}
            totalPages={list.totalPages}
            totalFiltered={list.totalFiltered}
            pageSize={list.pageSize}
            onPageChange={list.setPage}
          />
        </section>
        <aside className="cart-panel">
          <h2>Cart</h2>
          <div className="cart-items">
            {!cart.length && <p className="empty">Cart is empty</p>}
            {cart.map((line) => (
              <div className="cart-line" key={line.product.id}>
                <div>
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
                <div>
                  {money(
                    Number(line.product.price) * line.quantity,
                    shop?.currency,
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="cart-footer">
            <div className="cart-totals">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal</span>
                <span>{money(subtotal, shop?.currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tax ({taxPercent}%)</span>
                <span>{money(tax, shop?.currency)}</span>
              </div>
              <div className="total">
                <span>Total</span>
                <span>{money(total, shop?.currency)}</span>
              </div>
            </div>
            <div className="pay-row">
              <button
                className="btn btn-primary"
                disabled={!cart.length || busy}
                onClick={() => checkout('CASH')}
              >
                Cash
              </button>
              <button
                className="btn btn-primary"
                disabled={!cart.length || busy}
                onClick={() => checkout('CARD')}
              >
                Card
              </button>
            </div>
            <button
              className="btn"
              disabled={!cart.length || busy}
              onClick={() => setCart([])}
            >
              Clear cart
            </button>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

const DEFAULT_SAFE_PREFS: PrinterPrefs = {
  autoPrintOnCash: true,
  openDrawerOnCash: true,
  openDrawerOnPrint: true,
  paperWidth: 42,
};
