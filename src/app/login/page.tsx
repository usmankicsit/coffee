'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

const STAFF_ACCOUNTS: DemoAccount[] = [
  {
    label: 'Admin',
    hint: 'Full shop control',
    email: 'admin@coffee.local',
    password: 'Admin123!',
  },
  {
    label: 'Cashier',
    hint: 'POS & orders',
    email: 'cashier@coffee.local',
    password: 'Cashier123!',
  },
];

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState(STAFF_ACCOUNTS[0].email);
  const [password, setPassword] = useState(STAFF_ACCOUNTS[0].password);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(homeForRole(user.role));
    }
  }, [loading, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const u = await login(email, password);
      if (u.role === 'CUSTOMER') {
        router.replace('/shop');
        return;
      }
      router.replace(homeForRole(u.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      brand="Brew & Bean"
      tagline="Staff workspace"
      title="Staff sign in"
      subtitle="Choose a role below or enter your credentials."
      variant="staff"
      footer={
        <AuthLinks>
          <span>
            Ordering as a guest? <AuthLink href="/shop/login">Customer login</AuthLink>
          </span>
          <span>
            New customer? <AuthLink href="/shop/register">Create account</AuthLink>
          </span>
        </AuthLinks>
      }
    >
      <DemoAccountPicker
        accounts={STAFF_ACCOUNTS}
        activeEmail={email}
        onPick={(account) => {
          setEmail(account.email);
          setPassword(account.password);
          setError('');
        }}
      />
      <AuthForm
        onSubmit={onSubmit}
        submitLabel="Sign in to workspace"
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
          placeholder="you@coffee.local"
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
