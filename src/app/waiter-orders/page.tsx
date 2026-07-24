'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { CustomSelect } from '@/components/CustomSelect';
import { IconButton } from '@/components/IconButton';
import { ListToolbar, PaginationBar } from '@/components/ListControls';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { money } from '@/lib/format';
import { printKitchenTicket } from '@/lib/print-invoice';
import { usePagedList } from '@/lib/use-paged-list';
import type { Order, ShopSettings } from '@/lib/types';

export default function WaiterOrdersPage() {
  const router = useRouter();
  const { isAdmin, isWaiter } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('UNPAID');

  const load = useCallback(async () => {
    setError('');
    try {
      const [data, s] = await Promise.all([
        api<{ orders: Order[] }>('/orders/today/summary'),
        api<ShopSettings>('/shop'),
      ]);
      const waiterOnly = (data.orders || [])
        .filter((o) => o.source === 'WAITER')
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      setOrders(waiterOnly);
      setShop(s);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to load waiter orders',
      );
    }
  }, []);

  useEffect(() => {
    if (isWaiter) {
      router.replace('/waiter');
      return;
    }
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load, isWaiter, router]);

  const visible = orders.filter((o) => {
    if (filter === 'UNPAID') return o.paymentStatus === 'UNPAID';
    if (filter === 'PAID') return o.paymentStatus !== 'UNPAID';
    return true;
  });

  const filterFn = useCallback((order: Order, q: string) => {
    if (!q) return true;
    const items = (order.items || [])
      .map((i) => i.productName)
      .join(' ')
      .toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(q) ||
      (order.note || '').toLowerCase().includes(q) ||
      (order.createdBy?.name || '').toLowerCase().includes(q) ||
      items.includes(q)
    );
  }, []);

  const list = usePagedList(visible, filterFn);

  function openInPos(order: Order) {
    router.push(`/pos?waiterOrderId=${order.id}`);
  }

  async function printKitchen(order: Order) {
    setMsg('');
    setError('');
    try {
      await printKitchenTicket(order, shop);
      setMsg(`Kitchen slip printed for ${order.orderNumber}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kitchen print failed');
    }
  }

  async function deleteOrder(id: string) {
    if (!confirm('Delete this waiter order permanently?')) return;
    setError('');
    try {
      await api(`/orders/${id}`, { method: 'DELETE' });
      setMsg('Order deleted.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed');
    }
  }

  const unpaidCount = orders.filter((o) => o.paymentStatus === 'UNPAID').length;

  return (
    <AppShell>
      <div className="page-stack">
        <div className="page-header">
          <div>
            <h1>Waiter orders</h1>
            <p>
              Table orders from waiters — open in POS to pay, or print kitchen
              first
            </p>
          </div>
          <button className="btn" type="button" onClick={load}>
            Refresh
          </button>
        </div>
        {error && <div className="error">{error}</div>}
        {msg && <div className="success-banner">{msg}</div>}
        <div className="grid-stats">
          <div className="stat">
            <label>Waiter today</label>
            <strong>{orders.length}</strong>
          </div>
          <div className="stat">
            <label>Unpaid</label>
            <strong>{unpaidCount}</strong>
          </div>
        </div>
        <div className="list-panel">
          <ListToolbar
            search={list.search}
            onSearchChange={(v) => {
              list.setSearch(v);
            }}
            searchPlaceholder="Search order #, table, waiter, item…"
          >
            <CustomSelect
              aria-label="Filter payment"
              value={filter}
              onChange={(v) => {
                setFilter(v);
                list.setPage(1);
              }}
              options={[
                { value: 'UNPAID', label: 'Unpaid' },
                { value: 'PAID', label: 'Paid' },
                { value: 'ALL', label: 'All' },
              ]}
            />
          </ListToolbar>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Table</th>
                  <th>Waiter</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Pay</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.pageItems.map((order) => {
                  const unpaid = order.paymentStatus === 'UNPAID';
                  return (
                    <tr key={order.id}>
                      <td>
                        <strong>{order.orderNumber}</strong>
                        <div
                          style={{
                            color: 'var(--muted)',
                            fontSize: '0.85rem',
                          }}
                        >
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td>
                        <strong>{order.note || '—'}</strong>
                      </td>
                      <td>{order.createdBy?.name || '—'}</td>
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
                          <span className="badge badge-COMPLETED">
                            {order.paymentMethod || 'PAID'}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="inline-actions">
                          {unpaid && (
                            <IconButton
                              label="Open"
                              icon="open"
                              variant="primary"
                              showLabel
                              onClick={() => openInPos(order)}
                            />
                          )}
                          <IconButton
                            label="Kitchen"
                            icon="kitchen"
                            showLabel
                            onClick={() => void printKitchen(order)}
                          />
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
                    <td colSpan={7} className="empty">
                      No waiter orders match your filters.
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
