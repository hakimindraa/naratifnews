# 📸 Rencana Kerja: Penyelarasan Caption Foto Standar Media Nasional (Ala Kompas, Detik, & CNN)

> **Status:** Draft Perencanaan (Revisi 2: Standar Jurnalistik Kompas / Detik / CNN)  
> **Tujuan:** Mengadopsi format penulisan *caption* foto standar media nasional arus utama (Kompas.com, Detikcom, CNN Indonesia) di seluruh ekosistem generate AI (**Meja Jurnalis AI**, **Sadur AI**, **AI Studio**) dan antarmuka admin AdaFakta. Menghapus total kata *"Ilustrasi"* atau *"Ilustrasi liputan:"* dan menggantinya dengan deskripsi peristiwa to-the-point yang diakhiri kredit dokumentasi kredibel.  
> **Prinsip Utama:** *Journalistic Action Description*, *Standard Media Attribution `(Foto: Dok. ...)`*, *Zero "Ilustrasi" Words*, *Automated Sanitizer Guard*.

---

## 1. Standar Format Caption Ala Kompas, Detik, & CNN

Struktur penulisan caption foto di media nasional selalu mematuhi rumus 2 komponen:

$$\mathbf{[\text{Deskripsi Peristiwa / Subjek / Aksi Foto}].\ (\text{Foto: } [\text{Kredit / Sumber}])}$$

### Ciri Khas Format Media Nasional:
1. **Tidak Ada Kata "Ilustrasi"**: DILARANG keras menggunakan awalan *"Ilustrasi liputan:"*, *"Ilustrasi berita:"*, atau *"Ilustrasi:"*.
2. **Deskripsi Lugas & Berorientasi Aksi**: Kalimat langsung menjelaskan peristiwa yang terjadi, subjek berita, atau kondisi objek foto secara faktual dan to-the-point.
3. **Kredit Foto Resmi di Ujung**: Selalu ditutup dengan tanda kurung kredit, seperti:
   * `(Foto: Dok. Istimewa)`
   * `(Foto: Dok. Redaksi)`
   * `(Foto: Dok. Ada Fakta)`
   * Atau nama media rujukan asli: `(Foto: Dok. Antara)`, `(Foto: Dok. TNBTS)`

---

## 2. Perbandingan Format Sebelum vs Format Baru

| Kasus Berita | Format Lama (Kaku & Ramai) | Format Baru Standar Kompas / Detik / CNN |
| :--- | :--- | :--- |
| **Bencana / Regional** *(di screenshot Gunung Bromo)* | `Ilustrasi liputan: Api Padam, Jalur Wisata Gunung Bromo Kembali Dibuka d` | `Kawasan wisata Gunung Bromo kembali dibuka usai titik api padam. (Foto: Dok. Istimewa)`<br/>*Atau otomatis:* `Api Padam, Jalur Wisata Gunung Bromo Kembali Dibuka. (Foto: Dok. Redaksi)` |
| **Teknologi & AI** *(AI Studio Generator)* | `Ilustrasi server AI dan kecerdasan buatan` | `Aktivitas pusat komputasi server kecerdasan buatan generasi terbaru. (Foto: Dok. Istimewa)` |
| **Sadur Berita Internasional / Gadget** *(Sadur AI)* | `Ilustrasi liputan: Apple resmi luncurkan sistem operasi baru` | `Peluncuran sistem operasi generasi baru dengan integrasi kecerdasan buatan. (Foto: Dok. Istimewa)` |
| **Unggah Foto / Pilih Media** | `Ilustrasi sampul berita. (Dok. Ada Fakta / ImgBB)` | `Dokumentasi Ada Fakta. (Foto: Dok. Redaksi)` |

---

## 3. Rencana Langkah Kerja & File Target

### Langkah 1: Perbarui Prompt Sistem AI & Sanitizer di `lib/ai-generator.ts`
* **File Target:** `lib/ai-generator.ts`
* **Poin Perubahan:**
  1. **Prompt Generator AI Studio (`requestArticleFromModelRouter`)**:
     * Perbarui instruksi kolom `coverCaption`:
       ```json
       "coverCaption": "Keterangan foto jurnalistik standar media nasional (Kompas/Detik/CNN): deskripsi peristiwa/subjek to-the-point diakhiri kredit foto (Foto: Dok. Istimewa). DILARANG menggunakan kata 'Ilustrasi' (maksimal 100 karakter)"
       ```
  2. **Prompt Sadur AI (`requestSadurArticleFromSource`)**:
     * Perbarui instruksi kolom `coverCaption`:
       ```json
       "coverCaption": "Keterangan foto jurnalistik standar media nasional (Kompas/Detik/CNN): deskripsi peristiwa/subjek to-the-point diakhiri kredit foto '(Foto: Dok. Istimewa)'. DILARANG menggunakan kata 'Ilustrasi' (maksimal 100 karakter)"
       ```
  3. **Sanitizer Regex Otomatis (`sanitizeCoverCaption`)**:
     * Menjamin jika AI atau input pengguna masih memuat kata *"Ilustrasi"*, sistem akan membersihkannya secara otomatis dan memastikan diakhiri kredit `(Foto: Dok. ...)`:
       ```typescript
       export function sanitizeCoverCaption(
         caption: string | null | undefined, 
         fallbackTitle: string = '', 
         sourceName: string = 'Redaksi'
       ): string {
         let text = (caption || fallbackTitle || '').trim();
         
         // 1. Bersihkan awalan 'Ilustrasi', 'Ilustrasi liputan:', 'Foto ilustrasi:', dsb.
         text = text.replace(/^(?:foto\s+)?ilustrasi(?:\s+(?:liputan|berita|sampul|artikel))?\s*[:–—-]?\s*/i, '');
         
         // 2. Jika tidak ada kredit tanda kurung di akhir, tambahkan kredit standar ala Detik/Kompas
         if (!/\((?:foto|dok)[^)]*\)$/i.test(text)) {
           text = `${text.replace(/[.\s]+$/, '')}. (Foto: Dok. ${sourceName || 'Redaksi'})`;
         }
         
         return text.slice(0, 140).trim();
       }
       ```

---

### Langkah 2: Perbarui Modal Foto Meja Jurnalis AI di `app/admin/jurnalis/DraftPhotoModal.tsx`
* **File Target:** `app/admin/jurnalis/DraftPhotoModal.tsx`
* **Poin Perubahan:**
  1. **Nilai Default Input Caption (Baris 43)**:
     ```typescript
     // SEBELUM:
     const [caption, setCaption] = useState(
       initialCaption || `Ilustrasi liputan: ${draftTitle.slice(0, 80)}`
     );

     // SESUDAH (Standar Kompas/Detik/CNN):
     const [caption, setCaption] = useState(
       initialCaption || `${draftTitle.trim().replace(/[.\s]+$/, '')}. (Foto: Dok. Redaksi)`
     );
     ```
  2. **Placeholder Input (Baris 274)**:
     * Ubah dari: `Contoh: Ilustrasi peluncuran inovasi AI...`
     * Menjadi: `Contoh: Suasana kawasan Gunung Bromo yang kembali dibuka untuk umum. (Foto: Dok. Istimewa)`

---

### Langkah 3: Bersihkan Fallback di Aksi Server Jurnalis AI (`app/admin/jurnalis/actions.ts`)
* **File Target:** `app/admin/jurnalis/actions.ts`
* **Poin Perubahan:**
  1. **Fungsi Publish Langsung (`instantPublishDraftAction`)**:
     * Ganti fallback baris 92 dari `draft.coverCaption || \`Ilustrasi liputan berita: ${title}\`` menjadi `sanitizeCoverCaption(draft.coverCaption, title, draft.source || 'Redaksi')`.
  2. **Fungsi Simpan Foto & Jadwal (`saveDraftPhotoAndScheduleAction`)**:
     * Bersihkan caption yang dimasukkan pengguna menggunakan `sanitizeCoverCaption(caption, draft.title, draft.source)`.
  3. **Fungsi Auto-Publish (`publishDraftImmediately`)**:
     * Ganti fallback baris 520 dari `draft.coverCaption || \`Ilustrasi liputan: ${title}\`` menjadi `sanitizeCoverCaption(draft.coverCaption, title, draft.source)`.

---

### Langkah 4: Sinkronisasi Cron Publisher & Dashboard Admin
* **File Target:**
  * `app/api/cron/jurnalis-publisher/route.ts` (baris 86):
    * Ganti fallback lama menjadi:
      `sanitizeCoverCaption(draftToPublish.coverCaption, title, draftToPublish.source || 'Istimewa')`
  * `app/admin/page.tsx` (baris 88):
    * Ganti `Ilustrasi: ${d.generatedTitle || d.title}` menjadi format judul bersih.

---

### Langkah 5: Bersihkan Media Picker & Form Tulis/Edit Manual
* **File Target:**
  * `app/admin/CoverImagePicker.tsx` (baris 70): Ganti default caption menjadi: `Dokumentasi Ada Fakta. (Foto: Dok. Redaksi)`.
  * `app/admin/ImgbbMediaModal.tsx` (baris 139): Ganti default caption menjadi: `Dokumentasi Ada Fakta. (Foto: Dok. Redaksi)`.
  * `app/admin/tulis/TulisForm.tsx` & `app/admin/edit/[id]/EditForm.tsx`:
    * Ganti placeholder input menjadi: `Contoh: Suasana peluncuran server AI di Jakarta. (Foto: Dok. Istimewa)`.
  * `app/admin/MarkdownGuideAccordion.tsx`:
    * Perbarui contoh panduan frontmatter markdown agar menggunakan format `(Foto: Dok. Unsplash)`.

---

## 4. Validasi & Pengujian

1. **Uji Kompilasi TypeScript:** Menjalankan `npx tsc --noEmit` untuk memastikan 0 error tipe data.
2. **Uji Antarmuka Meja Jurnalis AI:**
   * Buka `/admin/jurnalis` dan klik tombol upload/atur foto pada draf yang ada.
   * Pastikan kolom input caption otomatis terisi rapi dengan format:  
     `Api Padam, Jalur Wisata Gunung Bromo Kembali Dibuka. (Foto: Dok. Redaksi)` tanpa kata *"Ilustrasi liputan:"*.
3. **Uji Generate Baru:**
   * Lakukan generate di AI Studio dan Sadur AI, verifikasi hasilnya menghasilkan caption deskriptif dengan akhiran `(Foto: Dok. Istimewa)`.
4. **Uji Tampilan Halaman Publik:**
   * Buka salah satu artikel di `/berita/...` dan pastikan caption di bawah foto utama tampil bersih, rapi, dan profesional selaras dengan Kompas, Detik, dan CNN.
