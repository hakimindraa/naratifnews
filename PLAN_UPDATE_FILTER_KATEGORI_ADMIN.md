# Rencana Pembaruan Filter Kategori & Badge di Dashboard Admin

Dokumen ini merinci rencana pembaruan filter dropdown kategori di dashboard admin (`app/admin/ArticleManagerClient.tsx`), penambahan styling badge warna untuk kategori baru (**Nasional**, **Internasional**, **Sport**), serta sinkronisasi kategori pada fitur admin lainnya.

---

## 1. Latar Belakang & Masalah

Berdasarkan tangkapan layar dashboard admin:
1. **Dropdown Filter "Semua Kategori"**:
   - Pilihan kategori masih statis dan terbatas pada 6 kategori lama (`AI`, `Regional`, `Software`, `Hardware`, `Gadget`, `Infrastruktur`).
   - Kategori **Nasional**, **Internasional**, dan **Sport** belum tercantum sehingga admin tidak bisa memfilter berita berdasarkan kategori tersebut.
2. **Warna Badge Kategori di Tabel**:
   - Artikel dengan kategori `Sport` (seperti berita *Sekjen FFI Apresiasi Dukungan PSSI...*) tampil dengan warna abu-abu default (`bg-gray-100 text-gray-800`) karena fungsi `getCategoryColor` belum memetakan kategori baru.
3. **Fungsi `createArticle` di Server Action**:
   - Pada `app/admin/actions.ts:L426`, daftar `categoryAllowed` di fungsi `createArticle` masih versi lama dan perlu disinkronkan.

---

## 2. Pratinjau Desain & Tata Letak

### A. Tampilan Dropdown Filter Kategori

```
┌────────────────────────────────────────────────────────┐
│  [🔍 Cari berita... ]  [ Semua Kategori             ▼] │
├────────────────────────┬───────────────────────────────┤
│                        │ Semua Kategori                │
│                        │ AI                            │
│                        │ Nasional          <-- Baru    │
│                        │ Internasional     <-- Baru    │
│                        │ Regional                      │
│                        │ Sport             <-- Baru    │
│                        │ Software                      │
│                        │ Hardware                      │
│                        │ Gadget                        │
│                        │ Infrastruktur                 │
└────────────────────────┴───────────────────────────────┘
```

### B. Palet Warna Badge Kategori di Tabel Admin

Setiap kategori baru diberikan warna khas yang kontras, elegan, dan harmonis:

| Kategori | Styling CSS (Tailwind) | Tampilan Visual |
|:---|:---|:---:|
| **Nasional** | `bg-red-100/90 text-red-800 border-red-200` | Merah / Red |
| **Internasional** | `bg-sky-100/90 text-sky-800 border-sky-200` | Biru Langit / Sky |
| **Sport** | `bg-amber-100/90 text-amber-800 border-amber-200` | Oranye-Amber / Amber |
| **Regional** | `bg-emerald-100/90 text-emerald-800 border-emerald-200` | *(Sudah ada - Hijau)* |
| **AI** | `bg-indigo-100/90 text-indigo-800 border-indigo-200` | *(Sudah ada - Indigo)* |
| **Software** | `bg-blue-100/90 text-blue-800 border-blue-200` | *(Sudah ada - Biru)* |
| **Hardware** | `bg-orange-100/90 text-orange-800 border-orange-200` | *(Sudah ada - Oranye)* |
| **Gadget** | `bg-purple-100/90 text-purple-800 border-purple-200` | *(Sudah ada - Ungu)* |
| **Infrastruktur** | `bg-cyan-100/90 text-cyan-800 border-cyan-200` | *(Sudah ada - Cyan)* |

---

## 3. Ruang Lingkup File yang Diperbarui

Perubahan difokuskan pada sinkronisasi kategori di area admin:

| No | File | Komponen / Fungsi | Deskripsi Perubahan |
|:--:|:---|:---|:---|
| 1 | `app/admin/ArticleManagerClient.tsx` | Dropdown Filter `<select>` (L409) & `getCategoryColor` (L246) | Menambahkan opsi *Nasional*, *Internasional*, *Sport* ke dropdown filter serta menambahkan warna badge masing-masing |
| 2 | `app/admin/actions.ts` | `createArticle` (L426) | Menambahkan *Nasional*, *Internasional*, *Sport* ke array `categoryAllowed` dan `categoryMap` |
| 3 | `app/admin/sadur/page.tsx` | `CATEGORIES` (L34) | Menambahkan kategori baru ke form sadur berita URL |
| 4 | `app/admin/pengaturan/page.tsx` & `actions.ts` | `ALL_CATEGORIES` | Menambahkan kategori baru ke checklist pengaturan autopilot cron |
| 5 | `app/admin/MarkdownGuideAccordion.tsx` | Panduan Upload .MD (L107) | Memperbarui teks panduan daftar kategori yang valid |

---

## 4. Status Eksekusi

✅ **Selesai Diimplementasikan dan Terverifikasi**:
1. Dropdown filter kategori di [ArticleManagerClient.tsx](file:///e:/porto/naratif/app/admin/ArticleManagerClient.tsx) telah memuat **Nasional**, **Internasional**, dan **Sport**.
2. Pewarnaan badge kategori di tabel admin telah aktif:
   - **Nasional**: Merah (`bg-red-100/90 text-red-800 border-red-200`)
   - **Internasional**: Biru Langit (`bg-sky-100/90 text-sky-800 border-sky-200`)
   - **Sport**: Oranye-Amber (`bg-amber-100/90 text-amber-800 border-amber-200`)
3. Fungsi `createArticle` ([actions.ts](file:///e:/porto/naratif/app/admin/actions.ts)), form Sadur URL ([sadur/page.tsx](file:///e:/porto/naratif/app/admin/sadur/page.tsx)), dan Pengaturan Autopilot ([pengaturan/page.tsx](file:///e:/porto/naratif/app/admin/pengaturan/page.tsx)) telah disinkronkan.
4. Lolos pengecekan TypeScript `tsc --noEmit` dengan **0 error**.
