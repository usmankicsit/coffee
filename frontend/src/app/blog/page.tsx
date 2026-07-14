'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SiteShell } from '@/components/SiteShell';
import { api, ApiError } from '@/lib/api';
import { mediaUrl } from '@/lib/media';
import type { BlogPost } from '@/lib/types';

export default function BlogListPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<BlogPost[]>('/public/blogs')
      .then(setPosts)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load blogs'),
      );
  }, []);

  return (
    <SiteShell>
      <section className="site-page-hero reveal">
        <h1>Blog</h1>
        <p>Stories, recipes, and shop news from Brew & Bean.</p>
      </section>
      <section className="site-section reveal">
        {error && <div className="error">{error}</div>}
        <div className="site-blog-grid">
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="site-blog-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(
                  post.coverImageUrl,
                  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
                )}
                alt={post.title}
              />
              <div>
                <strong>{post.title}</strong>
                <p>{post.excerpt}</p>
                <small>{new Date(post.createdAt).toLocaleDateString()}</small>
              </div>
            </Link>
          ))}
        </div>
        {!posts.length && !error && <p className="empty">No posts yet.</p>}
      </section>
    </SiteShell>
  );
}
