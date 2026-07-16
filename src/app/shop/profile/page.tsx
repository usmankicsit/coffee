'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CustomerShell } from '@/components/CustomerShell';
import { CustomSelect } from '@/components/CustomSelect';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { User } from '@/lib/types';

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
  });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
    });
  }, [user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await api<User>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      await refresh();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <CustomerShell>
      <div className="page-stack">
        <div className="page-header">
          <div>
            <h1>My profile</h1>
            <p>Phone and address used when the shop prepares your orders</p>
          </div>
        </div>
        {error && <div className="error">{error}</div>}
        {saved && <div className="success-banner">Profile updated.</div>}
        <div className="card-panel" style={{ maxWidth: 520 }}>
          <form className="form-grid" onSubmit={onSubmit}>
            <div className="form-row">
              <label>Full name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-row">
              <label>Email</label>
              <input
                className="input-disabled"
                type="email"
                value={user?.email || ''}
                disabled
                readOnly
                aria-disabled="true"
              />
              <small className="muted-note">Email cannot be changed</small>
            </div>
            <div className="form-row">
              <label>Phone</label>
              <input
                required
                minLength={7}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="form-row">
              <label>Address</label>
              <input
                required
                minLength={5}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="form-row">
              <label>City</label>
              <CustomSelect
                value={
                  form.city === 'Rawalpindi' || form.city === 'Islamabad'
                    ? form.city
                    : 'Islamabad'
                }
                onChange={(v) => setForm({ ...form, city: v })}
                options={[
                  { value: 'Islamabad', label: 'Islamabad' },
                  { value: 'Rawalpindi', label: 'Rawalpindi' },
                ]}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        </div>
      </div>
    </CustomerShell>
  );
}
