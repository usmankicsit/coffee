'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { mediaUrl } from '@/lib/media';
import type { ShopSettings } from '@/lib/types';

const staffLinks = [
  { href: '/pos', label: 'POS' },
  { href: '/waiter-orders', label: 'Waiter orders' },
  { href: '/orders', label: 'Orders' },
  { href: '/online-orders', label: 'Online Orders' },
  { href: '/claims', label: 'Claims' },
  { href: '/expenses', label: 'Patti cash' },
];

const waiterLinks = [
  { href: '/waiter', label: 'Take order' },
  { href: '/orders', label: 'My orders' },
];

const adminLinks = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/menu', label: 'Menu' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/blogs', label: 'Blogs' },
  { href: '/admin/team', label: 'Team' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/settings', label: 'Settings' },
];

interface StatusBucket {
  PENDING: number;
  PREPARING: number;
  READY: number;
  COMPLETED: number;
  CANCELLED: number;
  total: number;
  active: number;
}

interface StatusCounts {
  online: StatusBucket;
  today: StatusBucket;
}

const emptyBucket = (): StatusBucket => ({
  PENDING: 0,
  PREPARING: 0,
  READY: 0,
  COMPLETED: 0,
  CANCELLED: 0,
  total: 0,
  active: 0,
});

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, isAdmin, isStaff, isCustomer, isWaiter } =
    useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [counts, setCounts] = useState<StatusCounts>({
    online: emptyBucket(),
    today: emptyBucket(),
  });
  const [shop, setShop] = useState<ShopSettings | null>(null);

  const loadCounts = useCallback(async () => {
    try {
      const data = await api<StatusCounts>('/orders/status-counts');
      setCounts(data);
    } catch {
      /* ignore while navigating */
    }
  }, []);

  useEffect(() => {
    api<ShopSettings>('/shop').then(setShop).catch(() => null);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (isCustomer) {
      router.replace('/shop');
      return;
    }
    if (!isAdmin && pathname.startsWith('/admin')) {
      router.replace(isWaiter ? '/waiter' : '/pos');
    }
    if (isWaiter && (pathname === '/pos' || pathname.startsWith('/online-orders') || pathname.startsWith('/claims') || pathname.startsWith('/expenses') || pathname.startsWith('/waiter-orders'))) {
      router.replace('/waiter');
    }
  }, [loading, user, isAdmin, isCustomer, isWaiter, pathname, router]);

  useEffect(() => {
    if (!isStaff) return;
    loadCounts();
    const id = setInterval(loadCounts, 8000);
    return () => clearInterval(id);
  }, [isStaff, loadCounts, pathname]);

  if (loading || !user || !isStaff) {
    return (
      <div className="login-page">
        <div className="login-card">
          <p className="subtitle">Loading…</p>
        </div>
      </div>
    );
  }

  const links = isWaiter
    ? waiterLinks
    : isAdmin
      ? [...staffLinks, ...adminLinks]
      : staffLinks;
  const online = counts.online;
  const brand = shop?.name || 'The Brewing Cottage';
  const logo =
    mediaUrl(shop?.logoUrl) || '/brand/brewing-cottage-logo.png';

  const roleLabel =
    user.role === 'SUPER_ADMIN'
      ? 'Super Admin'
      : user.role === 'ADMIN'
        ? 'Admin'
        : user.role === 'WAITER'
          ? 'Waiter'
          : 'Cashier';

  const chips = [
    { key: 'PENDING', label: 'Pending', count: online.PENDING, href: '/online-orders' },
    { key: 'PREPARING', label: 'Preparing', count: online.PREPARING, href: '/online-orders' },
    { key: 'COMPLETED', label: 'Completed', count: online.COMPLETED, href: '/online-orders' },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt={brand} className="brand-logo" />
          <div className="brand-text">
            {brand}
            <span>{isWaiter ? 'Waiter order' : 'Point of Sale'}</span>
          </div>
        </div>
        <nav className="nav">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? 'active' : ''}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="user-chip">
          <strong>{user.name}</strong>
          <small>{roleLabel}</small>
          <button
            className="btn"
            style={{ marginTop: '0.75rem', width: '100%' }}
            onClick={async () => {
              await logout();
              router.replace('/login');
            }}
          >
            Log out
          </button>
        </div>
      </aside>
      <div className="shell-content">
        {!isWaiter && (
          <header className="top-navbar">
            <div className="top-navbar-label">
              <strong>Online orders today</strong>
              <span>{online.active} active · {online.total} total</span>
            </div>
            <div className="status-chips">
              {chips.map((chip) => (
                <Link
                  key={chip.key}
                  href={chip.href}
                  className={`status-chip status-chip-${chip.key}${chip.count > 0 ? ' has-count' : ''}`}
                >
                  <span className="status-chip-count">{chip.count}</span>
                  <span className="status-chip-label">{chip.label}</span>
                </Link>
              ))}
            </div>
          </header>
        )}
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
