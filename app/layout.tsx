import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.adafakta.web.id'),
  title: {
    default: "Ada Fakta: Berita Terkini Hari Ini, Fakta Aktual Terpercaya",
    template: "%s | Ada Fakta",
  },
  description: "Portal berita dan informasi seputar perkembangan teknologi, software, gadget, AI, dan kabar terkini.",
  openGraph: {
    title: "Ada Fakta: Berita Terkini Hari Ini, Fakta Aktual Terpercaya",
    description: "Portal berita dan informasi seputar perkembangan teknologi, software, gadget, AI, dan kabar terkini.",
    siteName: "Ada Fakta",
    locale: "id_ID",
    type: "website",
  },
  verification: {
    google: "NA1fdypaSoCCl78MmgJf3I5WDVSDC9AIn_I9g9zAqrU",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${jakarta.variable} ${inter.variable} antialiased`}
    >
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9829376296588403"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans bg-gray-50 text-gray-900">
        <main className="flex-grow">
          {children}
        </main>
      </body>
    </html>
  );
}

