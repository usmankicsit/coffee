'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { CustomSelect } from '@/components/CustomSelect';
import { IconButton } from '@/components/IconButton';
import { ListToolbar, PaginationBar } from '@/components/ListControls';
import { api, ApiError } from '@/lib/api';
import { usePagedList } from '@/lib/use-paged-list';
import type { Inventory } from '@/lib/types';

export default function InventoryPage() {
  const [items, setItems] = useState<Inventory[]>([]);
  const [error, setError] = useState('');
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [stockFilter, setStockFilter] = useState('ALL');

  async function load() {
    const data = await api<Inventory[]>('/inventory');
    setItems(data);
    const map: Record<string, string> = {};
    data.forEach((i) => {
      map[i.productId] = String(i.quantity);
    });
    setEdits(map);
  }

  useEffect(() => {
    load().catch((err) =>
      setError(err instanceof ApiError ? err.message : 'Failed to load inventory'),
    );
  }, []);

  const filteredItems = items.filter((item) => {
    const low = item.quantity <= item.lowStockThreshold;
    if (stockFilter === 'LOW' && !low) return false;
    if (stockFilter === 'OK' && low) return false;
    return true;
  });

  const filterFn = useCallback((item: Inventory, q: string) => {
    if (!q) return true;
    return (
      (item.product?.name || '').toLowerCase().includes(q) ||
      (item.product?.category?.name || '').toLowerCase().includes(q)
    );
  }, []);

  const list = usePagedList(filteredItems, filterFn);

  async function save(productId: string) {
    setError('');
    try {
      await api(`/inventory/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: Number(edits[productId] || 0) }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    }
  }

  return (
    <AppShell>
      <div className="page-stack">
        <div className="page-header">
          <div>
            <h1>Inventory</h1>
            <p>Stock levels for menu items</p>
          </div>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="list-panel">
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search product or category…"
          >
            <CustomSelect
              aria-label="Filter stock"
              value={stockFilter}
              onChange={(v) => {
                setStockFilter(v);
                list.setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All stock' },
                { value: 'LOW', label: 'Low stock' },
                { value: 'OK', label: 'In stock' },
              ]}
            />
          </ListToolbar>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Low threshold</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.pageItems.map((item) => {
                  const low = item.quantity <= item.lowStockThreshold;
                  return (
                    <tr key={item.id}>
                      <td>
                        {item.product?.name}
                        {low && (
                          <span
                            className="badge badge-CANCELLED"
                            style={{ marginLeft: 8 }}
                          >
                            Low
                          </span>
                        )}
                      </td>
                      <td>{item.product?.category?.name}</td>
                      <td>
                        <input
                          style={{ width: 90 }}
                          type="number"
                          min="0"
                          value={edits[item.productId] ?? ''}
                          onChange={(e) =>
                            setEdits({
                              ...edits,
                              [item.productId]: e.target.value,
                            })
                          }
                        />
                      </td>
                      <td>{item.lowStockThreshold}</td>
                      <td>
                        <div className="inline-actions">
                          <IconButton
                            label="Save quantity"
                            icon="save"
                            variant="primary"
                            onClick={() => save(item.productId)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!list.pageItems.length && (
                  <tr>
                    <td colSpan={5} className="empty">
                      No inventory items match your filters.
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
