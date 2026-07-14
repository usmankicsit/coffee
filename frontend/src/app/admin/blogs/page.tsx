'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { IconButton } from '@/components/IconButton';
import { api, ApiError } from '@/lib/api';
import type { BlogPost } from '@/lib/types';

const empty = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImageUrl: '',
  isPublished: true,
};

export default function AdminBlogsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setPosts(await api<BlogPost[]>('/blogs'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load blogs');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function slugify(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const payload = {
      title: form.title,
      slug: form.slug || slugify(form.title),
      excerpt: form.excerpt,
      content: form.content,
      coverImageUrl: form.coverImageUrl || null,
      isPublished: form.isPublished,
    };
    try {
      if (editingId) {
        await api(`/blogs/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await api('/blogs', { method: 'POST', body: JSON.stringify(payload) });
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
          <h1>Blogs</h1>
          <p>Posts shown on the public website</p>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="admin-split">
        <form className="card-panel form-grid" onSubmit={onSubmit}>
          <h2>{editingId ? 'Edit post' : 'New post'}</h2>
          <div className="form-row">
            <label>Title</label>
            <input
              required
              value={form.title}
              onChange={(e) =>
                setForm({
                  ...form,
                  title: e.target.value,
                  slug: editingId ? form.slug : slugify(e.target.value),
                })
              }
            />
          </div>
          <div className="form-row">
            <label>Slug</label>
            <input
              required
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Excerpt</label>
            <input
              required
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Cover image URL</label>
            <input
              value={form.coverImageUrl}
              onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Content</label>
            <textarea
              rows={8}
              required
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
            />
            Published
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
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td>
                    <strong>{post.title}</strong>
                    <div className="muted-note">/{post.slug}</div>
                  </td>
                  <td>{post.isPublished ? 'Published' : 'Draft'}</td>
                  <td>
                    <div className="inline-actions">
                      <IconButton
                        label="Edit post"
                        icon="edit"
                        onClick={() => {
                          setEditingId(post.id);
                          setForm({
                            title: post.title,
                            slug: post.slug,
                            excerpt: post.excerpt,
                            content: post.content,
                            coverImageUrl: post.coverImageUrl || '',
                            isPublished: post.isPublished,
                          });
                        }}
                      />
                      <IconButton
                        label="Delete post"
                        icon="trash"
                        variant="danger"
                        onClick={() => setDeleteId(post.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete blog post?"
        message="This removes the post from the public website."
        confirmLabel="Delete"
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return;
          await api(`/blogs/${deleteId}`, { method: 'DELETE' });
          setDeleteId(null);
          await load();
        }}
      />
    </AppShell>
  );
}
