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
  title: "Naratif - Portal Berita",
  description: "Portal berita bersih, minimalis, dan ramah semua usia.",
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
