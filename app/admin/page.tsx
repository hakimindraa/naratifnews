import {
  FileText,
  Clock,
  CheckCircle2,
  PenSquare,
  Sparkles,
  Link2,
  Bot,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import UploadButton from './UploadButton';
import MarkdownGuideAccordion from './MarkdownGuideAccordion';
import ArticleManagerClient, { ArticleItem } from './ArticleManagerClient';
import BotJurnalisWidget from './BotJurnalisWidget';
import { db } from '@/db';
import { articles, aiGenerationLogs, jurnalisDrafts } from '@/db/schema';
import { desc, eq, and, isNotNull } from 'drizzle-orm';

export const instant = false;

export default async function AdminDashboard() {
  const [dbArticles, logs, jurnalisQueued, allJurnalisDrafts] = await Promise.all([
    db.select().from(articles).orderBy(desc(articles.createdAt)),
    db.select({ articleId: aiGenerationLogs.articleId, prompt: aiGenerationLogs.prompt }).from(aiGenerationLogs),
    db
      .select()
      .from(jurnalisDrafts)
      .where(
        and(
          eq(jurnalisDrafts.status, 'ready_to_publish'),
          isNotNull(jurnalisDrafts.coverUrl)
        )
      )
      .orderBy(desc(jurnalisDrafts.publishAt)),
    db
      .select({ id: jurnalisDrafts.id, status: jurnalisDrafts.status })
      .from(jurnalisDrafts),
  ]);

  const logMap = new Map<number, string>();
  for (const log of logs) {
    if (log.articleId) {
      logMap.set(log.articleId, log.prompt);
    }
  }

  function getArticleSource(author: string, prompt?: string): ArticleItem['source'] {
    const authLower = (author || '').toLowerCase();
    const promptLower = (prompt || '').toLowerCase();

    if (authLower.includes('saduran') || promptLower.startsWith('[sadur')) {
      return 'sadur';
    }
    if (authLower.includes('autopilot')) {
      return 'autopilot';
    }
    if (authLower.includes('telegram')) {
      return 'telegram';
    }
    if (authLower.includes('(ai)') || authLower.includes('studio') || prompt) {
      return 'studio';
    }
    return 'manual';
  }

  const jurnalisItems: ArticleItem[] = jurnalisQueued.map((d) => ({
    id: -(100000 + d.id),
    slug: `jurnalis-draft-${d.id}`,
    title: d.generatedTitle || d.title,
    excerpt: d.summary || '',
    coverUrl: d.coverUrl,
    coverCaption: d.coverCaption || `Ilustrasi: ${d.generatedTitle || d.title}`,
    category: d.category || 'Nasional',
    author: 'Redaksi 2',
    tags: d.tags || ['antrean-jurnalis'],
    status: 'scheduled',
    publishAt: d.publishAt || new Date(Date.now() + 2 * 60 * 60 * 1000),
    publishedAt: null,
    createdAt: d.createdAt,
    source: 'jurnalis' as const,
    isJurnalisQueue: true,
    jurnalisDraftId: d.id,
  }));

  const articlesData: ArticleItem[] = [
    ...jurnalisItems,
    ...dbArticles.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      coverUrl: a.coverUrl,
      coverCaption: a.coverCaption,
      category: a.category,
      author: a.author,
      tags: a.tags,
      status: a.status,
      publishAt: a.publishAt,
      publishedAt: a.publishedAt,
      createdAt: a.createdAt,
      source: getArticleSource(a.author, logMap.get(a.id)),
    })),
  ];

  // Metrik Status Utama
  const totalArticles = articlesData.length;
  const publishedArticles = articlesData.filter((a) => a.status === 'published').length;
  const draftArticles = articlesData.filter((a) => a.status === 'draft').length;
  const scheduledArticles = articlesData.filter((a) => a.status === 'scheduled').length;

  // Metrik Sumber Draf AI
  const studioDrafts = articlesData.filter((a) => a.status === 'draft' && a.source === 'studio').length;
  const studioTotal = articlesData.filter((a) => a.source === 'studio').length;

  const sadurDrafts = articlesData.filter((a) => a.status === 'draft' && a.source === 'sadur').length;
  const sadurTotal = articlesData.filter((a) => a.source === 'sadur').length;

  const autopilotDrafts = articlesData.filter((a) => a.status === 'draft' && a.source === 'autopilot').length;
  const autopilotTotal = articlesData.filter((a) => a.source === 'autopilot').length;

  const jurnalisQueueCount = jurnalisQueued.length;
  const jurnalisTotalCount = allJurnalisDrafts.length;

  const manualDrafts = articlesData.filter((a) => a.status === 'draft' && a.source === 'manual').length;
  const manualTotal = articlesData.filter((a) => a.source === 'manual').length;

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER BANNER DENGAN QUICK ACTION BUTTONS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-gray-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ada Fakta Redaksi</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 font-heading">
            Dasbor Redaksi
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Kelola arsip berita, tinjau draf hasil generate AI, dan terbitkan artikel Ada Fakta secara langsung.
          </p>
        </div>

        {/* Action Buttons: Tulis Berita, AI Studio, Sadur & Upload Bulk */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <Link
            href="/admin/tulis"
            className="inline-flex items-center justify-center gap-1.5 bg-gray-900 hover:bg-black text-white px-3.5 py-2.5 rounded-xl font-bold shadow-xs text-xs sm:text-sm transition-all"
          >
            <PenSquare className="w-4 h-4 shrink-0" />
            <span>Tulis Berita</span>
          </Link>

          <Link
            href="/admin/generator"
            className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2.5 rounded-xl font-bold shadow-xs text-xs sm:text-sm transition-all"
          >
            <Sparkles className="w-4 h-4 shrink-0 text-indigo-200" />
            <span>AI Studio</span>
          </Link>

          <Link
            href="/admin/sadur"
            className="inline-flex items-center justify-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white px-3.5 py-2.5 rounded-xl font-bold shadow-xs text-xs sm:text-sm transition-all"
          >
            <Link2 className="w-4 h-4 shrink-0 text-cyan-200" />
            <span>Sadur URL</span>
          </Link>

          <UploadButton />
        </div>
      </div>

      {/* HIGHLIGHT WIDGET: PORTAL BOT JURNALIS TELEGRAM */}
      <BotJurnalisWidget />

      {/* 2. KARTU BARIS 1: STATUS PUBLIKASI UTAMA */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Artikel */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Total Artikel
            </div>
            <div className="text-2xl sm:text-3xl font-black font-heading text-gray-900">
              {totalArticles}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">Semua arsip berita</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-100 text-gray-800 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Sudah Terbit */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
              Sudah Terbit
            </div>
            <div className="text-2xl sm:text-3xl font-black font-heading text-emerald-700">
              {publishedArticles}
            </div>
            <div className="text-[11px] text-emerald-600/80 mt-0.5">Tayang di website</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Draf Siap Review */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 mb-1 flex items-center gap-1.5">
              <span>Draf Review</span>
              {draftArticles > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>
            <div className="text-2xl sm:text-3xl font-black font-heading text-amber-700">
              {draftArticles}
            </div>
            <div className="text-[11px] text-amber-600/80 mt-0.5">Menunggu pemeriksaan</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <PenSquare className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Terjadwal */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              Terjadwal
            </div>
            <div className="text-2xl sm:text-3xl font-black font-heading text-blue-700">
              {scheduledArticles}
            </div>
            <div className="text-[11px] text-blue-600/80 mt-0.5">Menunggu jam tayang</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* 3. KARTU BARIS 2: RINCIAN DRAF HASIL GENERATE AI & PRODUKSI BERITA */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
              Produksi & Draf Berdasarkan Sumber AI
            </span>
            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
              Realtime Neon DB
            </span>
          </div>
          <span className="text-[11px] text-gray-400">
            Menampilkan jumlah draf yang perlu ditinjau
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* 1. AI Studio Generator */}
          <Link
            href="/admin/generator"
            className="group bg-gradient-to-br from-indigo-50/70 to-white p-4 sm:p-4.5 rounded-2xl border border-indigo-100 hover:border-indigo-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-100/80 text-indigo-800">
                AI Studio
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black font-heading text-indigo-950">
                  {studioDrafts}
                </span>
                <span className="text-xs font-semibold text-indigo-700">Draf</span>
                <span className="text-[11px] text-gray-400">/ {studioTotal} total</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                Dari riset topik AI Studio
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-indigo-100/60 flex items-center justify-between text-[11px] font-bold text-indigo-600 group-hover:text-indigo-800">
              <span>Buka AI Studio</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* 2. Sadur Berita URL */}
          <Link
            href="/admin/sadur"
            className="group bg-gradient-to-br from-cyan-50/70 to-white p-4 sm:p-4.5 rounded-2xl border border-cyan-100 hover:border-cyan-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-cyan-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Link2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-cyan-100/80 text-cyan-800">
                Sadur URL
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black font-heading text-cyan-950">
                  {sadurDrafts}
                </span>
                <span className="text-xs font-semibold text-cyan-700">Draf</span>
                <span className="text-[11px] text-gray-400">/ {sadurTotal} total</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                Dari saduran tautan luar
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-cyan-100/60 flex items-center justify-between text-[11px] font-bold text-cyan-700 group-hover:text-cyan-900">
              <span>Buka Sadur URL</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* 3. Autopilot AI */}
          <Link
            href="/admin/cron"
            className="group bg-gradient-to-br from-amber-50/70 to-white p-4 sm:p-4.5 rounded-2xl border border-amber-100 hover:border-amber-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Bot className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-800">
                Autopilot
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black font-heading text-amber-950">
                  {autopilotDrafts}
                </span>
                <span className="text-xs font-semibold text-amber-700">Draf</span>
                <span className="text-[11px] text-gray-400">/ {autopilotTotal} total</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                Dari jadwal cron otomatis
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-amber-100/60 flex items-center justify-between text-[11px] font-bold text-amber-700 group-hover:text-amber-900">
              <span>Atur Autopilot</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* 4. Jurnalis AI (Bot Intelijen & Antrean Terjadwal) */}
          <Link
            href="/admin/jurnalis"
            className="group bg-gradient-to-br from-purple-50/70 to-white p-4 sm:p-4.5 rounded-2xl border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Bot className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-100/80 text-purple-800">
                Jurnalis AI
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black font-heading text-purple-950">
                  {jurnalisQueueCount}
                </span>
                <span className="text-xs font-semibold text-purple-700">Terjadwal</span>
                <span className="text-[11px] text-gray-400">/ {jurnalisTotalCount} usulan</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                Antrean berkala per 2 jam
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-purple-100/60 flex items-center justify-between text-[11px] font-bold text-purple-700 group-hover:text-purple-900">
              <span>Buka Jurnalis AI</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* 5. Manual & File .MD */}
          <Link
            href="/admin/tulis"
            className="group bg-gradient-to-br from-gray-50/80 to-white p-4 sm:p-4.5 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <PenSquare className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-gray-200/80 text-gray-800">
                Manual / .MD
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black font-heading text-gray-900">
                  {manualDrafts}
                </span>
                <span className="text-xs font-semibold text-gray-700">Draf</span>
                <span className="text-[11px] text-gray-400">/ {manualTotal} total</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                Tulis langsung atau upload .md
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-800 group-hover:text-black">
              <span>Tulis Berita Baru</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* 4. PANDUAN FORMAT BULK UPLOAD (.MD) — COLLAPSIBLE / TIDAK MEMAKAN RUANG */}
      <MarkdownGuideAccordion />

      {/* 5. INTERACTIVE ARTICLE MANAGER (KARTU STATUS, SEARCH, FILTER, TOGGLE VIEW, & QUICK PUBLISH) */}
      <ArticleManagerClient initialArticles={articlesData} />
    </div>
  );
}
