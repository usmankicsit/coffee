'use client';

import { useCallback, useEffect, useState } from 'react';
import { InvoiceActions } from '@/components/InvoiceActions';
import { AppShell } from '@/components/AppShell';
import { CustomSelect } from '@/components/CustomSelect';
import { IconButton } from '@/components/IconButton';
import { ListToolbar, PaginationBar } from '@/components/ListControls';
import { api, ApiError } from '@/lib/api';
import { money } from '@/lib/format';
import { usePagedList } from '@/lib/use-paged-list';
import type { Order, OrderSource, OrderStatus, ShopSettings } from '@/lib/types';

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: 'PREPARING',
  PREPARING: 'READY',
  READY: 'COMPLETED',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState({ orderCount: 0, revenue: 0 });
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');

  const load = useCallback(async () => {
    try {
      const [data, s] = await Promise.all([
        api<{
          orderCount: number;
          revenue: number;
          orders: Order[];
        }>('/orders/today/summary'),
        api<ShopSettings>('/shop'),
      ]);
      setOrders(data.orders);
      setSummary({ orderCount: data.orderCount, revenue: data.revenue });
      setShop(s);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load orders');
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const filteredBySelects = orders.filter((order) => {
    if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;
    if (sourceFilter !== 'ALL' && (order.source || 'POS') !== sourceFilter) {
      return false;
    }
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
      (order.createdBy?.name || '').toLowerCase().includes(q) ||
      (order.createdBy?.email || '').toLowerCase().includes(q) ||
      items.includes(q) ||
      order.paymentMethod.toLowerCase().includes(q)
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

  return (
    <AppShell>
      <div className="page-stack">
        <div className="page-header">
          <div>
            <h1>Today&apos;s Orders</h1>
            <p>All counter and online orders for today</p>
          </div>
          <button className="btn" onClick={load}>
            Refresh
          </button>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="grid-stats">
          <div className="stat">
            <label>Orders today</label>
            <strong>{summary.orderCount}</strong>
          </div>
          <div className="stat">
            <label>Revenue today</label>
            <strong>{money(summary.revenue, shop?.currency)}</strong>
          </div>
        </div>
        <div className="list-panel">
          <ListToolbar
            search={list.search}
            onSearchChange={(v) => {
              list.setSearch(v);
            }}
            searchPlaceholder="Search order #, customer, item…"
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
                { value: 'READY', label: 'Ready' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
            <CustomSelect
              aria-label="Filter by source"
              value={sourceFilter}
              onChange={(v) => {
                setSourceFilter(v as OrderSource | 'ALL');
                list.setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All sources' },
                { value: 'POS', label: 'POS' },
                { value: 'ONLINE', label: 'Online' },
              ]}
            />
          </ListToolbar>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Source</th>
                  <th>Customer</th>
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
                          {order.source || 'POS'}
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
                      <td>{order.paymentMethod}</td>
                      <td>
                        <span className={`badge badge-${order.status}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>
                        <div className="inline-actions">
                          {next && (
                            <IconButton
                              label={`Mark ${next}`}
                              icon={next === 'COMPLETED' ? 'check' : 'forward'}
                              variant="primary"
                              onClick={() => updateStatus(order.id, next)}
                            />
                          )}
                          <InvoiceActions order={order} shop={shop} />
                          {order.status !== 'CANCELLED' &&
                            order.status !== 'COMPLETED' && (
                              <IconButton
                                label="Cancel order"
                                icon="x"
                                variant="danger"
                                onClick={() =>
                                  updateStatus(order.id, 'CANCELLED')
                                }
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
