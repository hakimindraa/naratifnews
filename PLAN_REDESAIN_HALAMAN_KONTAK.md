# 📋 Plan Redesain & Penyempurnaan Halaman Kontak (Ada Fakta)

> **Status:** Draft Perencanaan & Usulan Layout (Menunggu Persetujuan User)  
> **Target Kontak:**  
> • **Email:** `hakimindralesmana@gmail.com`  
> • **WhatsApp / Telepon:** `083137412551` (`+62 831-3741-2551`)  
> **File Sasaran:** `app/(public)/kontak/page.tsx`  
> **Prinsip Utama:** *Kredibel, Fungsional, Akses Cepat (Direct Action), Responsif, & Standar Media Siber*.

---

## 1. Analisis Halaman Saat Ini vs Masalah yang Ditemukan

| Komponen Saat Ini | Kondisi Saat Ini | Masalah / Kebutuhan Perbaikan |
| :--- | :--- | :--- |
| **Email** | `redaksi@adafakta.web.id` | Perlu diganti ke **`hakimindralesmana@gmail.com`** sesuai instruksi, dilengkapi fitur *Copy to Clipboard* & tombol kirim langsung. |
| **WhatsApp** | Hanya ada tautan saluran (WhatsApp Channel) | Belum ada jalur komunikasi dua arah langsung ke pengelola/redaksi via nomor **`083137412551`**. Perlu tombol direct chat `https://wa.me/6283137412551` dengan template pesan otomatis. |
| **Keseimbangan Layout** | 3 kartu kecil bertumpuk di kiri, 1 kotak abu-abu kaku di kanan | Terasa ada ruang kosong (*dead space*) di layar desktop, serta kurang interaktif. |
| **Kejelasan Jalur** | Semua topik dicampur rata | Pembaca/mitra bingung: mana jalur untuk kerja sama iklan, mana untuk rilis pers, dan mana untuk klarifikasi/hak jawab berita. |
| **Standar Jurnalistik** | Belum menonjolkan jaminan Hak Jawab & Etika Pers | Sebagai portal berita, wajib menonjolkan transparansi koreksi berita sesuai UU Pers & Pedoman Media Siber. |

---

## 2. Struktur Arsitektur Halaman Baru

```
┌────────────────────────────────────────────────────────────────────────┐
│  BREADCRUMB: Home  >  Kontak Kami                                      │
├────────────────────────────────────────────────────────────────────────┤
│  HEADER UTAMA                                                          │
│  [🟢 Layanan Redaksi Aktif • Respon 1-2 Jam Kerja]                     │
│  Judul: "Hubungi Redaksi & Kemitraan Ada Fakta"                        │
│  Subjudul: Deskripsi keterbukaan siaran pers, rilis produk, klarifikasi│
├────────────────────────────────────────────────────────────────────────┤
│  BARIS 1: KARTU KONTAK PRIORITAS (2 Kolom Lebar / High-Impact Cards)   │
│  ┌──────────────────────────────────┬────────────────────────────────┐ │
│  │ 💬 WHATSAPP REDAKSI (LANGSUNG)   │ ✉️ EMAIL REDAKSI & KERJA SAMA  │ │
│  │ 0831-3741-2551                   │ hakimindralesmana@gmail.com    │ │
│  │ Respons cepat untuk konfirmasi,  │ Pengiriman rilis pers, draft   │ │
│  │ kemitraan bisnis, & rilis urgent │ dokumen, proposal, & hak jawab │ │
│  │ [ Chat WhatsApp ↗ ] [ Salin 📋 ] │ [ Kirim Email ↗ ] [ Salin 📋 ] │ │
│  └──────────────────────────────────┴────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│  BARIS 2: KANAL KOMUNITAS & IDENTITAS MEDIA (2 Kolom Ramping)          │
│  ┌──────────────────────────────────┬────────────────────────────────┐ │
│  │ 📢 Saluran WhatsApp Resmi        │ 🌐 Domain & Portal Informasi   │ │
│  │ Ikuti siaran berita terkini      │ adafakta.web.id                │ │
│  │ [ Buka Kanal WhatsApp ↗ ]        │ [ Lihat Susunan Redaksi ➔ ]    │ │
│  └──────────────────────────────────┴────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│  BARIS 3: KETENTUAN SIARAN PERS & STANDAR HAK JAWAB (Split Grid)       │
│  ┌──────────────────────────────────┬────────────────────────────────┐ │
│  │ 📄 Panduan Pengiriman Siaran Pers│ ⚖️ Hak Jawab & Klarifikasi     │ │
│  │ • Relevansi: AI, Gadget, Sains   │ • Perlindungan UU Pers No. 40  │ │
│  │ • Materi: Teks, Foto HD, Kontak  │ • Respons koreksi transparan   │ │
│  │ • Bebas embargo / rilis resmi    │ • Standar Pedoman Media Siber  │ │
│  │ [ Baca Pedoman Lengkap ➔ ]       │ [ Ajukan Hak Jawab ➔ ]         │ │
│  └──────────────────────────────────┴────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│  BARIS 4: PERTANYAAN UMUM / FAQ SINGKAT (Accordion / Pill Cards)       │
│  • Berapa lama rilis pers diproses? (1x24 jam kerja)                   │
│  • Apakah ada biaya publikasi siaran pers? (Gratis untuk rilis berita) │
│  • Format apa yang direkomendasikan? (.docx, Google Docs, PDF + Foto)  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detail Rincian Komponen & Fitur Interaktif

### A. Kartu WhatsApp Redaksi (Direct Chat CTA)
- **Nomor:** `+62 831-3741-2551` (Format lokal: `083137412551`)
- **Action Button 1:** Tautan langsung membuka WhatsApp Web / Aplikasi:
  ```
  https://wa.me/6283137412551?text=Halo%20Redaksi%20Ada%20Fakta%2C%20saya%20ingin%20berkorespondensi%20mengenai...
  ```
- **Action Button 2:** Tombol "Salin Nomor" dengan ikon copy dan feedback instan ("Tersalin!").
- **Visual:** Background putih bersih dengan aksen border halus, ikon WhatsApp berwarna hijau emerald (`#25D366`), badge status waktu respons.

### B. Kartu Surel / Email Redaksi
- **Alamat:** `hakimindralesmana@gmail.com`
- **Action Button 1:** Tautan `mailto:hakimindralesmana@gmail.com?subject=[Siaran%20Pers%20/%20Kemitraan]%20Ada%20Fakta`
- **Action Button 2:** Tombol "Salin Email" dengan feedback instan.
- **Visual:** Aksen warna gelap elegan, badge kategori email (Press Release, Iklan/Sponsorship, Opini Publik).

### C. Saluran WhatsApp Resmi & Legalitas Media
- Tautan ke kanal WhatsApp Ada Fakta: `https://whatsapp.com/channel/0029VbDdM7DFSAszJWyjca01`
- Tautan silang (*cross-links*) ke halaman pendukung kredibilitas:
  - `Susunan Redaksi` (`/redaksi`)
  - `Pedoman Media Siber` (`/pedoman`)
  - `Kebijakan Privasi` (`/privasi`)

### D. Panduan & Checklist Siaran Pers (Press Release)
Mengubah teks biasa menjadi kartu checklist modern dengan icon centang hijau:
1. **Fokus Liputan:** Bidang teknologi, Artificial Intelligence, gadget, sains, startup, dan transformasi digital.
2. **Kelengkapan Dokumen:** Siaran pers format teks naratif (5W+1H), lampiran foto beresolusi tinggi (min. 1200px), dan kontak narahubung resmi.
3. **Independensi Editorial:** Redaksi berhak menyunting judul dan isi rilis untuk kesesuaian EYD & gaya jurnalisme Ada Fakta tanpa mengubah substansi fakta.

### E. Penanganan Hak Jawab & Klarifikasi
Sesuai amanat Dewan Pers dan UU No. 40 Tahun 1999 tentang Pers:
- Memberikan saluran prioritas bagi pihak yang ingin mengoreksi kekeliruan data atau mengajukan hak jawab.
- Menjamin pembaruan dan transparansi ralat pada artikel terkait.

---

## 4. Dua Pilihan Opsi Tampilan (Untuk Disepakati)

### Opsi A (Rekomendasi): *Modern Bento Grid (2 Kolom Interaktif)*
- **Struktur:** 
  - Bagian atas: 2 Kartu Besar Utama (WhatsApp 083137412551 & Email hakimindralesmana@gmail.com) berdampingan dengan tombol CTA tebal dan tombol salin.
  - Bagian tengah: 2 Kartu Sekunder (Saluran Komunitas WA & Legalitas Domain/Redaksi).
  - Bagian bawah: 2 Box Bersebelahan (Panduan Siaran Pers & Jalur Hak Jawab/FAQ).
- **Kelebihan:** Sangat seimbang di desktop, rapi saat di-stack di layar HP, modern ala landing page teknologi saat ini.

### Opsi B: *Split View Klasik Ditingkatkan (Left Contact + Right Form/Guide)*
- **Struktur:**
  - Kolom Kiri (45%): Daftar kontak vertikal lengkap (Email, WA Pribadi, Saluran, Lokasi/Domain) dengan tombol salin.
  - Kolom Kanan (55%): Panduan interaktif Siaran Pers + Accordion FAQ pertanyaan yang sering ditanyakan.
- **Kelebihan:** Mirip layout saat ini namun jauh lebih padat, rapi, dan tidak ada ruang kosong.

---

## 5. Rencana File yang Dikerjakan Saat Implementasi Disetujui

1. **`app/(public)/kontak/page.tsx`**: Update layout utama dengan struktur bento grid modern, metadata SEO lengkap, dan konten baru.
2. **Komponen Interaktif Pendukung**:
   - Menambahkan tombol interaktif salin (Copy to Clipboard) dengan feedback visual tanpa merusak SSR (Next.js Server Component + mini client interactivity).

---

> [!NOTE]
> **Tidak ada perubahan kode yang diterapkan saat ini.** Rencana ini disiapkan untuk mendapatkan arahan dan konfirmasi dari Anda terlebih dahulu. Silakan berikan masukan atau konfirmasi jika ada poin yang ingin disesuaikan.
