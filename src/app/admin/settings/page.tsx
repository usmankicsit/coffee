'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { mediaUrl } from '@/lib/media';
import type { ShopSettings } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SettingsPage() {
  const [form, setForm] = useState({
    name: '',
    taxPercent: '',
    currency: 'PKR',
    phone: '',
    whatsapp: '',
    address: '',
    aboutText: '',
    logoUrl: '' as string | null,
  });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  function load() {
    api<ShopSettings>('/shop')
      .then((s) =>
        setForm({
          name: s.name,
          taxPercent: String(s.taxPercent),
          currency: s.currency,
          phone: s.phone || '',
          whatsapp: s.whatsapp || '',
          address: s.address || '',
          aboutText: s.aboutText || '',
          logoUrl: s.logoUrl || null,
        }),
      )
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load settings'),
      );
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    try {
      await api('/shop', {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name,
          taxPercent: Number(form.taxPercent),
          currency: form.currency,
          phone: form.phone,
          whatsapp: form.whatsapp,
          address: form.address,
          aboutText: form.aboutText,
        }),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    }
  }

  async function uploadLogo(file: File) {
    setUploading(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(`${API_URL}/api/shop/logo`, {
        method: 'POST',
        body,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Logo upload failed');
      const data = (await res.json()) as ShopSettings;
      setForm((f) => ({ ...f, logoUrl: data.logoUrl || null }));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1>Shop settings</h1>
          <p>Brand, contact, tax, and website about text</p>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      {saved && (
        <div className="success-banner">Settings saved.</div>
      )}
      <div className="card-panel" style={{ maxWidth: 640 }}>
        <form className="form-grid" onSubmit={onSubmit}>
          <div className="form-row">
            <label>Shop name / logo</label>
            <div className="inline-actions" style={{ alignItems: 'center' }}>
              {form.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaUrl(form.logoUrl)}
                  alt="Logo"
                  style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }}
                />
              ) : (
                <span className="muted-note">No logo yet</span>
              )}
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadLogo(file);
                }}
              />
              {form.logoUrl && (
                <button
                  type="button"
                  className="btn"
                  onClick={async () => {
                    await api('/shop/logo', { method: 'DELETE' });
                    setForm((f) => ({ ...f, logoUrl: null }));
                  }}
                >
                  Remove logo
                </button>
              )}
            </div>
          </div>
          <div className="form-row">
            <label>Shop name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <label>Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>WhatsApp (with country code)</label>
            <input
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="+923001234567"
            />
          </div>
          <div className="form-row">
            <label>Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>About us text</label>
            <textarea
              rows={4}
              value={form.aboutText}
              onChange={(e) => setForm({ ...form, aboutText: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Tax percent</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.taxPercent}
              onChange={(e) => setForm({ ...form, taxPercent: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <label>Currency</label>
            <input
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit">
            Save settings
          </button>
        </form>
      </div>
    </AppShell>
  );
}
