'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { CustomSelect } from '@/components/CustomSelect';
import { IconButton } from '@/components/IconButton';
import { ListToolbar, PaginationBar } from '@/components/ListControls';
import { api, ApiError } from '@/lib/api';
import { usePagedList } from '@/lib/use-paged-list';
import type { User, UserRole } from '@/lib/types';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CASHIER' as UserRole,
  });

  async function load() {
    setUsers(await api<User[]>('/users'));
  }

  useEffect(() => {
    load().catch((err) =>
      setError(err instanceof ApiError ? err.message : 'Failed to load users'),
    );
  }, []);

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (activeFilter === 'ACTIVE' && !u.isActive) return false;
    if (activeFilter === 'INACTIVE' && u.isActive) return false;
    return true;
  });

  const filterFn = useCallback((u: User, q: string) => {
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  }, []);

  const list = usePagedList(filteredUsers, filterFn);

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/users', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm({ name: '', email: '', password: '', role: 'CASHIER' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Create failed');
    }
  }

  async function toggleActive(user: User) {
    await api(`/users/${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    await load();
  }

  return (
    <AppShell>
      <div className="page-stack">
        <div className="page-header">
          <div>
            <h1>Users</h1>
            <p>Create cashiers, waiters, and manage access</p>
          </div>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="card-panel">
          <h2 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>
            New user
          </h2>
          <form className="form-grid" onSubmit={createUser}>
            <div className="form-row">
              <label>Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-row">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-row">
              <label>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div className="form-row">
              <label>Role</label>
              <CustomSelect
                value={form.role}
                onChange={(v) => setForm({ ...form, role: v as UserRole })}
                options={[
                  { value: 'CASHIER', label: 'Cashier' },
                  { value: 'WAITER', label: 'Waiter' },
                  { value: 'ADMIN', label: 'Admin' },
                  { value: 'SUPER_ADMIN', label: 'Super Admin' },
                ]}
              />
            </div>
            <button className="btn btn-primary" type="submit">
              Create user
            </button>
          </form>
        </div>
        <div className="list-panel">
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search name, email, role…"
          >
            <CustomSelect
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(v) => {
                setRoleFilter(v);
                list.setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All roles' },
                { value: 'SUPER_ADMIN', label: 'Super Admin' },
                { value: 'ADMIN', label: 'Admin' },
                { value: 'CASHIER', label: 'Cashier' },
                { value: 'WAITER', label: 'Waiter' },
                { value: 'CUSTOMER', label: 'Customer' },
              ]}
            />
            <CustomSelect
              aria-label="Filter by active status"
              value={activeFilter}
              onChange={(v) => {
                setActiveFilter(v);
                list.setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All status' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
            />
          </ListToolbar>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.pageItems.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.isActive ? 'Yes' : 'No'}</td>
                    <td>
                      <div className="inline-actions">
                        <IconButton
                          label={u.isActive ? 'Disable user' : 'Enable user'}
                          icon="power"
                          variant={u.isActive ? 'default' : 'success'}
                          onClick={() => toggleActive(u)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {!list.pageItems.length && (
                  <tr>
                    <td colSpan={5} className="empty">
                      No users match your filters.
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
