'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy /shop menu route → public menu */
export default function ShopRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/menu');
  }, [router]);
  return (
    <div className="shop-loading">
      <p>Taking you to the menu…</p>
    </div>
  );
}
