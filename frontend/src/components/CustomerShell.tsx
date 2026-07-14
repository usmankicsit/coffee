'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';

const links = [
  { href: '/shop/dashboard', label: 'Dashboard' },
  { href: '/shop/orders', label: 'My Orders' },
  { href: '/shop/profile', label: 'Profile' },
  { href: '/menu', label: 'Menu' },
  { href: '/cart', label: 'Cart' },
];

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, isCustomer, isStaff } = useAuth();
  const { count } = useCart();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/shop/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (isStaff) {
      router.replace('/pos');
    }
  }, [loading, user, isStaff, router, pathname]);

  if (loading || !user || !isCustomer) {
    return (
      <div className="shop-loading">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="shop-shell">
      <header className="shop-header">
        <Link href="/shop/dashboard" className="shop-brand">
          Brew & Bean
          <span>My account</span>
        </Link>
        <nav className="shop-nav">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? 'active' : ''}
            >
              {link.label}
              {link.href === '/cart' && count > 0 ? ` (${count})` : ''}
            </Link>
          ))}
        </nav>
        <div className="shop-user">
          <span>{user.name}</span>
          <button
            className="btn"
            onClick={async () => {
              await logout();
              router.replace('/');
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <main className="shop-main">{children}</main>
    </div>
  );
}
