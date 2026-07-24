'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
// import { PaginationBar } from '@/components/ListControls';
import { ProductRatingBadge, ProductSellingTag } from '@/components/ProductBadges';
import { api, ApiError } from '@/lib/api';
import { money } from '@/lib/format';
import {
  downloadInvoice,
  printInvoice,
  printKitchenTicket,
} from '@/lib/print-invoice';
import {
  BAUD_OPTIONS,
  connectSerialPrinter,
  connectUsbPrinter,
  disconnectPosPrinter,
  getPrinterPrefs,
  isPrinterConnected,
  isWebSerialSupported,
  isWebUsbSupported,
  openCashDrawerOnly,
  setPrinterPrefs,
  testPrintReceipt,
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

function PosPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const waiterOrderId = searchParams.get('waiterOrderId');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [pendingWaiterOrder, setPendingWaiterOrder] = useState<Order | null>(
    null,
  );
  const [printerReady, setPrinterReady] = useState(false);
  const [prefs, setPrefs] = useState<PrinterPrefs>(DEFAULT_SAFE_PREFS);
  const [printerMsg, setPrinterMsg] = useState('');
  const [payOk, setPayOk] = useState('');
  const [hwOpen, setHwOpen] = useState(false);
  const hwRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPrefs(getPrinterPrefs());
    tryReconnectPosPrinter().then((ok) => setPrinterReady(ok));
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!hwRef.current?.contains(e.target as Node)) setHwOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
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

  /** Load unpaid waiter order into cart when opened from Waiter orders. */
  useEffect(() => {
    if (!waiterOrderId || !products.length) return;
    let cancelled = false;
    setError('');
    api<Order>(`/orders/${waiterOrderId}`)
      .then((order) => {
        if (cancelled) return;
        if (order.source !== 'WAITER') {
          setError('This is not a waiter order.');
          return;
        }
        if (order.paymentStatus === 'PAID') {
          setError(`${order.orderNumber} is already paid.`);
          setPendingWaiterOrder(null);
          return;
        }
        const lines: CartItem[] = (order.items || []).map((item) => {
          const found = products.find((p) => p.id === item.productId);
          const product: Product =
            found ||
            ({
              id: item.productId,
              name: item.productName,
              price: item.unitPrice,
              categoryId: '',
              isAvailable: true,
            } as Product);
          return { product, quantity: item.quantity };
        });
        setPendingWaiterOrder(order);
        setCart(lines);
        setPayOk('');
        setPrinterMsg(
          `${order.orderNumber} loaded — print Kitchen first if needed, then collect payment.`,
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : 'Failed to load waiter order',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [waiterOrderId, products]);

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

  const subtotal = pendingWaiterOrder
    ? Number(pendingWaiterOrder.subtotal)
    : cart.reduce(
        (sum, line) => sum + Number(line.product.price) * line.quantity,
        0,
      );
  const taxPercent = Number(shop?.taxPercent ?? 0);
  const tax = pendingWaiterOrder
    ? Number(pendingWaiterOrder.tax)
    : Math.round(subtotal * (taxPercent / 100) * 100) / 100;
  const total = pendingWaiterOrder
    ? Number(pendingWaiterOrder.total)
    : Math.round((subtotal + tax) * 100) / 100;

  const cartLocked = Boolean(pendingWaiterOrder);

  /** Newest items first; bumping qty moves line to top. */
  function addToCart(product: Product) {
    if (cartLocked) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        const updated = {
          ...existing,
          quantity: existing.quantity + 1,
        };
        return [updated, ...prev.filter((l) => l.product.id !== product.id)];
      }
      return [{ product, quantity: 1 }, ...prev];
    });
  }

  function setQty(productId: string, quantity: number) {
    if (cartLocked) return;
    setCart((prev) =>
      prev
        .map((l) =>
          l.product.id === productId ? { ...l, quantity } : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }

  function clearCart() {
    setCart([]);
    setPendingWaiterOrder(null);
    if (waiterOrderId) router.replace('/pos');
  }

  async function printKitchenForPending() {
    if (!pendingWaiterOrder) return;
    setPrinterMsg('');
    try {
      await printKitchenTicket(pendingWaiterOrder, shop);
      setPrinterMsg(`Kitchen slip printed for ${pendingWaiterOrder.orderNumber}.`);
    } catch (err) {
      setPrinterMsg(
        err instanceof Error ? err.message : 'Kitchen print failed',
      );
    }
  }

  /** Kitchen ticket from current cart (or open waiter order). */
  function draftKitchenOrder(): Order | null {
    if (pendingWaiterOrder) return pendingWaiterOrder;
    if (!cart.length) return null;
    return {
      id: 'pos-cart-draft',
      orderNumber: 'CART',
      status: 'PENDING',
      source: 'POS',
      paymentMethod: null,
      paymentStatus: 'UNPAID',
      subtotal,
      tax,
      total,
      note: null,
      createdById: '',
      items: cart.map((line, index) => ({
        id: `draft-${index}`,
        productId: line.product.id,
        productName: line.product.name,
        quantity: line.quantity,
        unitPrice: line.product.price,
        lineTotal: Number(line.product.price) * line.quantity,
      })),
      createdAt: new Date().toISOString(),
    };
  }

  async function printKitchenFromCart() {
    const order = draftKitchenOrder() || lastOrder;
    if (!order) return;
    setPrinterMsg('');
    try {
      await printKitchenTicket(order, shop);
      setPrinterMsg(
        order.id === 'pos-cart-draft'
          ? 'Kitchen ticket printed for current cart.'
          : `Kitchen slip printed for ${order.orderNumber}.`,
      );
    } catch (err) {
      setPrinterMsg(
        err instanceof Error ? err.message : 'Kitchen print failed',
      );
    }
  }

  async function handleConnectPrinter() {
    setPrinterMsg('');
    try {
      if (isWebUsbSupported()) {
        const name = await connectUsbPrinter();
        setPrinterReady(true);
        setPrinterMsg(
          `Connected: ${name}. Click Test print. If claim fails, remove the printer from macOS Printers & Scanners first.`,
        );
        return;
      }
      await connectSerialPrinter();
      setPrinterReady(true);
      setPrinterMsg('Serial printer connected.');
    } catch (err) {
      setPrinterReady(false);
      setPrinterMsg(
        err instanceof Error ? err.message : 'Could not connect printer',
      );
    }
  }

  async function handleConnectSerialFallback() {
    setPrinterMsg('');
    try {
      await connectSerialPrinter();
      setPrinterReady(true);
      setPrinterMsg(
        'Serial connected. Only pick a port named like POS80 / USB — never Bluetooth or Quantum.',
      );
    } catch (err) {
      setPrinterReady(false);
      setPrinterMsg(
        err instanceof Error ? err.message : 'Could not connect serial port',
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

  async function handleTestPrint() {
    setPrinterMsg('');
    try {
      if (!isPrinterConnected()) {
        const ok = await tryReconnectPosPrinter();
        setPrinterReady(ok);
        if (!ok) throw new Error('Connect the printer first.');
      }
      await testPrintReceipt();
      setPrinterMsg(
        'Test print sent. Look for "PRINT TEST OK" / "HELLO FROM BREW AND BEAN" on paper.',
      );
    } catch (err) {
      setPrinterMsg(err instanceof Error ? err.message : 'Test print failed');
    }
  }

  async function handleBaudChange(baudRate: number) {
    setPrefs(setPrinterPrefs({ baudRate }));
    setPrinterMsg(
      `Baud set to ${baudRate}. Click Disconnect, then Connect printer again.`,
    );
  }

  async function checkout(paymentMethod: PaymentMethod) {
    if (!cart.length && !pendingWaiterOrder) return;
    setBusy(true);
    setError('');
    setPayOk('');
    try {
      let order: Order;

      if (pendingWaiterOrder) {
        order = await api<Order>(`/orders/${pendingWaiterOrder.id}/pay`, {
          method: 'PATCH',
          body: JSON.stringify({ paymentMethod }),
        });
        setPendingWaiterOrder(null);
        router.replace('/pos');
      } else {
        order = await api<Order>('/orders', {
          method: 'POST',
          body: JSON.stringify({
            paymentMethod,
            items: cart.map((l) => ({
              productId: l.product.id,
              quantity: l.quantity,
            })),
          }),
        });
      }

      setCart([]);
      setLastOrder(order);
      setPayOk(
        paymentMethod === 'CARD'
          ? `Debit card payment recorded — ${order.orderNumber}`
          : `Cash payment recorded — ${order.orderNumber}`,
      );
      setBusy(false);

      void api<Product[]>('/products/menu')
        .then(setProducts)
        .catch(() => undefined);

      const p = getPrinterPrefs();
      const shouldPrint =
        p.autoPrintOnCash &&
        (paymentMethod === 'CASH' || paymentMethod === 'CARD');
      const shouldDrawer =
        paymentMethod === 'CASH' && p.openDrawerOnCash;

      if (shouldPrint || shouldDrawer) {
        void (async () => {
          try {
            if (!isPrinterConnected()) {
              await tryReconnectPosPrinter();
            }
            if (!isPrinterConnected()) {
              setPrinterMsg(
                'Sale saved, but printer is not connected. Open printer settings, then Print invoice.',
              );
              return;
            }
            await printInvoice(order, shop, {
              openDrawer: shouldDrawer,
            });
            try {
              await printKitchenTicket(order, shop);
              setPrinterMsg(
                shouldDrawer
                  ? 'Customer + kitchen printed; cash drawer opened.'
                  : 'Customer + kitchen tickets printed.',
              );
            } catch {
              setPrinterMsg(
                shouldDrawer
                  ? 'Customer receipt printed and cash drawer opened.'
                  : 'Customer receipt printed.',
              );
            }
          } catch (printErr) {
            setPrinterMsg(
              printErr instanceof Error
                ? `Sale saved, but print failed: ${printErr.message}`
                : 'Sale saved, but print failed.',
            );
          }
        })();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Checkout failed');
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="pos-page">
      <div className="page-header">
        <div>
          <h1>Point of Sale</h1>
          <p>
            {pendingWaiterOrder
              ? `Waiter order ${pendingWaiterOrder.orderNumber} — ${pendingWaiterOrder.note || 'table'} (unpaid)`
              : `${shop?.name || 'Coffee Shop'} — tap items to add to cart`}
          </p>
        </div>
        <div className="pos-hardware-bar" ref={hwRef}>
          {isWebUsbSupported() || isWebSerialSupported() ? (
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
              <label className="pos-pref pos-pref-inline">
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
              <div className="pos-hw-menu">
                <button
                  className="btn pos-hw-toggle"
                  type="button"
                  aria-expanded={hwOpen}
                  aria-haspopup="true"
                  title="Printer settings"
                  onClick={() => setHwOpen((v) => !v)}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  Printer
                </button>
                {hwOpen && (
                  <div className="pos-hw-dropdown" role="menu">
                    {printerReady ? (
                      <button
                        className="btn"
                        type="button"
                        onClick={() => void handleDisconnectPrinter()}
                      >
                        Disconnect
                      </button>
                    ) : (
                      <>
                        <button
                          className="btn btn-primary"
                          type="button"
                          onClick={() => void handleConnectPrinter()}
                        >
                          Connect USB printer
                        </button>
                        {isWebSerialSupported() && (
                          <button
                            className="btn"
                            type="button"
                            onClick={() => void handleConnectSerialFallback()}
                          >
                            Serial (advanced)
                          </button>
                        )}
                      </>
                    )}
                    <button
                      className="btn"
                      type="button"
                      onClick={() => void handleTestDrawer()}
                    >
                      Test drawer
                    </button>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => void handleTestPrint()}
                    >
                      Test print
                    </button>
                    <label className="pos-pref">
                      Baud
                      <select
                        value={prefs.baudRate}
                        onChange={(e) =>
                          void handleBaudChange(Number(e.target.value))
                        }
                      >
                        {BAUD_OPTIONS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="pos-pref">
                      <input
                        type="checkbox"
                        checked={prefs.autoPrintOnCash}
                        onChange={(e) =>
                          setPrefs(
                            setPrinterPrefs({
                              autoPrintOnCash: e.target.checked,
                            }),
                          )
                        }
                      />
                      Auto print
                    </label>
                  </div>
                )}
              </div>
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
            onClick={() => {
              void printInvoice(lastOrder, shop, {
                openDrawer: lastOrder.paymentMethod === 'CASH',
              })
                .then(() =>
                  setPrinterMsg('Customer receipt sent to printer.'),
                )
                .catch((err) =>
                  setPrinterMsg(
                    err instanceof Error ? err.message : 'Print failed',
                  ),
                );
            }}
          >
            Print invoice
          </button>
          <button
            className="btn"
            style={{ marginLeft: '0.4rem' }}
            onClick={() => {
              void printKitchenTicket(lastOrder, shop)
                .then(() => setPrinterMsg('Kitchen ticket sent to printer.'))
                .catch((err) =>
                  setPrinterMsg(
                    err instanceof Error
                      ? err.message
                      : 'Kitchen print failed',
                  ),
                );
            }}
          >
            Print kitchen
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
              {list.filtered.map((product) => (
                <button
                  key={product.id}
                  className="product-tile"
                  onClick={() => addToCart(product)}
                  disabled={
                    cartLocked ||
                    (product.inventory != null && product.inventory.quantity <= 0)
                  }
                >
                  <div className="product-tile-media">
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
          {/* Pagination hidden on POS — show full scrollable list
          <PaginationBar
            page={list.page}
            totalPages={list.totalPages}
            totalFiltered={list.totalFiltered}
            pageSize={list.pageSize}
            onPageChange={list.setPage}
          />
          */}
        </section>
        <aside className="cart-panel waiter-cart-panel pos-cart-panel">
          <h2>{pendingWaiterOrder ? 'Waiter order' : 'Cart'}</h2>
          {pendingWaiterOrder && (
            <div className="success-banner" style={{ marginBottom: '0.65rem' }}>
              {pendingWaiterOrder.orderNumber} ·{' '}
              {pendingWaiterOrder.note || 'Table'} · UNPAID
            </div>
          )}
          <div className="cart-items waiter-cart-items">
            {!cart.length && <p className="empty">Tap items to add</p>}
            {cart.map((line) => (
              <div className="cart-line" key={line.product.id}>
                <div className="cart-line-info">
                  <strong>{line.product.name}</strong>
                  {cartLocked ? (
                    <div className="qty">
                      <span>× {line.quantity}</span>
                    </div>
                  ) : (
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
                  )}
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
            <button
              className="btn btn-primary"
              type="button"
              style={{ width: '100%' }}
              disabled={
                (!cart.length && !pendingWaiterOrder && !lastOrder) || busy
              }
              onClick={() =>
                void (pendingWaiterOrder
                  ? printKitchenForPending()
                  : printKitchenFromCart())
              }
            >
              Print kitchen
            </button>
            <div className="pay-row">
              <button
                className="btn btn-pay btn-pay-cash"
                disabled={(!cart.length && !pendingWaiterOrder) || busy}
                onClick={() => checkout('CASH')}
              >
                {busy ? 'Saving…' : 'Cash'}
              </button>
              <button
                className="btn btn-pay btn-pay-card"
                disabled={(!cart.length && !pendingWaiterOrder) || busy}
                onClick={() => checkout('CARD')}
              >
                {busy ? 'Saving…' : 'Debit card'}
              </button>
            </div>
            {payOk && <div className="success-banner">{payOk}</div>}
            {lastOrder && (
              <p className="muted-note">
                Last sale: {lastOrder.orderNumber} ·{' '}
                {lastOrder.paymentMethod === 'CARD' ? 'Debit card' : 'Cash'} ·{' '}
                {money(lastOrder.total, shop?.currency)}
              </p>
            )}
            <div className="waiter-cart-footer-row">
              <p className="muted-note">Print kitchen anytime before or after pay</p>
              <button
                className="btn"
                disabled={(!cart.length && !pendingWaiterOrder) || busy}
                onClick={clearCart}
              >
                {pendingWaiterOrder ? 'Dismiss' : 'Clear'}
              </button>
            </div>
          </div>
        </aside>
      </div>
      </div>
    </AppShell>
  );
}

export default function PosPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <p className="empty">Loading POS…</p>
        </AppShell>
      }
    >
      <PosPageInner />
    </Suspense>
  );
}

const DEFAULT_SAFE_PREFS: PrinterPrefs = {
  autoPrintOnCash: true,
  openDrawerOnCash: true,
  openDrawerOnPrint: true,
  paperWidth: 48,
  baudRate: 115200,
  transport: 'usb',
};
