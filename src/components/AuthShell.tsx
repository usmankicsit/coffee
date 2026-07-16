'use client';

import Link from 'next/link';
import { FormEvent, ReactNode, useState } from 'react';

export function AuthShell({
  brand,
  tagline,
  title,
  subtitle,
  variant = 'staff',
  children,
  footer,
}: {
  brand: string;
  tagline: string;
  title: string;
  subtitle: string;
  variant?: 'staff' | 'customer';
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className={`auth-shell auth-${variant}`}>
      <aside className="auth-hero" aria-hidden="false">
        <div className="auth-hero-inner">
          <p className="auth-eyebrow">{tagline}</p>
          <h1 className="auth-brand">{brand}</h1>
          <p className="auth-hero-copy">
            {variant === 'staff'
              ? 'POS, online orders, inventory, and claims — all in one place.'
              : 'Browse the menu, order ahead, and pick up when ready.'}
          </p>
          <ul className="auth-hero-points">
            {variant === 'staff' ? (
              <>
                <li>Counter POS & payments</li>
                <li>Online order queue</li>
                <li>Menu & stock control</li>
              </>
            ) : (
              <>
                <li>Order from your phone</li>
                <li>Track order status</li>
                <li>Rate & report easily</li>
              </>
            )}
          </ul>
        </div>
      </aside>
      <main className="auth-panel">
        <div className="auth-panel-card auth-fade-in">
          <div className="auth-panel-head">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          {children}
          {footer && <div className="auth-footer">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

export function AuthField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  required,
  minLength,
  placeholder,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="form-row auth-field">
      <label htmlFor={id}>{label}</label>
      <div className={`auth-input-wrap${isPassword ? ' has-eye' : ''}`}>
        <input
          id={id}
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
        />
        {isPassword && (
          <button
            type="button"
            className="auth-eye"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? (
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function AuthForm({
  onSubmit,
  children,
  submitLabel,
  submitting,
  error,
}: {
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
  submitLabel: string;
  submitting: boolean;
  error?: string;
}) {
  return (
    <form className="form-grid auth-form" onSubmit={onSubmit}>
      {error && <div className="error">{error}</div>}
      {children}
      <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
        {submitting ? 'Please wait…' : submitLabel}
      </button>
    </form>
  );
}

export function AuthLinks({ children }: { children: ReactNode }) {
  return <div className="auth-links">{children}</div>;
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="auth-text-link">
      {children}
    </Link>
  );
}
