'use client';

import { useCallback, useEffect, useState } from 'react';
import { CustomerShell } from '@/components/CustomerShell';
import { ListToolbar, PaginationBar } from '@/components/ListControls';
import { OrderFeedbackActions } from '@/components/OrderFeedbackActions';
import { CustomSelect } from '@/components/CustomSelect';
import { InvoiceActions } from '@/components/InvoiceActions';
import { api, ApiError } from '@/lib/api';
import { money } from '@/lib/format';
import { usePagedList } from '@/lib/use-paged-list';
import type { Order, ShopSettings } from '@/lib/types';

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const load = useCallback(async () => {
    try {
      const [o, s] = await Promise.all([
        api<Order[]>('/orders/mine'),
        api<ShopSettings>('/public/shop'),
      ]);
      setOrders(o);
      setShop(s);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load orders');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = orders.filter(
    (o) => statusFilter === 'ALL' || o.status === statusFilter,
  );

  const filterFn = useCallback((order: Order, q: string) => {
    if (!q) return true;
    const items = (order.items || [])
      .map((i) => i.productName)
      .join(' ')
      .toLowerCase();
    return order.orderNumber.toLowerCase().includes(q) || items.includes(q);
  }, []);

  const list = usePagedList(filtered, filterFn);

  return (
    <CustomerShell>
      <div className="page-stack">
        <div className="page-header">
          <div>
            <h1>My orders</h1>
            <p>Track status and print your receipt</p>
          </div>
          <button className="btn" onClick={load}>
            Refresh
          </button>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="list-panel">
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search order # or item…"
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
          </ListToolbar>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.pageItems.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.orderNumber}</strong>
                      <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                        {new Date(order.createdAt).toLocaleString()}
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
                      <div className="order-actions-col">
                        <InvoiceActions order={order} shop={shop} />
                        <OrderFeedbackActions order={order} onDone={load} />
                      </div>
                    </td>
                  </tr>
                ))}
                {!list.pageItems.length && (
                  <tr>
                    <td colSpan={5} className="empty">
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
    </CustomerShell>
  );
}
