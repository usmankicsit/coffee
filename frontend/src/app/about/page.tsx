'use client';

import { useEffect, useState } from 'react';
import { SiteShell } from '@/components/SiteShell';
import { api, ApiError } from '@/lib/api';
import { mediaUrl, telLink, whatsappLink } from '@/lib/media';
import type { ShopSettings, TeamMember } from '@/lib/types';

export default function AboutPage() {
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api<ShopSettings>('/public/shop'),
      api<TeamMember[]>('/public/team'),
    ])
      .then(([s, t]) => {
        setShop(s);
        setTeam(t);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load about'),
      );
  }, []);

  return (
    <SiteShell>
      <section className="site-page-hero reveal">
        <h1>About {shop?.name || 'us'}</h1>
        <p>{shop?.aboutText}</p>
      </section>

      <section className="site-section reveal">
        <div className="about-contact">
          <div>
            <h3>Visit</h3>
            <p>{shop?.address}</p>
          </div>
          <div>
            <h3>Call</h3>
            <p>
              <a href={telLink(shop?.phone)}>{shop?.phone}</a>
            </p>
          </div>
          <div>
            <h3>WhatsApp</h3>
            <p>
              <a href={whatsappLink(shop?.whatsapp)} target="_blank" rel="noreferrer">
                Message us
              </a>
            </p>
          </div>
        </div>
      </section>

      <section className="site-section reveal">
        <div className="site-section-head">
          <h2>Our team</h2>
          <p>Faces behind the counter — managed from the admin panel.</p>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="site-team-grid">
          {team.map((member) => (
            <article key={member.id} className="site-team-card large">
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
              {member.bio && <p>{member.bio}</p>}
            </article>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
