'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { CustomSelect } from '@/components/CustomSelect';
import { IconButton } from '@/components/IconButton';
import { ListToolbar, PaginationBar } from '@/components/ListControls';
import { api, ApiError } from '@/lib/api';
import { usePagedList } from '@/lib/use-paged-list';
import type { ClaimStatus, OrderClaim } from '@/lib/types';

const STATUSES: ClaimStatus[] = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'];

export default function ClaimsPage() {
  const [claims, setClaims] = useState<OrderClaim[]>([]);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<OrderClaim[]>('/claims');
      setClaims(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load claims');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    statusFilter === 'ALL'
      ? claims
      : claims.filter((c) => c.status === statusFilter);

  const filterFn = useCallback((claim: OrderClaim, q: string) => {
    if (!q) return true;
    return (
      (claim.order?.orderNumber || '').toLowerCase().includes(q) ||
      (claim.user?.name || '').toLowerCase().includes(q) ||
      (claim.user?.email || '').toLowerCase().includes(q) ||
      claim.reason.toLowerCase().includes(q) ||
      claim.details.toLowerCase().includes(q)
    );
  }, []);

  const list = usePagedList(filtered, filterFn);

  async function updateClaim(
    id: string,
    status: ClaimStatus,
    staffNote?: string,
  ) {
    setBusyId(id);
    setError('');
    try {
      await api(`/claims/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, staffNote }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell>
      <div className="page-stack">
        <div className="page-header">
          <div>
            <h1>Claims & reports</h1>
            <p>Customer issues filed against orders</p>
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
            searchPlaceholder="Search order, customer, reason…"
          >
            <CustomSelect
              aria-label="Filter claims"
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                list.setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All statuses' },
                { value: 'OPEN', label: 'Open' },
                { value: 'IN_REVIEW', label: 'In review' },
                { value: 'RESOLVED', label: 'Resolved' },
                { value: 'REJECTED', label: 'Rejected' },
              ]}
            />
          </ListToolbar>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Reason</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.pageItems.map((claim) => (
                  <tr key={claim.id}>
                    <td>
                      <strong>{claim.order?.orderNumber || '—'}</strong>
                      <div className="muted-note">
                        {new Date(claim.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td>
                      {claim.user?.name || '—'}
                      <div className="muted-note">{claim.user?.email}</div>
                    </td>
                    <td>{claim.reason}</td>
                    <td>
                      <div className="claim-details">{claim.details}</div>
                      {claim.staffNote && (
                        <div className="muted-note">Staff: {claim.staffNote}</div>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-claim-${claim.status}`}>
                        {claim.status}
                      </span>
                    </td>
                    <td>
                      <div className="inline-actions">
                        <CustomSelect
                          disabled={busyId === claim.id}
                          value={claim.status}
                          onChange={(v) => updateClaim(claim.id, v as ClaimStatus)}
                          options={STATUSES.map((s) => ({ value: s, label: s }))}
                        />
                        {(claim.status === 'OPEN' ||
                          claim.status === 'IN_REVIEW') && (
                          <IconButton
                            label="Resolve claim"
                            icon="check"
                            variant="primary"
                            disabled={busyId === claim.id}
                            onClick={() => {
                              const note = window.prompt(
                                'Optional staff note',
                                claim.staffNote || '',
                              );
                              if (note === null) return;
                              updateClaim(claim.id, 'RESOLVED', note || undefined);
                            }}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!list.pageItems.length && (
                  <tr>
                    <td colSpan={6} className="empty">
                      No claims match your filters.
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
