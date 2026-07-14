'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { money } from '@/lib/format';
import type { SalesReport } from '@/lib/types';

export default function DashboardPage() {
  const [report, setReport] = useState<SalesReport | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<SalesReport>('/reports/sales')
      .then(setReport)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load report'),
      );
  }, []);

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Today&apos;s sales overview</p>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="grid-stats">
        <div className="stat">
          <label>Orders</label>
          <strong>{report?.orderCount ?? '—'}</strong>
        </div>
        <div className="stat">
          <label>Revenue</label>
          <strong>{report ? money(report.revenue) : '—'}</strong>
        </div>
        <div className="stat">
          <label>Completed</label>
          <strong>{report?.completedCount ?? '—'}</strong>
        </div>
      </div>
      <div className="stack-gap">
        <div className="card-panel">
          <h2 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>
            By status
          </h2>
          <table className="table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {report &&
                Object.entries(report.byStatus).map(([status, count]) => (
                  <tr key={status}>
                    <td>
                      <span className={`badge badge-${status}`}>{status}</span>
                    </td>
                    <td>{count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="card-panel">
          <h2 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>
            Top products
          </h2>
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {(report?.topProducts || []).map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td>{p.quantity}</td>
                  <td>{money(p.revenue)}</td>
                </tr>
              ))}
              {!report?.topProducts?.length && (
                <tr>
                  <td colSpan={3} className="empty">
                    No sales yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
