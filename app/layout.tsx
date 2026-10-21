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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.adafakta.web.id';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Ada Fakta: Berita Terkini Hari Ini, Fakta Aktual Terpercaya",
    template: "%s | Ada Fakta",
  },
  description: "Portal berita dan informasi seputar perkembangan teknologi, software, gadget, AI, dan kabar terkini.",
  alternates: {
    canonical: `${siteUrl}/`,
  },
  openGraph: {
    title: "Ada Fakta: Berita Terkini Hari Ini, Fakta Aktual Terpercaya",
    description: "Portal berita dan informasi seputar perkembangan teknologi, software, gadget, AI, dan kabar terkini.",
    siteName: "Ada Fakta",
    locale: "id_ID",
    type: "website",
  },
  verification: {
    google: "3LJKvrRNp9AokPfB1aXVprINx5QN1n5xC9_VQ7yYRmQ",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      "url": siteUrl,
      "name": "Ada Fakta",
      "alternateName": ["adafakta", "adafakta.web.id", "AdaFakta"],
      "description": "Portal berita dan informasi seputar perkembangan teknologi, software, gadget, AI, dan kabar terkini.",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${siteUrl}/cari?q={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      },
      "inLanguage": "id-ID"
    },
    {
      "@type": "NewsMediaOrganization",
      "@id": `${siteUrl}/#organization`,
      "name": "Ada Fakta",
      "url": siteUrl,
      "logo": {
        "@type": "ImageObject",
        "url": `${siteUrl}/favicon.ico`
      },
      "sameAs": [
        "https://whatsapp.com/channel/0029VbDdM7DFSAszJWyjca01"
      ]
    }
  ]
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
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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

