'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { IconButton } from '@/components/IconButton';
import { ListToolbar, PaginationBar } from '@/components/ListControls';
import { api, ApiError } from '@/lib/api';
import { money } from '@/lib/format';
import { usePagedList } from '@/lib/use-paged-list';
import type { Expense, ExpenseListResponse, ShopSettings } from '@/lib/types';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function ExpensesPage() {
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [from, setFrom] = useState(monthStartIso);
  const [to, setTo] = useState(todayIso);
  const [items, setItems] = useState<Expense[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    note: '',
    amount: '',
    expenseDate: todayIso(),
  });

  const load = useCallback(async () => {
    setError('');
    try {
      const qs = new URLSearchParams({ from, to });
      const data = await api<ExpenseListResponse>(`/expenses?${qs}`);
      setItems(data.items);
      setTotalAmount(data.totalAmount);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load expenses');
    }
  }, [from, to]);

  useEffect(() => {
    api<ShopSettings>('/shop').then(setShop).catch(() => null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filterFn = useCallback((row: Expense, q: string) => {
    if (!q) return true;
    return (
      row.title.toLowerCase().includes(q) ||
      (row.note || '').toLowerCase().includes(q) ||
      (row.createdBy?.name || '').toLowerCase().includes(q)
    );
  }, []);

  const list = usePagedList(items, filterFn);
  const currency = shop?.currency || 'PKR';

  const summaryLabel = useMemo(
    () => `${items.length} entries · ${money(totalAmount, currency)}`,
    [items.length, totalAmount, currency],
  );

  function resetForm() {
    setEditingId(null);
    setForm({
      title: '',
      note: '',
      amount: '',
      expenseDate: todayIso(),
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setOk('');
    try {
      const body = {
        title: form.title.trim(),
        note: form.note.trim() || undefined,
        amount: Number(form.amount),
        expenseDate: form.expenseDate,
      };
      if (editingId) {
        await api(`/expenses/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        setOk('Expense updated');
      } else {
        await api('/expenses', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setOk('Patti cash entry added');
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(row: Expense) {
    setEditingId(row.id);
    setForm({
      title: row.title,
      note: row.note || '',
      amount: String(Number(row.amount)),
      expenseDate: String(row.expenseDate).slice(0, 10),
    });
    setOk('');
    setError('');
  }

  async function remove(id: string) {
    if (!confirm('Delete this expense entry?')) return;
    setBusy(true);
    setError('');
    try {
      await api(`/expenses/${id}`, { method: 'DELETE' });
      if (editingId === id) resetForm();
      setOk('Expense deleted');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="page-stack">
        <div className="page-header">
          <div>
            <h1>Patti cash</h1>
            <p>Daily shop expenses — filter by date range</p>
          </div>
          <button className="btn" type="button" onClick={load}>
            Refresh
          </button>
        </div>

        {error && <div className="error">{error}</div>}
        {ok && <div className="success-banner">{ok}</div>}

        <form className="card-panel form-grid patti-form" onSubmit={onSubmit}>
          <div className="patti-form-grid">
            <div className="form-row">
              <label htmlFor="patti-title">Title</label>
              <input
                id="patti-title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Milk, Gas, Cleaning"
              />
            </div>
            <div className="form-row">
              <label htmlFor="patti-amount">Amount ({currency})</label>
              <input
                id="patti-amount"
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="form-row">
              <label htmlFor="patti-date">Expense date</label>
              <input
                id="patti-date"
                required
                type="date"
                className="theme-date"
                value={form.expenseDate}
                onChange={(e) =>
                  setForm({ ...form, expenseDate: e.target.value })
                }
              />
            </div>
            <div className="form-row">
              <label htmlFor="patti-note">Note (optional)</label>
              <input
                id="patti-note"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Vendor, receipt no., etc."
              />
            </div>
          </div>
          <div className="patti-form-actions">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {editingId ? 'Update expense' : 'Add patti cash'}
            </button>
            {editingId && (
              <button className="btn" type="button" onClick={resetForm}>
                Cancel edit
              </button>
            )}
          </div>
        </form>

        <div className="list-panel">
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search title, note, staff…"
          >
            <label className="inline-date">
              From
              <input
                type="date"
                className="theme-date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  list.setPage(1);
                }}
              />
            </label>
            <label className="inline-date">
              To
              <input
                type="date"
                className="theme-date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  list.setPage(1);
                }}
              />
            </label>
            <span className="muted">{summaryLabel}</span>
          </ListToolbar>

          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Title</th>
                  <th>Note</th>
                  <th>Amount</th>
                  <th>Added by</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.pageItems.map((row) => (
                  <tr key={row.id}>
                    <td>{String(row.expenseDate).slice(0, 10)}</td>
                    <td>{row.title}</td>
                    <td className="muted">{row.note || '—'}</td>
                    <td>{money(row.amount, currency)}</td>
                    <td>{row.createdBy?.name || '—'}</td>
                    <td>
                      <div className="inline-actions">
                        <IconButton
                          label="Edit"
                          icon="edit"
                          onClick={() => startEdit(row)}
                          disabled={busy}
                        />
                        <IconButton
                          label="Delete"
                          icon="trash"
                          variant="danger"
                          onClick={() => remove(row.id)}
                          disabled={busy}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {!list.pageItems.length && (
                  <tr>
                    <td colSpan={6} className="muted">
                      No expenses in this date range.
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
