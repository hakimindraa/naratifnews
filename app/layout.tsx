import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.naratif.web.id'),
  title: {
    default: "Naratif - Informasi Berita Teknologi",
    template: "%s | Naratif",
  },
  description: "Portal berita dan informasi seputar perkembangan teknologi, software, gadget, AI, dan inovasi digital terkini.",
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
      <body className="min-h-screen flex flex-col font-sans bg-gray-50 text-gray-900">
        <main className="flex-grow">
          {children}
        </main>
      </body>
    </html>
  );
}
