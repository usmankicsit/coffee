'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AuthField,
  AuthForm,
  AuthLink,
  AuthLinks,
  AuthShell,
} from '@/components/AuthShell';
import { CustomSelect } from '@/components/CustomSelect';
import { homeForRole, useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';

function ShopRegisterForm() {
  const { register, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/shop/dashboard';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Islamabad');
  const [password, setPassword] = useState('');
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
      const u = await register({
        name,
        email,
        password,
        phone,
        address,
        city,
      });
      router.replace(u.role === 'CUSTOMER' ? next : homeForRole(u.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      brand="Brew & Bean"
      tagline="Join the shop"
      title="Create your account"
      subtitle="We need your phone and address so the shop can contact you about orders."
      variant="customer"
      footer={
        <AuthLinks>
          <span>
            Already registered?{' '}
            <AuthLink href={`/shop/login?next=${encodeURIComponent(next)}`}>
              Sign in
            </AuthLink>
          </span>
          <span>
            Browse first? <AuthLink href="/menu">View menu</AuthLink>
          </span>
        </AuthLinks>
      }
    >
      <div className="auth-steps">
        <span className="auth-step active">1 · Details</span>
        <span className="auth-step">2 · Order</span>
      </div>
      <AuthForm
        onSubmit={onSubmit}
        submitLabel="Create account"
        submitting={submitting}
        error={error}
      >
        <AuthField
          id="name"
          label="Full name"
          value={name}
          onChange={setName}
          autoComplete="name"
          required
          placeholder="Your name"
        />
        <AuthField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
          placeholder="you@email.com"
        />
        <AuthField
          id="phone"
          label="Phone number"
          type="tel"
          value={phone}
          onChange={setPhone}
          autoComplete="tel"
          required
          placeholder="+92 300 1234567"
        />
        <AuthField
          id="address"
          label="Delivery address"
          value={address}
          onChange={setAddress}
          autoComplete="street-address"
          required
          placeholder="House / street / area"
        />
        <div className="form-row auth-field">
          <label htmlFor="city">City</label>
          <CustomSelect
            id="city"
            value={city}
            onChange={setCity}
            options={[
              { value: 'Islamabad', label: 'Islamabad' },
              { value: 'Rawalpindi', label: 'Rawalpindi' },
            ]}
          />
        </div>
        <AuthField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="At least 6 characters"
        />
      </AuthForm>
    </AuthShell>
  );
}

export default function ShopRegisterPage() {
  return (
    <Suspense fallback={<div className="login-page">Loading…</div>}>
      <ShopRegisterForm />
    </Suspense>
  );
}
