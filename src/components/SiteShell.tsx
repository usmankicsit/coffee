'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { api } from '@/lib/api';
import { mediaUrl, telLink, whatsappLink } from '@/lib/media';
import type { ShopSettings } from '@/lib/types';
import { GlitterCursor } from '@/components/GlitterCursor';

const nav = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/cart', label: 'Cart' },
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isCustomer, logout } = useAuth();
  const { count } = useCart();
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    api<ShopSettings>('/public/shop').then(setShop).catch(() => null);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const brand = shop?.name || 'The Brewing Cottage';
  const logo =
    mediaUrl(shop?.logoUrl) || '/brand/brewing-cottage-logo.png';

  return (
    <div className="site">
      <GlitterCursor />
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="site-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt={brand} className="site-logo-img" />
            <span className="site-logo-text">
              {brand}
              <small>Coffee & kitchen</small>
            </span>
          </Link>

          <button
            type="button"
            className="site-menu-toggle"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>

          <nav className={`site-nav${menuOpen ? ' open' : ''}`}>
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  item.href === '/'
                    ? pathname === '/'
                      ? 'active'
                      : ''
                    : pathname.startsWith(item.href)
                      ? 'active'
                      : ''
                }
              >
                {item.label}
                {item.href === '/cart' && count > 0 ? (
                  <span className="site-cart-badge">{count}</span>
                ) : null}
              </Link>
            ))}
            {isCustomer ? (
              <>
                <Link
                  href="/shop/dashboard"
                  className={pathname.startsWith('/shop') ? 'active' : ''}
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  className="btn"
                  onClick={async () => {
                    await logout();
                  }}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/shop/login" className="btn">
                  Sign in
                </Link>
                <Link href="/shop/register" className="btn btn-primary">
                  Create account
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="site-topbar">
          {shop?.phone && (
            <a href={telLink(shop.phone)}>Call {shop.phone}</a>
          )}
          {shop?.whatsapp && (
            <a href={whatsappLink(shop.whatsapp)} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          )}
          {shop?.address && <span>{shop.address}</span>}
        </div>
      </header>

      <main className="site-main">{children}</main>

      <footer className="site-footer">
        <div className="site-footer-grid">
          <div>
            <strong className="site-footer-brand">{brand}</strong>
            <p>{shop?.aboutText?.slice(0, 140) || 'Café classics in DHA Phase 2, Islamabad.'}</p>
          </div>
          <div>
            <h4>Visit</h4>
            <p>{shop?.address || '—'}</p>
            <p>
              <a href={telLink(shop?.phone)}>{shop?.phone}</a>
            </p>
          </div>
          <div>
            <h4>Support</h4>
            <p>
              <a href={whatsappLink(shop?.whatsapp)} target="_blank" rel="noreferrer">
                Chat on WhatsApp
              </a>
            </p>
            <p>
              <Link href="/menu">Browse menu</Link>
            </p>
            {!user && (
              <p>
                <Link href="/shop/register">Create account</Link>
              </p>
            )}
          </div>
        </div>
        <p className="site-footer-copy">© {new Date().getFullYear()} {brand}</p>
      </footer>

      {shop?.whatsapp && (
        <a
          className="wa-float"
          href={whatsappLink(shop.whatsapp)}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp support"
        >
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path
              fill="currentColor"
              d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
            />
          </svg>
        </a>
      )}
    </div>
  );
}
