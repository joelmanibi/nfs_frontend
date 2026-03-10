'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';

const BACKGROUNDS = ['/auth/port_img.jpg', '/auth/port_img1.jpg'];

export default function AuthVisualPanel({ title, description, features = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % BACKGROUNDS.length);
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="auth-visual-panel flex w-full min-h-[320px] flex-col justify-between gap-8 px-6 py-8 sm:min-h-[360px] sm:px-8 sm:py-10 lg:w-1/2 lg:min-h-screen lg:p-12">
      <div className="auth-visual-panel__media" aria-hidden="true">
        {BACKGROUNDS.map((src, index) => (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            priority={index === 0}
            sizes="(max-width: 1024px) 100vw, 40vw"
            className={[
              'auth-visual-panel__slide object-cover',
              activeIndex === index ? 'auth-visual-panel__slide--active' : 'auth-visual-panel__slide--inactive',
            ].join(' ')}
          />
        ))}
        <div className="auth-visual-panel__overlay" />
        <div className="auth-visual-panel__glow" />
      </div>

      <div className="relative z-10 flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/15">
          <ShieldCheck size={22} className="text-white" />
        </div>
        <span className="text-white font-bold text-xl tracking-wide">NFS</span>
      </div>

      <div className="relative z-10 max-w-md">
        <h2 className="text-3xl font-bold text-white leading-tight mb-4">{title}</h2>
        <p className="text-white/75 text-sm leading-relaxed">{description}</p>

        {features.length > 0 && (
          <div className="mt-8 space-y-3">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
                <span className="text-white/85 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative z-10 flex items-center justify-between gap-4">
        <p className="text-white/45 text-xs">© {new Date().getFullYear()} NFS — Tous droits réservés</p>
        <div className="flex items-center gap-2" aria-hidden="true">
          {BACKGROUNDS.map((src, index) => (
            <span
              key={src}
              className={[
                'h-2 rounded-full transition-all duration-500',
                activeIndex === index ? 'w-6 bg-white' : 'w-2 bg-white/45',
              ].join(' ')}
            />
          ))}
        </div>
      </div>
    </div>
  );
}