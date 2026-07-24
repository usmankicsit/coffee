'use client';

import { useCallback, useEffect, useState } from 'react';
import { InvoiceActions } from '@/components/InvoiceActions';
import { AppShell } from '@/components/AppShell';
import { CustomSelect } from '@/components/CustomSelect';
import { IconButton } from '@/components/IconButton';
import { ListToolbar, PaginationBar } from '@/components/ListControls';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { money } from '@/lib/format';
import { usePagedList } from '@/lib/use-paged-list';
import type { Order, OrderStatus, ShopSettings } from '@/lib/types';

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: 'PREPARING',
  PREPARING: 'COMPLETED',
  READY: 'COMPLETED',
};

export default function OnlineOrdersPage() {
  const { isAdmin } = useAuth();
  const [active, setActive] = useState<Order[]>([]);
  const [today, setToday] = useState<Order[]>([]);
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');

  const load = useCallback(async () => {
    try {
      const [activeOrders, allToday, s] = await Promise.all([
        api<Order[]>('/orders/online'),
        api<Order[]>('/orders/online/today'),
        api<ShopSettings>('/shop'),
      ]);
      setActive(activeOrders);
      // Newest first for today's list
      setToday(
        [...allToday].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
      setShop(s);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to load online orders',
      );
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load]);

  const baseList =
    statusFilter === 'ACTIVE'
      ? today.filter((o) =>
          ['PENDING', 'PREPARING', 'READY'].includes(o.status),
        )
      : statusFilter === 'ALL'
        ? today
        : statusFilter === 'PREPARING'
          ? today.filter((o) => o.status === 'PREPARING' || o.status === 'READY')
          : today.filter((o) => o.status === statusFilter);

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
      (order.createdBy?.phone || '').toLowerCase().includes(q) ||
      (order.createdBy?.address || '').toLowerCase().includes(q) ||
      (order.note || '').toLowerCase().includes(q) ||
      items.includes(q)
    );
  }, []);

  const list = usePagedList(baseList, filterFn);

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

  async function deleteOrder(id: string) {
    if (!confirm('Delete this order permanently?')) return;
    setError('');
    try {
      await api(`/orders/${id}`, { method: 'DELETE' });
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
            <h1>Online Orders</h1>
            <p>Customer website orders — accept and prepare here</p>
          </div>
          <button className="btn" onClick={load}>
            Refresh
          </button>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="grid-stats">
          <div className="stat">
            <label>Active online</label>
            <strong>{active.length}</strong>
          </div>
          <div className="stat">
            <label>Online today</label>
            <strong>{today.length}</strong>
          </div>
        </div>
        <div className="list-panel">
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search order #, customer, note…"
          >
            <CustomSelect
              aria-label="Filter online orders"
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                list.setPage(1);
              }}
              options={[
                { value: 'ACTIVE', label: 'Active queue' },
                { value: 'ALL', label: 'All today' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'PREPARING', label: 'Preparing' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          </ListToolbar>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.pageItems.map((order) => {
                  const next = NEXT_STATUS[order.status];
                  return (
                    <tr key={order.id}>
                      <td>
                        <strong>{order.orderNumber}</strong>
                        <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </div>
                        {order.note && (
                          <div style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>
                            Note: {order.note}
                          </div>
                        )}
                      </td>
                      <td>
                        <strong>{order.createdBy?.name}</strong>
                        <div className="customer-contact">
                          {order.createdBy?.phone && (
                            <a href={`tel:${order.createdBy.phone}`}>
                              {order.createdBy.phone}
                            </a>
                          )}
                          {order.createdBy?.email && (
                            <span>{order.createdBy.email}</span>
                          )}
                          {(order.createdBy?.address || order.createdBy?.city) && (
                            <span>
                              {[order.createdBy.address, order.createdBy.city]
                                .filter(Boolean)
                                .join(', ')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {(order.items || [])
                          .map((i) => `${i.quantity}× ${i.productName}`)
                          .join(', ')}
                      </td>
                      <td>{money(order.total, shop?.currency)}</td>
                      <td>
                        <span className={`badge badge-${order.status === 'READY' ? 'PREPARING' : order.status}`}>
                          {order.status === 'READY' ? 'PREPARING' : order.status}
                        </span>
                      </td>
                      <td>
                        <div className="inline-actions">
                          {next && (
                            <IconButton
                              label={next === 'COMPLETED' ? 'Done' : 'Next'}
                              icon={next === 'COMPLETED' ? 'check' : 'forward'}
                              variant="primary"
                              showLabel
                              onClick={() => updateStatus(order.id, next)}
                            />
                          )}
                          <InvoiceActions order={order} shop={shop} />
                          {order.status !== 'CANCELLED' &&
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
                    <td colSpan={6} className="empty">
                      No online orders match your filters.
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
