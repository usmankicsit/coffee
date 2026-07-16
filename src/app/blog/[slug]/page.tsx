'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SiteShell } from '@/components/SiteShell';
import { api, ApiError } from '@/lib/api';
import { mediaUrl } from '@/lib/media';
import type { BlogPost } from '@/lib/types';

export default function BlogDetailPage() {
  const params = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!params?.slug) return;
    api<BlogPost>(`/public/blogs/${params.slug}`)
      .then(setPost)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Post not found'),
      );
  }, [params?.slug]);

  return (
    <SiteShell>
      <section className="site-section blog-detail reveal">
        {error && <div className="error">{error}</div>}
        {!post && !error && <p className="empty">Loading…</p>}
        {post && (
          <>
            <Link href="/blog" className="site-eyebrow">
              ← Back to blog
            </Link>
            <h1>{post.title}</h1>
            <p className="muted-note">
              {new Date(post.createdAt).toLocaleDateString()}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="blog-cover"
              src={mediaUrl(
                post.coverImageUrl,
                'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
              )}
              alt={post.title}
            />
            <div className="blog-content">
              {post.content.split('\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </>
        )}
      </section>
    </SiteShell>
  );
}
