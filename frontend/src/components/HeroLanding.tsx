'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const SLIDES = [
  {
    src: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1800&q=80',
    label: 'Cafe evenings',
  },
  {
    src: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1800&q=80',
    label: 'Fresh pours',
  },
  {
    src: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1800&q=80',
    label: 'Roasted beans',
  },
  {
    src: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1800&q=80',
    label: 'Latte craft',
  },
  {
    src: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?auto=format&fit=crop&w=1800&q=80',
    label: 'Warm tables',
  },
];

function HeroParticles() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      mount.clientWidth / Math.max(mount.clientHeight, 1),
      0.1,
      100,
    );
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const count = 900;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
      speeds[i] = 0.15 + Math.random() * 0.45;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color('#e8b07a'),
      size: 0.035,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const glowGeo = new THREE.SphereGeometry(1.8, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#c4783a'),
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(2.2, -0.4, -2);
    scene.add(glow);

    const mouse = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };

    const onPointer = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      target.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      target.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    mount.addEventListener('pointermove', onPointer);

    let frame = 0;
    let raf = 0;
    const animate = () => {
      frame += 0.008;
      mouse.x += (target.x - mouse.x) * 0.04;
      mouse.y += (target.y - mouse.y) * 0.04;

      const pos = geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < count; i++) {
        const iy = i * 3 + 1;
        pos.array[iy] += 0.004 * speeds[i];
        if (pos.array[iy] > 4) pos.array[iy] = -4;
      }
      pos.needsUpdate = true;

      points.rotation.y = frame * 0.12 + mouse.x * 0.25;
      points.rotation.x = mouse.y * 0.12;
      glow.position.x = 2.2 + mouse.x * 0.4;
      glow.position.y = -0.4 - mouse.y * 0.3;
      glow.scale.setScalar(1 + Math.sin(frame * 1.4) * 0.08);

      camera.position.x = mouse.x * 0.35;
      camera.position.y = -mouse.y * 0.2;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = Math.max(mount.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      mount.removeEventListener('pointermove', onPointer);
      geometry.dispose();
      material.dispose();
      glowGeo.dispose();
      glowMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div className="hero-particles" ref={mountRef} aria-hidden />;
}

export function HeroLanding({
  brand,
  subtitle,
}: {
  brand: string;
  subtitle?: string;
}) {
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let loaded = 0;
    let cancelled = false;
    const mark = () => {
      loaded += 1;
      if (!cancelled && loaded >= Math.min(2, SLIDES.length)) setReady(true);
    };
    // Show UI quickly after first couple images; rest can load in background
    SLIDES.forEach((slide, i) => {
      const img = new Image();
      img.src = slide.src;
      img.onload = img.onerror = () => {
        if (i < 2) mark();
        else if (!cancelled) setReady(true);
      };
    });
    const fallback = window.setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (!ready || paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, [ready, paused]);

  return (
    <section
      className={`site-hero hero-stage${ready ? ' is-ready' : ''}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {!ready && (
        <div className="hero-loader" aria-live="polite">
          <div className="hero-loader-ring" />
          <span>Loading experience…</span>
        </div>
      )}

      <div className="hero-slides">
        {SLIDES.map((slide, i) => (
          <div
            key={slide.src}
            className={`hero-slide${i === index ? ' active' : ''}`}
            style={{ backgroundImage: `url(${slide.src})` }}
            role="img"
            aria-label={slide.label}
            aria-hidden={i !== index}
          />
        ))}
      </div>

      <div className="hero-veil" />
      <HeroParticles />

      <div className="site-hero-copy hero-copy-anim">
        <p className="site-eyebrow">Neighborhood coffee</p>
        <h1>{brand}</h1>
        <p>
          {subtitle ||
            'Browse the full menu, fill your cart, then sign in when you are ready to place the order.'}
        </p>
        <div className="site-hero-actions">
          <Link href="/menu" className="btn btn-primary">
            Explore menu
          </Link>
          <Link href="/cart" className="btn">
            View cart
          </Link>
        </div>
      </div>

      <div className="hero-controls">
        <button
          type="button"
          className="hero-nav-btn"
          aria-label="Previous slide"
          onClick={() => setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length)}
        >
          ‹
        </button>
        <div className="hero-dots">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              className={`hero-dot${i === index ? ' active' : ''}`}
              aria-label={`Show ${slide.label}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
        <button
          type="button"
          className="hero-nav-btn"
          aria-label="Next slide"
          onClick={() => setIndex((i) => (i + 1) % SLIDES.length)}
        >
          ›
        </button>
      </div>

      <p className="hero-slide-label">{SLIDES[index].label}</p>
    </section>
  );
}
