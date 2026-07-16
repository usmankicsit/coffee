'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { IconButton } from '@/components/IconButton';
import { api, ApiError } from '@/lib/api';
import { mediaUrl } from '@/lib/media';
import type { TeamMember } from '@/lib/types';

const empty = {
  name: '',
  roleTitle: '',
  bio: '',
  photoUrl: '',
  sortOrder: '0',
  isActive: true,
};

export default function AdminTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setMembers(await api<TeamMember[]>('/team'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load team');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const payload = {
      name: form.name,
      roleTitle: form.roleTitle,
      bio: form.bio || null,
      photoUrl: form.photoUrl || null,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    };
    try {
      if (editingId) {
        await api(`/team/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await api('/team', { method: 'POST', body: JSON.stringify(payload) });
      }
      setForm(empty);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1>Team</h1>
          <p>People shown on the About page</p>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="admin-split">
        <form className="card-panel form-grid" onSubmit={onSubmit}>
          <h2>{editingId ? 'Edit member' : 'Add member'}</h2>
          <div className="form-row">
            <label>Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Role</label>
            <input
              required
              value={form.roleTitle}
              onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Photo URL</label>
            <input
              value={form.photoUrl}
              onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Bio</label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Sort order</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            />
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active on website
          </label>
          <div className="inline-actions">
            <button className="btn btn-primary" type="submit">
              {editingId ? 'Update' : 'Create'}
            </button>
            {editingId && (
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(empty);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        <div className="list-panel">
          <div className="site-team-grid admin-team-preview">
            {members.map((member) => (
              <article key={member.id} className="site-team-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(
                    member.photoUrl,
                    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80',
                  )}
                  alt={member.name}
                />
                <strong>{member.name}</strong>
                <span>{member.roleTitle}</span>
                <div className="inline-actions">
                  <IconButton
                    label="Edit member"
                    icon="edit"
                    onClick={() => {
                      setEditingId(member.id);
                      setForm({
                        name: member.name,
                        roleTitle: member.roleTitle,
                        bio: member.bio || '',
                        photoUrl: member.photoUrl || '',
                        sortOrder: String(member.sortOrder ?? 0),
                        isActive: member.isActive,
                      });
                    }}
                  />
                  <IconButton
                    label="Delete member"
                    icon="trash"
                    variant="danger"
                    onClick={() => setDeleteId(member.id)}
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete team member?"
        message="They will disappear from the About page."
        confirmLabel="Delete"
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return;
          await api(`/team/${deleteId}`, { method: 'DELETE' });
          setDeleteId(null);
          await load();
        }}
      />
    </AppShell>
  );
}
