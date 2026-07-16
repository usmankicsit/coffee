'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CustomSelect } from '@/components/CustomSelect';
import { IconButton } from '@/components/IconButton';
import { ListToolbar, PaginationBar } from '@/components/ListControls';
import { api, ApiError, API_URL, authHeaders } from '@/lib/api';
import { money } from '@/lib/format';
import { hasCustomImage, productImageSrc } from '@/lib/product-image';
import { usePagedList } from '@/lib/use-paged-list';
import type { Category, Product } from '@/lib/types';

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [catName, setCatName] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL');
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [newProductImage, setNewProductImage] = useState<File | null>(null);
  const [newProductPreview, setNewProductPreview] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    categoryId: '',
    initialStock: '50',
  });

  async function load() {
    const [c, p] = await Promise.all([
      api<Category[]>('/categories'),
      api<Product[]>('/products'),
    ]);
    setCategories(c);
    setProducts(p);
    if (!productForm.categoryId && c[0]) {
      setProductForm((f) => ({ ...f, categoryId: c[0].id }));
    }
  }

  useEffect(() => {
    load().catch((err) =>
      setError(err instanceof ApiError ? err.message : 'Failed to load menu'),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProducts = products.filter((p) => {
    if (categoryFilter !== 'ALL' && p.categoryId !== categoryFilter) return false;
    if (availabilityFilter === 'AVAILABLE' && !p.isAvailable) return false;
    if (availabilityFilter === 'UNAVAILABLE' && p.isAvailable) return false;
    return true;
  });

  const filterFn = useCallback((p: Product, q: string) => {
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.category?.name || '').toLowerCase().includes(q)
    );
  }, []);

  const list = usePagedList(filteredProducts, filterFn);

  async function addCategory(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/categories', {
        method: 'POST',
        body: JSON.stringify({ name: catName }),
      });
      setCatName('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add category');
    }
  }

  async function addProduct(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const created = await api<Product>('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: productForm.name,
          price: Number(productForm.price),
          categoryId: productForm.categoryId,
          initialStock: Number(productForm.initialStock),
        }),
      });
      if (newProductImage && created?.id) {
        const body = new FormData();
        body.append('file', newProductImage);
        const res = await fetch(`${API_URL}/api/products/${created.id}/image`, {
          method: 'POST',
          body,
          credentials: 'include',
          headers: authHeaders(),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Product created but image upload failed');
        }
      }
      setProductForm((f) => ({ ...f, name: '', price: '', initialStock: '50' }));
      setNewProductImage(null);
      if (newProductPreview) URL.revokeObjectURL(newProductPreview);
      setNewProductPreview(null);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Failed to add product',
      );
    }
  }

  async function confirmDeleteProduct() {
    if (!productToDelete) return;
    setError('');
    setDeleting(true);
    try {
      await api(`/products/${productToDelete.id}`, { method: 'DELETE' });
      setProductToDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete product');
      setProductToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  async function toggleProduct(product: Product) {
    await api(`/products/${product.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isAvailable: !product.isAvailable }),
    });
    await load();
  }

  async function uploadImage(productId: string, file: File) {
    setError('');
    setUploadingId(productId);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(`${API_URL}/api/products/${productId}/image`, {
        method: 'POST',
        body,
        credentials: 'include',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Upload failed');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingId(null);
    }
  }

  async function removeImage(productId: string) {
    setError('');
    try {
      await api(`/products/${productId}/image`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove image');
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1>Menu</h1>
          <p>Manage categories, products, and images</p>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="stack-gap">
        <div className="card-panel">
          <h2 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>
            Add category
          </h2>
          <form className="form-grid" onSubmit={addCategory}>
            <div className="form-row">
              <label>Name</label>
              <input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary" type="submit">
              Add category
            </button>
          </form>
        </div>
        <div className="card-panel">
          <h2 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>
            Add product
          </h2>
          <form className="form-grid" onSubmit={addProduct}>
            <div className="form-row">
              <label>Name</label>
              <input
                value={productForm.name}
                onChange={(e) =>
                  setProductForm({ ...productForm, name: e.target.value })
                }
                required
              />
            </div>
            <div className="form-row">
              <label>Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={productForm.price}
                onChange={(e) =>
                  setProductForm({ ...productForm, price: e.target.value })
                }
                required
              />
            </div>
            <div className="form-row">
              <label>Category</label>
              <CustomSelect
                value={productForm.categoryId}
                onChange={(v) =>
                  setProductForm({ ...productForm, categoryId: v })
                }
                options={categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
                placeholder="Select category"
              />
            </div>
            <div className="form-row">
              <label>Initial stock</label>
              <input
                type="number"
                min="0"
                value={productForm.initialStock}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    initialStock: e.target.value,
                  })
                }
              />
            </div>
            <div className="form-row">
              <label>Product image</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (newProductPreview) URL.revokeObjectURL(newProductPreview);
                  setNewProductImage(file);
                  setNewProductPreview(file ? URL.createObjectURL(file) : null);
                }}
              />
              {newProductPreview && (
                <div className="new-product-preview">
                  <img src={newProductPreview} alt="Preview" />
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      if (newProductPreview) URL.revokeObjectURL(newProductPreview);
                      setNewProductImage(null);
                      setNewProductPreview(null);
                    }}
                  >
                    Clear image
                  </button>
                </div>
              )}
            </div>
            <button className="btn btn-primary" type="submit">
              Add product
            </button>
          </form>
        </div>
        <div className="list-panel">
          <div className="list-panel-head">
            <h2>Products</h2>
          </div>
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search product or category…"
          >
            <CustomSelect
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(v) => {
                setCategoryFilter(v);
                list.setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All categories' },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <CustomSelect
              aria-label="Filter by availability"
              value={availabilityFilter}
              onChange={(v) => {
                setAvailabilityFilter(v);
                list.setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All availability' },
                { value: 'AVAILABLE', label: 'Available' },
                { value: 'UNAVAILABLE', label: 'Unavailable' },
              ]}
            />
          </ListToolbar>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Available</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.pageItems.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="menu-image-cell">
                        <img
                          src={productImageSrc(p)}
                          alt={p.name}
                          className="menu-thumb"
                        />
                        {!hasCustomImage(p) && (
                          <span className="image-tag">Dummy</span>
                        )}
                      </div>
                    </td>
                    <td>{p.name}</td>
                    <td>{p.category?.name}</td>
                    <td>{money(p.price)}</td>
                    <td>{p.isAvailable ? 'Yes' : 'No'}</td>
                    <td>
                      <div className="inline-actions">
                        <IconButton
                          label={p.isAvailable ? 'Disable product' : 'Enable product'}
                          icon="power"
                          variant={p.isAvailable ? 'default' : 'success'}
                          onClick={() => toggleProduct(p)}
                        />
                        <IconButton
                          label="Delete product"
                          icon="trash"
                          variant="danger"
                          onClick={() => setProductToDelete(p)}
                        />
                        {hasCustomImage(p) ? (
                          <IconButton
                            label="Remove image"
                            icon="imageOff"
                            variant="danger"
                            onClick={() => removeImage(p.id)}
                          />
                        ) : (
                          <>
                            <input
                              ref={(el) => {
                                fileRefs.current[p.id] = el;
                              }}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              hidden
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadImage(p.id, file);
                                e.target.value = '';
                              }}
                            />
                            <IconButton
                              label={
                                uploadingId === p.id
                                  ? 'Uploading…'
                                  : 'Add image'
                              }
                              icon="image"
                              variant="primary"
                              disabled={uploadingId === p.id}
                              onClick={() => fileRefs.current[p.id]?.click()}
                            />
                          </>
                        )}
                        {hasCustomImage(p) && (
                          <>
                            <input
                              ref={(el) => {
                                fileRefs.current[`${p.id}-replace`] = el;
                              }}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              hidden
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadImage(p.id, file);
                                e.target.value = '';
                              }}
                            />
                            <IconButton
                              label={
                                uploadingId === p.id
                                  ? 'Uploading…'
                                  : 'Replace image'
                              }
                              icon="replace"
                              disabled={uploadingId === p.id}
                              onClick={() =>
                                fileRefs.current[`${p.id}-replace`]?.click()
                              }
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!list.pageItems.length && (
                  <tr>
                    <td colSpan={6} className="empty">
                      No products match your filters.
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
      <ConfirmDialog
        open={Boolean(productToDelete)}
        title="Delete product"
        message={
          productToDelete
            ? `Are you sure you want to delete "${productToDelete.name}"? This cannot be undone. Products used in past orders cannot be deleted.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        busy={deleting}
        onConfirm={confirmDeleteProduct}
        onCancel={() => {
          if (!deleting) setProductToDelete(null);
        }}
      />
    </AppShell>
  );
}
