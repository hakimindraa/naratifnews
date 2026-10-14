'use client';

import { useEffect, useRef } from 'react';
import { AdSlotConfig } from '@/lib/ads';

interface AdSlotProps {
  config?: AdSlotConfig;
  clientId: string;
  className?: string;
}

export default function AdSlot({ config, clientId, className = '' }: AdSlotProps) {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (config?.enabled && config.type === 'adsense' && !pushedRef.current) {
      try {
        if (typeof window !== 'undefined') {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
          pushedRef.current = true;
        }
      } catch (err) {
        console.debug('AdSense unit push note:', err);
      }
    }
  }, [config]);

  if (!config || !config.enabled) {
    return null;
  }

  // Tipe 1: Banner Sponsor Custom (Lokal / Klien Mandiri)
  if (config.type === 'custom') {
    if (!config.bannerImage) return null;

    return (
      <div className={`w-full my-6 overflow-hidden rounded-2xl border border-gray-100 bg-white p-2.5 shadow-xs ${className}`}>
        <div className="flex items-center justify-between px-2 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          <span>Sponsor Naratif</span>
          <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Promosi</span>
        </div>
        <a
          href={config.bannerUrl || '#'}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="block group overflow-hidden rounded-xl"
        >
          <img
            src={config.bannerImage}
            alt={config.bannerAlt || 'Sponsor Naratif'}
            className="w-full h-auto object-cover max-h-72 rounded-xl group-hover:scale-[1.01] transition-transform duration-300"
          />
        </a>
      </div>
    );
  }

  // Tipe 2: Google AdSense Unit
  return (
    <div className={`w-full my-6 text-center overflow-hidden bg-gray-50/50 rounded-xl p-2 border border-dashed border-gray-200 ${className}`}>
      <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1.5 font-medium">
        Iklan
      </div>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={clientId}
        data-ad-slot={config.slotId || ''}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
