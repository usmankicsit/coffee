'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { InvoiceActions } from '@/components/InvoiceActions';
import { AppShell } from '@/components/AppShell';
import { CustomSelect } from '@/components/CustomSelect';
import { IconButton } from '@/components/IconButton';
import { ListToolbar, PaginationBar } from '@/components/ListControls';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { money } from '@/lib/format';
import { printInvoice, printKitchenTicket } from '@/lib/print-invoice';
import { usePagedList } from '@/lib/use-paged-list';
import type {
  Order,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  ShopSettings,
} from '@/lib/types';

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: 'PREPARING',
  PREPARING: 'COMPLETED',
  READY: 'COMPLETED', // legacy
};

function statusLabel(status: OrderStatus) {
  if (status === 'READY') return 'PREPARING';
  return status;
}

function sourceLabel(order: Order) {
  if (order.source === 'ONLINE') return 'Online';
  if (order.source === 'WAITER') return 'Waiter';
  return 'Walk-in';
}

export default function OrdersPage() {
  const { isWaiter, isCashier, isAdmin } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState({
    orderCount: 0,
    revenue: 0,
    unpaidCount: 0,
  });
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [data, s] = await Promise.all([
        api<{
          orderCount: number;
          revenue: number;
          unpaidCount?: number;
          orders: Order[];
        }>('/orders/today/summary'),
        api<ShopSettings>('/shop'),
      ]);
      // Newest first; waiters only see waiter table orders
      let sorted = [...data.orders].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      if (isWaiter) {
        sorted = sorted.filter((o) => o.source === 'WAITER');
      }
      setOrders(sorted);
      setSummary({
        orderCount: isWaiter ? sorted.length : data.orderCount,
        revenue: isWaiter
          ? sorted
              .filter((o) => o.paymentStatus !== 'UNPAID')
              .reduce((sum, o) => sum + Number(o.total), 0)
          : data.revenue,
        unpaidCount: isWaiter
          ? sorted.filter((o) => o.paymentStatus === 'UNPAID').length
          : data.unpaidCount || 0,
      });
      setShop(s);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load orders');
    }
  }, [isWaiter]);

  useEffect(() => {
    if (isWaiter) setSourceFilter('WAITER');
  }, [isWaiter]);

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [load]);

  const filteredBySelects = useMemo(
    () =>
      orders.filter((order) => {
        if (isWaiter && order.source !== 'WAITER') return false;
        if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;
        if (isWaiter) return true;
        if (sourceFilter === 'UNPAID') {
          return order.paymentStatus === 'UNPAID';
        }
        if (sourceFilter !== 'ALL' && (order.source || 'POS') !== sourceFilter) {
          return false;
        }
        return true;
      }),
    [orders, statusFilter, sourceFilter, isWaiter],
  );

  const filterFn = useCallback((order: Order, q: string) => {
    if (!q) return true;
    const items = (order.items || [])
      .map((i) => i.productName)
      .join(' ')
      .toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(q) ||
      (order.createdBy?.name || '').toLowerCase().includes(q) ||
      (order.createdBy?.email || '').toLowerCase().includes(q) ||
      (order.note || '').toLowerCase().includes(q) ||
      items.includes(q) ||
      (order.paymentMethod || '').toLowerCase().includes(q)
    );
  }, []);

  const list = usePagedList(filteredBySelects, filterFn);

  async function updateStatus(id: string, status: OrderStatus) {
    setError('');
    try {
      await api(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    }
  }

  async function collectPay(order: Order, paymentMethod: PaymentMethod) {
    setError('');
    setMsg('');
    setPayingId(order.id);
    try {
      const paid = await api<Order>(`/orders/${order.id}/pay`, {
        method: 'PATCH',
        body: JSON.stringify({ paymentMethod }),
      });
      setMsg(
        `${paid.orderNumber} paid (${paymentMethod}). Printing customer + kitchen…`,
      );
      await load();
      try {
        await printInvoice(paid, shop, {
          openDrawer: paymentMethod === 'CASH',
        });
        await printKitchenTicket(paid, shop);
        setMsg(`${paid.orderNumber} paid and printed.`);
      } catch (printErr) {
        setMsg(
          printErr instanceof Error
            ? `Paid, but print failed: ${printErr.message}`
            : 'Paid, but print failed. Use Print buttons.',
        );
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Payment failed');
    } finally {
      setPayingId(null);
    }
  }

  async function deleteOrder(id: string) {
    if (!confirm('Delete this order permanently?')) return;
    setError('');
    try {
      await api(`/orders/${id}`, { method: 'DELETE' });
      setMsg('Order deleted.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed');
    }
  }

  return (
    <AppShell>
      <div className="page-stack">
        <div className="page-header">
          <div>
            <h1>Today&apos;s Orders</h1>
            <p>
              {isWaiter
                ? 'Only your waiter table orders — newest first'
                : 'Counter, waiter table, and online — newest first'}
            </p>
          </div>
          <button className="btn" onClick={load}>
            Refresh
          </button>
        </div>
        {error && <div className="error">{error}</div>}
        {msg && <div className="success-banner">{msg}</div>}
        <div className="grid-stats">
          <div className="stat">
            <label>Orders today</label>
            <strong>{summary.orderCount}</strong>
          </div>
          <div className="stat">
            <label>Revenue (paid)</label>
            <strong>{money(summary.revenue, shop?.currency)}</strong>
          </div>
          <div className="stat">
            <label>Unpaid waiter</label>
            <strong>{summary.unpaidCount}</strong>
          </div>
        </div>
        <div className="list-panel">
          <ListToolbar
            search={list.search}
            onSearchChange={(v) => {
              list.setSearch(v);
            }}
            searchPlaceholder="Search order #, waiter, table, item…"
          >
            <CustomSelect
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                list.setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All statuses' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'PREPARING', label: 'Preparing' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
            {!isWaiter && (
              <CustomSelect
                aria-label="Filter by source"
                value={sourceFilter}
                onChange={(v) => {
                  setSourceFilter(v as OrderSource | 'ALL' | 'UNPAID');
                  list.setPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'All sources' },
                  { value: 'UNPAID', label: 'Unpaid waiter' },
                  { value: 'POS', label: 'Walk-in / POS' },
                  { value: 'WAITER', label: 'Waiter table' },
                  { value: 'ONLINE', label: 'Online' },
                ]}
              />
            )}
          </ListToolbar>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Source</th>
                  <th>Customer / Table</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Pay</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.pageItems.map((order) => {
                  const next = NEXT_STATUS[order.status];
                  const unpaid = order.paymentStatus === 'UNPAID';
                  return (
                    <tr key={order.id}>
                      <td>
                        <strong>{order.orderNumber}</strong>
                        <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-PENDING">
                          {sourceLabel(order)}
                        </span>
                      </td>
                      <td>
                        {order.source === 'ONLINE' ? (
                          <>
                            <strong>{order.createdBy?.name || '—'}</strong>
                            <div className="customer-contact">
                              {order.createdBy?.phone && (
                                <a href={`tel:${order.createdBy.phone}`}>
                                  {order.createdBy.phone}
                                </a>
                              )}
                              {(order.createdBy?.address ||
                                order.createdBy?.city) && (
                                <span>
                                  {[order.createdBy.address, order.createdBy.city]
                                    .filter(Boolean)
                                    .join(', ')}
                                </span>
                              )}
                            </div>
                          </>
                        ) : order.source === 'WAITER' ? (
                          <>
                            <strong>{order.note || 'Table order'}</strong>
                            <div className="muted-note">
                              Waiter: {order.createdBy?.name || '—'}
                            </div>
                          </>
                        ) : (
                          <span className="muted-note">Walk-in</span>
                        )}
                      </td>
                      <td>
                        {(order.items || [])
                          .map((i) => `${i.quantity}× ${i.productName}`)
                          .join(', ')}
                      </td>
                      <td>{money(order.total, shop?.currency)}</td>
                      <td>
                        {unpaid ? (
                          <span className="badge badge-PENDING">UNPAID</span>
                        ) : (
                          order.paymentMethod || '—'
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${statusLabel(order.status)}`}>
                          {statusLabel(order.status)}
                        </span>
                      </td>
                      <td>
                        <div className="inline-actions">
                          {unpaid && isCashier && (
                            <>
                              <IconButton
                                label="Cash"
                                icon="cash"
                                variant="success"
                                showLabel
                                disabled={payingId === order.id}
                                onClick={() => void collectPay(order, 'CASH')}
                              />
                              <IconButton
                                label="Card"
                                icon="check"
                                variant="primary"
                                showLabel
                                disabled={payingId === order.id}
                                onClick={() => void collectPay(order, 'CARD')}
                              />
                              {order.source === 'WAITER' && (
                                <IconButton
                                  label="Open"
                                  icon="open"
                                  showLabel
                                  onClick={() => {
                                    window.location.href = `/pos?waiterOrderId=${order.id}`;
                                  }}
                                />
                              )}
                              <IconButton
                                label="Kitchen"
                                icon="kitchen"
                                showLabel
                                onClick={() => {
                                  void printKitchenTicket(order, shop).catch(
                                    (err) => {
                                      setError(
                                        err instanceof Error
                                          ? err.message
                                          : 'Kitchen print failed',
                                      );
                                    },
                                  );
                                }}
                              />
                            </>
                          )}
                          {!isWaiter && next && (
                            <IconButton
                              label={next === 'COMPLETED' ? 'Done' : 'Next'}
                              icon={next === 'COMPLETED' ? 'check' : 'forward'}
                              variant="primary"
                              showLabel
                              onClick={() => updateStatus(order.id, next)}
                            />
                          )}
                          {!unpaid && <InvoiceActions order={order} shop={shop} />}
                          {unpaid && isWaiter && (
                            <IconButton
                              label="Kitchen"
                              icon="kitchen"
                              showLabel
                              onClick={() => {
                                void printKitchenTicket(order, shop).catch(
                                  (err) => {
                                    setError(
                                      err instanceof Error
                                        ? err.message
                                        : 'Kitchen print failed',
                                    );
                                  },
                                );
                              }}
                            />
                          )}
                          {!isWaiter &&
                            order.status !== 'CANCELLED' &&
                            order.status !== 'COMPLETED' && (
                              <IconButton
                                label="Cancel"
                                icon="x"
                                variant="danger"
                                showLabel
                                onClick={() =>
                                  updateStatus(order.id, 'CANCELLED')
                                }
                              />
                            )}
                          {isAdmin && (
                            <IconButton
                              label="Delete"
                              icon="trash"
                              variant="danger"
                              showLabel
                              onClick={() => void deleteOrder(order.id)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!list.pageItems.length && (
                  <tr>
                    <td colSpan={8} className="empty">
                      No orders match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginationBar
            page={list.page}
            totalPages={list.totalPages}
            totalFiltered={list.totalFiltered}
            pageSize={list.pageSize}
            onPageChange={list.setPage}
          />
        </div>
      </div>
    </AppShell>
  );
}
