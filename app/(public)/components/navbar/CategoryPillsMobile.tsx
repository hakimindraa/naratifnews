'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

interface CategoryItem {
  name: string;
  slug: string;
  href: string;
}

interface CategoryPillsMobileProps {
  categories: CategoryItem[];
}

export default function CategoryPillsMobile({ categories }: CategoryPillsMobileProps) {
  const pathname = usePathname();

  return (
    <div className="lg:hidden relative bg-white border-b border-gray-100">
      <div className="px-4 py-2 overflow-x-auto scrollbar-hide flex items-center space-x-2">
        {categories.map((cat) => {
          const isActive =
            cat.href === "/"
              ? pathname === "/"
              : pathname.startsWith(cat.href);

          return (
            <Link
              key={cat.name}
              href={cat.href}
              className={`text-xs whitespace-nowrap px-3 py-1.5 rounded-full transition-all shrink-0 ${
                isActive
                  ? "bg-black text-white font-bold"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium"
              }`}
            >
              {cat.name}
            </Link>
          );
        })}
      </div>
      {/* Scroll Hint Gradient di Tepi Kanan */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
    </div>
  );
}
