'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AuthField,
  AuthForm,
  AuthLink,
  AuthLinks,
  AuthShell,
  DemoAccountPicker,
  type DemoAccount,
} from '@/components/AuthShell';
import { homeForRole, useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';

const CUSTOMER_ACCOUNT: DemoAccount[] = [
  {
    label: 'Demo customer',
    hint: 'Try ordering now',
    email: 'customer@coffee.local',
    password: 'Customer123!',
  },
];

function ShopLoginForm() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/shop/dashboard';
  const [email, setEmail] = useState(CUSTOMER_ACCOUNT[0].email);
  const [password, setPassword] = useState(CUSTOMER_ACCOUNT[0].password);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(user.role === 'CUSTOMER' ? next : homeForRole(user.role));
    }
  }, [loading, user, router, next]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const u = await login(email, password);
      router.replace(u.role === 'CUSTOMER' ? next : homeForRole(u.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      brand="Brew & Bean"
      tagline="Customer account"
      title="Welcome back"
      subtitle="Sign in to checkout your cart and track orders."
      variant="customer"
      footer={
        <AuthLinks>
          <span>
            New here?{' '}
            <AuthLink href={`/shop/register?next=${encodeURIComponent(next)}`}>
              Create an account
            </AuthLink>
          </span>
          <span>
            Keep browsing? <AuthLink href="/menu">Back to menu</AuthLink>
          </span>
          <span>
            Team member? <AuthLink href="/login">Staff login</AuthLink>
          </span>
        </AuthLinks>
      }
    >
      <DemoAccountPicker
        accounts={CUSTOMER_ACCOUNT}
        activeEmail={email}
        onPick={(account) => {
          setEmail(account.email);
          setPassword(account.password);
          setError('');
        }}
      />
      <AuthForm
        onSubmit={onSubmit}
        submitLabel="Sign in"
        submitting={submitting}
        error={error}
      >
        <AuthField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="username"
          required
          placeholder="you@email.com"
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />
      </AuthForm>
    </AuthShell>
  );
}

export default function ShopLoginPage() {
  return (
    <Suspense fallback={<div className="login-page">Loading…</div>}>
      <ShopLoginForm />
    </Suspense>
  );
}
