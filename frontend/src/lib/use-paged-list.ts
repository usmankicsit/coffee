'use client';

import { useMemo, useState } from 'react';

export const PAGE_SIZE = 10;

export function usePagedList<T>(
  items: T[],
  filterFn: (item: T, search: string) => boolean,
) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => filterFn(item, q));
  }, [items, search, filterFn]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function goToPage(next: number) {
    setPage(Math.min(Math.max(1, next), totalPages));
  }

  return {
    search,
    setSearch: updateSearch,
    page: safePage,
    setPage: goToPage,
    filtered,
    pageItems,
    totalPages,
    totalFiltered: filtered.length,
    pageSize: PAGE_SIZE,
  };
}
