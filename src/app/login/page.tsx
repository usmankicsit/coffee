'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AuthField,
  AuthForm,
  AuthLink,
  AuthLinks,
  AuthShell,
} from '@/components/AuthShell';
import { homeForRole, useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      subtitle="Enter your staff email and password to continue."
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
