'use client';

export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  children,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="list-toolbar">
      <input
        className="list-search"
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
      />
      <div className="list-filters">{children}</div>
    </div>
  );
}

export function PaginationBar({
  page,
  totalPages,
  totalFiltered,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalFiltered: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const from = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalFiltered);

  return (
    <div className="pagination-bar">
      <span className="pagination-info">
        Showing {from}–{to} of {totalFiltered}
      </span>
      <div className="pagination-controls">
        <button
          className="btn"
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="pagination-page">
          Page {page} / {totalPages}
        </span>
        <button
          className="btn"
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
