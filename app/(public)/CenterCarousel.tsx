'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface ArticleItem {
  id: number;
  slug: string;
  title: string;
  category: string;
  coverUrl: string | null;
  publishedAt: string | null;
}

interface CenterCarouselProps {
  articles: ArticleItem[];
}

export default function CenterCarousel({ articles }: CenterCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Bagi artikel menjadi pasangan (2 kartu per slide)
  const originalSlides = useMemo(() => {
    if (!articles || articles.length === 0) return [];
    const pairs: ArticleItem[][] = [];
    for (let i = 0; i < articles.length; i += 2) {
      pairs.push(articles.slice(i, i + 2));
    }
    return pairs;
  }, [articles]);

  const totalOriginalSlides = originalSlides.length;

  // Infinite seamless loop: tambahkan clone slide pertama di ujung akhir
  const allSlides = useMemo(() => {
    if (totalOriginalSlides <= 1) return originalSlides;
    return [...originalSlides, originalSlides[0]];
  }, [originalSlides, totalOriginalSlides]);

  // Timer auto-swipe ke kiri setiap 4.5 detik
  useEffect(() => {
    if (totalOriginalSlides <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setIsTransitioning(true);
      setCurrentIndex((prev) => prev + 1);
    }, 4500);

    return () => clearInterval(timer);
  }, [totalOriginalSlides, isPaused]);

  // Reset instan 0ms saat transisi menuju slide clone (ujung akhir) selesai
  const handleTransitionEnd = () => {
    if (currentIndex >= totalOriginalSlides) {
      setIsTransitioning(false);
      setCurrentIndex(0);
    }
  };

  // Aktifkan kembali transisi setelah reset 0ms selesai
  useEffect(() => {
    if (!isTransitioning && currentIndex === 0) {
      const resetTimer = setTimeout(() => {
        setIsTransitioning(true);
      }, 50);
      return () => clearTimeout(resetTimer);
    }
  }, [isTransitioning, currentIndex]);

  if (!articles || articles.length === 0) return null;

  // Titik aktif selalu mengacu pada indeks asli (0, 1, 2)
  const activeDot = currentIndex % totalOriginalSlides;

  return (
    <div
      className="mt-3.5 pt-3.5 border-t border-gray-200"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Baris Header Teks Murni Tanpa Ikon + Titik Indikator */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
          Pilihan Redaksi
        </span>

        {totalOriginalSlides > 1 && (
          <div className="flex items-center gap-1.5" aria-label="Navigasi slide">
            {Array.from({ length: totalOriginalSlides }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setIsTransitioning(true);
                  setCurrentIndex(i);
                }}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  i === activeDot ? 'w-4 bg-red-600' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Kontainer Slide Ringan dengan Infinite Loop */}
      <div className="overflow-hidden">
        <div
          onTransitionEnd={handleTransitionEnd}
          className="flex"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
            transition: isTransitioning ? 'transform 500ms ease-in-out' : 'none',
          }}
        >
          {allSlides.map((pair, slideIndex) => (
            <div
              key={slideIndex}
              className="w-full shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              {pair.map((art) => (
                <Link
                  key={`${slideIndex}-${art.id}`}
                  href={`/berita/${art.category.toLowerCase()}/${art.id}/${art.slug}`}
                  className="group flex items-start gap-2.5 p-1 rounded hover:bg-gray-50 transition-colors"
                >
                  {/* Thumbnail Mini 16:9 */}
                  <div className="w-20 h-14 shrink-0 overflow-hidden bg-gray-100">
                    <img
                      src={art.coverUrl || ''}
                      alt={art.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  {/* Teks Judul & Kategori */}
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 group-hover:text-red-600 transition-colors block leading-tight">
                      {art.category}
                    </span>
                    <h4 className="font-heading font-medium text-xs sm:text-[13px] text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 leading-snug mt-0.5">
                      {art.title}
                    </h4>
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
