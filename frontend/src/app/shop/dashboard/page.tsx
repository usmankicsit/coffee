'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CustomerShell } from '@/components/CustomerShell';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { money } from '@/lib/format';
import type { Order, ShopSettings } from '@/lib/types';

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const { count } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api<Order[]>('/orders/mine'),
      api<ShopSettings>('/public/shop'),
    ])
      .then(([o, s]) => {
        setOrders(o.slice(0, 5));
        setShop(s);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load dashboard'),
      );
  }, []);

  return (
    <CustomerShell>
      <div className="page-stack">
        <div className="page-header">
          <div>
            <h1>Hi, {user?.name?.split(' ')[0] || 'there'}</h1>
            <p>Your ordering dashboard</p>
          </div>
          <div className="inline-actions">
            <Link href="/menu" className="btn btn-primary">
              Order more
            </Link>
            <Link href="/cart" className="btn">
              Cart ({count})
            </Link>
          </div>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="grid-stats">
          <div className="stat-card">
            <span>Open cart</span>
            <strong>{count}</strong>
          </div>
          <div className="stat-card">
            <span>Recent orders</span>
            <strong>{orders.length}</strong>
          </div>
        </div>
        <div className="list-panel">
          <div className="list-panel-head">
            <h2>Latest orders</h2>
          </div>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.orderNumber}</strong>
                      <div className="muted-note">
                        {new Date(order.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td>{money(order.total, shop?.currency)}</td>
                    <td>
                      <span className={`badge badge-${order.status}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!orders.length && (
                  <tr>
                    <td colSpan={3} className="empty">
                      No orders yet. <Link href="/menu">Start from the menu</Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="list-panel-foot">
            <Link href="/shop/orders" className="btn">
              View all orders
            </Link>
          </div>
        </div>
      </div>
    </CustomerShell>
  );
}
