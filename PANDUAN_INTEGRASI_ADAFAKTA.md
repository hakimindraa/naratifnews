# PANDUAN INTEGRASI FITUR "JURNALIS AI" UNTUK REDAKSI ADAFAKTA.WEB.ID

Dokumen ini adalah instruksi kerja lengkap untuk AI Agent / Developer di repositori **adafakta.web.id**.

---

## 1. TUJUAN FITUR
Membangun alur kerja asisten redaksi otomatis (*AI-Assisted Newsroom*):
1. **Penerimaan Otomatis**: Website `adafakta.web.id` menerima setoran intelijen berita terhangat dari Bot Jurnalis (`berita-ai`) melalui API.
2. **Penyimpanan Draft**: Berita yang diterima disimpan ke tabel `jurnalis_drafts` di Neon Postgres sebagai draft usulan liputan.
3. **Sidebar & Menu Admin**: Menambahkan menu baru **"Jurnalis"** di sidebar panel admin.
4. **Generator Berita 1-Klik**: Di panel admin, redaktur cukup klik tombol **"⚡ Generate Jadi Berita Lengkap"** untuk meminta AI menulis artikel berita utuh (350–500 kata, kaidah 5W+1H, gaya jurnalistik objektif) siap terbit.

---

## 2. SKEMA DATABASE NEON POSTGRES
Jalankan script SQL berikut di console Neon Postgres milik `adafakta.web.id`:

```sql
CREATE TABLE IF NOT EXISTS jurnalis_drafts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  original_url TEXT UNIQUE NOT NULL,
  published_at TIMESTAMPTZ,
  summary TEXT,
  status TEXT DEFAULT 'draft', -- 'draft', 'generated', 'published', 'archived'
  generated_title TEXT,
  generated_article TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 3. ENVIRONMENT VARIABLES
Tambahkan variabel berikut ke `.env.local` dan pengaturan Vercel proyek `adafakta.web.id`:

```env
# Kunci rahasia untuk menerima kiriman dari Bot Jurnalis
JURNALIS_API_KEY=kuncirahasiajurnalis123

# Kredensial AI untuk Generate Artikel Lengkap (9router / OpenAI Compatible)
NINEROUTER_BASE_URL=http://node7.botkeep.cloud:40022/v1
NINEROUTER_API_KEY=sk-d6bddb272e797ddb-oj08b1-36238240
NINEROUTER_MODEL=ag/claude-opus-4-6-thinking
```

---

## 4. API ROUTE: PENERIMA BERITA DARI BOT
Buat file `app/api/incoming-news/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { sql } from "@/lib/db"; // Sesuaikan dengan instance neon sql Anda

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-api-key");

    if (!apiKey || apiKey !== process.env.JURNALIS_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, source, url, published_at, summary } = body;

    if (!title || !url) {
      return NextResponse.json(
        { error: "Judul dan URL wajib diisi" },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO jurnalis_drafts (title, source, original_url, published_at, summary)
      VALUES (${title}, ${source}, ${url}, ${published_at || new Date().toISOString()}, ${summary || ""})
      ON CONFLICT (original_url) DO NOTHING
      RETURNING id;
    `;

    return NextResponse.json({
      success: true,
      inserted: result.length > 0,
      message: result.length > 0 ? "Berita berhasil masuk ke draf jurnalis" : "Berita sudah ada sebelumnya",
    });
  } catch (error) {
    console.error("Error incoming news:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}
```

---

## 5. API ROUTE: GENERATOR ARTIKEL LENGKAP
Buat file `app/api/admin/jurnalis/generate/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { draftId } = await req.json();

    if (!draftId) {
      return NextResponse.json({ error: "draftId diperlukan" }, { status: 400 });
    }

    // 1. Ambil data draf dari database
    const rows = await sql`
      SELECT id, title, source, original_url, summary
      FROM jurnalis_drafts
      WHERE id = ${draftId}
      LIMIT 1;
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Draf tidak ditemukan" }, { status: 404 });
    }

    const draft = rows[0];

    // 2. Hubungi LLM via 9router
    const openai = new OpenAI({
      baseURL: process.env.NINEROUTER_BASE_URL,
      apiKey: process.env.NINEROUTER_API_KEY,
    });

    const promptSystem = `Kamu adalah jurnalis dan editor berita senior di media "AdaFakta" (adafakta.web.id). 
Tugasmu adalah menulis artikel berita utuh berbahasa Indonesia yang objektif, faktual, mendalam, dan mematuhi kaidah 5W+1H (What, Who, Where, When, Why, How).
Pedoman penulisan:
1. Buat judul berita yang lugas, menarik, dan informatif (tanpa clickbait murahan).
2. Tulis isi berita sebanyak 350 sampai 500 kata yang terdiri dari:
   - Paragraf Lead (inti peristiwa terhangat).
   - Paragraf Penjelasan & Konteks (latar belakang kejadian).
   - Dampak atau implikasi peristiwa bagi masyarakat/sektor terkait.
   - Paragraf Penutup yang merangkum status terkini.
3. Jangan mengarang fakta fiktif di luar konteks berita sumber.
4. Format output dalam bentuk JSON persis seperti ini:
{
  "title": "Judul Berita Baru",
  "content": "Isi lengkap artikel berita...",
  "category": "Kategori yang cocok (misal: Politik, Ekonomi, Teknologi, Nasional, Internasional)",
  "tags": ["tag1", "tag2", "tag3"]
}`;

    const promptUser = `Tolong tuliskan artikel berita lengkap berdasarkan fakta intelijen berikut:
Judul Sumber: ${draft.title}
Sumber Media Asli: ${draft.source}
Tautan Asli: ${draft.original_url}
Ringkasan Fakta: ${draft.summary}`;

    const response = await openai.chat.completions.create({
      model: process.env.NINEROUTER_MODEL || "ag/claude-opus-4-6-thinking",
      messages: [
        { role: "system", content: promptSystem },
        { role: "user", content: promptUser },
      ],
      response_format: { type: "json_object" },
    });

    const aiResultRaw = response.choices[0]?.message?.content ?? "{}";
    const aiParsed = JSON.parse(aiResultRaw);

    // 3. Simpan hasil generate ke database
    await sql`
      UPDATE jurnalis_drafts
      SET 
        generated_title = ${aiParsed.title || draft.title},
        generated_article = ${aiParsed.content || ""},
        status = 'generated'
      WHERE id = ${draftId};
    `;

    return NextResponse.json({
      success: true,
      data: {
        draftId,
        generatedTitle: aiParsed.title || draft.title,
        generatedArticle: aiParsed.content || "",
        category: aiParsed.category || "Umum",
        tags: aiParsed.tags || [],
      },
    });
  } catch (error) {
    console.error("Gagal generate artikel:", error);
    return NextResponse.json(
      { error: "Gagal memproses AI", details: String(error) },
      { status: 500 }
    );
  }
}
```

---

## 6. TAMBAHKAN MENU SIDEBAR ADMIN
Di komponen Sidebar panel admin Anda (misalnya `components/admin/Sidebar.tsx`), tambahkan item navigasi:

```tsx
{
  name: "Jurnalis AI",
  href: "/admin/jurnalis",
  icon: NewspaperIcon, // Atau icon koran/robot favorit Anda
  badge: "Baru"
}
```

---

## 7. HALAMAN PANEL ADMIN: `app/admin/jurnalis/page.tsx`
Buat halaman untuk melihat dan mengelola draf usulan jurnalis:

```tsx
import { sql } from "@/lib/db";
import JurnalisClientView from "./JurnalisClientView";

export const dynamic = "force-dynamic";

export interface JurnalisDraft {
  id: number;
  title: string;
  source: string;
  original_url: string;
  published_at: string | null;
  summary: string;
  status: string;
  generated_title: string | null;
  generated_article: string | null;
  created_at: string;
}

export default async function AdminJurnalisPage() {
  const drafts = (await sql`
    SELECT *
    FROM jurnalis_drafts
    ORDER BY created_at DESC
    LIMIT 100;
  `) as unknown as JurnalisDraft[];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            🤖 Meja Redaksi Jurnalis AI
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Kumpulan berita hangat hasil riset bot otomatis. Pilih berita dan klik generate untuk membuat artikel utuh siap terbit.
          </p>
        </div>
        <div className="text-sm px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
          {drafts.length} Usulan Tersedia
        </div>
      </div>

      <JurnalisClientView initialDrafts={drafts} />
    </div>
  );
}
```

---

## 8. KOMPONEN INTERAKTIF: `app/admin/jurnalis/JurnalisClientView.tsx`

```tsx
"use client";

import { useState } from "react";
import { JurnalisDraft } from "./page";

export default function JurnalisClientView({
  initialDrafts,
}: {
  initialDrafts: JurnalisDraft[];
}) {
  const [drafts, setDrafts] = useState<JurnalisDraft[]>(initialDrafts);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [activePreview, setActivePreview] = useState<{
    title: string;
    content: string;
  } | null>(null);

  async function handleGenerate(draftId: number) {
    setLoadingId(draftId);
    try {
      const res = await fetch("/api/admin/jurnalis/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });

      const json = await res.json();
      if (json.success) {
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === draftId
              ? {
                  ...d,
                  status: "generated",
                  generated_title: json.data.generatedTitle,
                  generated_article: json.data.generatedArticle,
                }
              : d
          )
        );
        setActivePreview({
          title: json.data.generatedTitle,
          content: json.data.generatedArticle,
        });
      } else {
        alert(json.error || "Gagal membuat artikel");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {drafts.map((draft) => (
          <div
            key={draft.id}
            className="border rounded-xl p-5 bg-white dark:bg-gray-800 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {draft.source}
                </span>
                <span>
                  {draft.published_at ? new Date(draft.published_at).toLocaleDateString("id-ID") : "-"}
                </span>
              </div>

              <h2 className="font-semibold text-base text-gray-900 dark:text-gray-100 line-clamp-2 mb-2">
                {draft.title}
              </h2>

              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-4 mb-4">
                {draft.summary}
              </p>
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <a
                  href={draft.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-blue-600 underline"
                >
                  Buka Sumber Asli ↗
                </a>

                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    draft.status === "generated"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {draft.status === "generated" ? "Siap Terbit" : "Draf Mentah"}
                </span>
              </div>

              {draft.status === "generated" ? (
                <button
                  onClick={() =>
                    setActivePreview({
                      title: draft.generated_title || draft.title,
                      content: draft.generated_article || "",
                    })
                  }
                  className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Lihat Artikel Lengkap AI 📄
                </button>
              ) : (
                <button
                  disabled={loadingId === draft.id}
                  onClick={() => handleGenerate(draft.id)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                >
                  {loadingId === draft.id ? "Sedang Menulis..." : "⚡ Generate Berita Lengkap"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Preview Artikel Lengkap */}
      {activePreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50 dark:bg-gray-800">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                Hasil Penulisan Jurnalis AI
              </h3>
              <button
                onClick={() => setActivePreview(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {activePreview.title}
              </h1>
              <div className="prose dark:prose-invert max-w-none whitespace-pre-line text-gray-700 dark:text-gray-300 leading-relaxed">
                {activePreview.content}
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 dark:bg-gray-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${activePreview.title}\n\n${activePreview.content}`
                  );
                  alert("Artikel berhasil disalin ke clipboard!");
                }}
                className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Salin ke Clipboard
              </button>
              <button
                onClick={() => setActivePreview(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```
