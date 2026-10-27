'use client';

import { useState } from "react";
import MainNavbar from "./MainNavbar";
import BreakingTicker from "./BreakingTicker";
import MobileDrawer from "./MobileDrawer";

interface ArticleItem {
  id: number;
  slug: string;
  title: string;
  category: string;
}

interface NavbarContainerProps {
  breakingNews: ArticleItem | null;
  trendingTags: string[];
}

const CATEGORIES = [
  { name: "Semua", slug: "", href: "/" },
  { name: "Nasional", slug: "nasional", href: "/berita/nasional" },
  { name: "Internasional", slug: "internasional", href: "/berita/internasional" },
  { name: "Regional", slug: "regional", href: "/berita/regional" },
  { name: "Sport", slug: "sport", href: "/berita/sport" },
  { name: "AI", slug: "ai", href: "/berita/ai" },
  { name: "Gadget", slug: "gadget", href: "/berita/gadget" },
  { name: "Software", slug: "software", href: "/berita/software" },
  { name: "Hardware", slug: "hardware", href: "/berita/hardware" },
  { name: "Infrastruktur", slug: "infrastruktur", href: "/berita/infrastruktur" },
];

export default function NavbarContainer({ breakingNews, trendingTags }: NavbarContainerProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <header className="w-full flex flex-col bg-white">
      {/* 1. Main Sticky Header (CNN-Style 1-Row Slim Header) */}
      <div className="sticky top-0 z-40 bg-white">
        <MainNavbar
          categories={CATEGORIES}
          onOpenDrawer={() => setIsDrawerOpen(true)}
        />
      </div>

      {/* 2. Hot Topics Strip ala CNN (sub-header dengan pemisah pipa |) */}
      <BreakingTicker
        breakingNews={breakingNews}
        trendingTags={trendingTags}
      />

      {/* 3. Off-Canvas Mobile Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        categories={CATEGORIES}
      />
    </header>
  );
}
