'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SiteShell } from '@/components/SiteShell';
import { HeroLanding } from '@/components/HeroLanding';
import { SectionFx } from '@/components/SectionFx';
import { ProductRatingBadge, ProductSellingTag } from '@/components/ProductBadges';
import { api } from '@/lib/api';
import { useCart } from '@/lib/cart-context';
import { money } from '@/lib/format';
import { mediaUrl } from '@/lib/media';
import { productImageSrc } from '@/lib/product-image';
import type { BlogPost, Product, ShopSettings, TeamMember } from '@/lib/types';

export default function HomePage() {
  const { add } = useCart();
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);

  useEffect(() => {
    Promise.all([
      api<ShopSettings>('/public/shop'),
      api<Product[]>('/public/menu'),
      api<BlogPost[]>('/public/blogs'),
      api<TeamMember[]>('/public/team'),
    ])
      .then(([s, products, b, t]) => {
        setShop(s);
        const tagged = products.filter((p) => p.sellingTag);
        setFeatured((tagged.length ? tagged : products).slice(0, 6));
        setBlogs(b.slice(0, 3));
        setTeam(t.slice(0, 4));
      })
      .catch(() => undefined);
  }, []);

  const brand = shop?.name || 'Brew & Bean';

  return (
    <SiteShell>
      <HeroLanding brand={brand} />

      <SectionFx className="reveal">
        <div className="site-section-head">
          <h2>Popular picks</h2>
          <p>Top sellers and guest favorites — tap to add or open details.</p>
        </div>
        <div className="site-product-grid">
          {featured.map((product) => (
            <article key={product.id} className="site-product-card">
              <Link href={`/menu/${product.id}`} className="site-product-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={productImageSrc(product)} alt={product.name} />
                <ProductSellingTag product={product} />
              </Link>
              <div className="site-product-body">
                <Link href={`/menu/${product.id}`}>
                  <strong>{product.name}</strong>
                </Link>
                <ProductRatingBadge product={product} />
                <span className="site-price">{money(product.price, shop?.currency)}</span>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => add(product)}
                >
                  Add to cart
                </button>
              </div>
            </article>
          ))}
        </div>
      </SectionFx>

      <SectionFx className="site-about-band reveal" tone="cool">
        <div className="site-section-head">
          <h2>About us</h2>
          <p>{shop?.aboutText}</p>
          <Link href="/about" className="btn">
            Meet the team
          </Link>
        </div>
        <div className="site-team-row">
          {team.map((member) => (
            <article key={member.id} className="site-team-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(
                  member.photoUrl,
                  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80',
                )}
                alt={member.name}
              />
              <strong>{member.name}</strong>
              <span>{member.roleTitle}</span>
            </article>
          ))}
        </div>
      </SectionFx>

      <SectionFx className="reveal">
        <div className="site-section-head">
          <h2>From the blog</h2>
          <p>Stories and tips from our baristas — managed by the shop admin.</p>
        </div>
        <div className="site-blog-grid">
          {blogs.map((post) => (
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
              </div>
            </Link>
          ))}
        </div>
      </SectionFx>
    </SiteShell>
  );
}
