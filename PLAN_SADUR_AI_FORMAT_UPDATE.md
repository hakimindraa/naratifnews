# 📑 Rencana Kerja: Penyelarasan Format Generate Sadur AI (Format Narasi Bersih & Minimalis)

> **Status:** Draft Perencanaan (Belum Diimplementasikan)  
> **Tujuan:** Menyelaraskan hasil generate naskah & deskripsi (*excerpt*) pada fitur **Sadur AI** (`/admin/sadur`) agar identik dengan standar baru yang sudah dipakai pada **Meja Jurnalis AI** dan **AI Studio Generator**: minimalis, narasi mengalir bersih tanpa subjudul kaku/bullet points, awalan identitas redaksi `adafaktanews - `, dan deskripsi ringkas padat.  
> **Prinsip Utama:** *Clean Editorial Narrative*, *Zero Unnecessary Headings*, *Concise Excerpt (≤ 200 Karakter)*, *Seamless Attribution*.

---

## 1. Analisis Perbandingan Saat Ini

Saat ini terdapat ketimpangan output antara fitur AI di portal AdaFakta:

| Parameter | Meja Jurnalis AI & AI Studio (Format Baru) | Sadur AI (`requestSadurArticleFromSource`) (Format Lama) | Status Kesenjangan |
| :--- | :--- | :--- | :--- |
| **Gaya Naskah Konten** | **Narasi Mengalir Bersih**: 3–5 paragraf mengalir. **Dilarang** subjudul (`##`, `###`), **dilarang** bullet points (`*`, `-`). | **Format Lama/Ramai**: Prompt masih memerintahkan `Gunakan Markdown murni (Heading ##, ###, bullet points, penekanan bold...)`. | ⚠️ **Perlu Diselaraskan** |
| **Kalimat Pembuka** | Wajib diawali langsung: `adafaktanews - [isi berita...]` | Tidak ada awalan standar, langsung mengutip naskah sumber asli. | ⚠️ **Perlu Diselaraskan** |
| **Deskripsi Berita (`excerpt`)** | Ringkasan tajam & padat 1–2 kalimat (maksimal 180–200 karakter). | Prompt 250 karakter, namun saat disimpan diizinkan meluber hingga 500 karakter. | ⚠️ **Perlu Diselaraskan** |
| **Atribusi Sumber** | Satu baris miring elegan di akhir: `*Sumber: Kompas, Antara.*` tanpa garis pembatas. | Memakai garis pembatas horizontal kaku `---` dan teks sumber bertele-tele. | ⚠️ **Perlu Diselaraskan** |
| **Penjaga Gawang (Post-Processing)** | Validasi otomatis regex untuk membersihkan heading liar dan memastikan awalan `adafaktanews - `. | Belum ada normalisasi awalan otomatis jika AI lupa menyertakannya. | ⚠️ **Perlu Diselaraskan** |

---

## 2. Struktur Desain Output Sadur AI Baru

### A. Contoh Format Naskah yang Dihasilkan (`content`)
```markdown
adafaktanews - Raksasa teknologi asal Cupertino resmi meluncurkan pembaruan sistem operasi generasi terbaru yang membawa integrasi kecerdasan buatan langsung ke tingkat inti sistem. Langkah strategis ini diambil guna merespons percepatan kompetisi perangkat cerdas global yang kian bertumpu pada efisiensi pemrosesan data lokal tanpa mengabaikan aspek privasi pengguna.

Pembaruan arsitektur komputasi ini memungkinkan perangkat menjalankan instruksi penalaran multimodal secara instan langsung dari chip semikonduktor internal. Sejumlah praktisi industri menilai terobosan tersebut akan mengubah lanskap interaksi konsumen terhadap ekosistem komputasi personal dalam beberapa tahun ke depan.

> **Baca Juga:** [Menkominfo Resmikan Fasilitas Pusat Data AI Pertama di Solo](/berita/ai/12/menkominfo-resmikan-fasilitas-ai)

Dengan efisiensi konsumsi daya yang berhasil ditekan hingga tiga puluh persen, adopsi teknologi ini diproyeksikan mulai menjangkau jutaan pengguna aktif pada kuartal pertama tahun mendatang.

*Sumber: Reuters, TechCrunch.*
```

### B. Contoh Format Cuplikan Deskripsi Singkat (`excerpt`)
```text
adafaktanews - Apple resmi rilis pembaruan arsitektur sistem operasi dengan integrasi kecerdasan buatan lokal berdaya hemat tinggi.
```
*(Maksimal 180–200 karakter, padat, siap untuk meta tag SEO & kartu cuplikan berita).*

---

## 3. Rencana Langkah Kerja & File yang Akan Diubah

### Langkah 1: Pembaruan System Prompt & Skema JSON di `lib/ai-generator.ts`
* **File Target:** `lib/ai-generator.ts` pada fungsi `requestSadurArticleFromSource`.
* **Poin Perubahan:**
  1. Hapus aturan lama: `4. Format Konten: Gunakan Markdown murni (Heading ##, ###, bullet points...)`.
  2. Tambahkan aturan baru:
     - **Kalimat Pembuka:** Wajib diawali `"adafaktanews - "` (huruf kecil diikuti spasi).
     - **Format Narasi Bersih:** 3–5 paragraf mengalir padat. DILARANG menggunakan subjudul Markdown (`##`, `###`), DILARANG menggunakan bullet points (`-`, `*`), DILARANG menggunakan tag HTML mentah.
     - **Atribusi Sumber Ringkas:** Format miring `*Sumber: ${cleanDomain}.*` tanpa garis pembatas `---`.
  3. Perbarui batasan `excerpt` di prompt menjadi: *"Ringkasan tajam 1-2 kalimat yang menggambarkan inti berita (maksimal 180-200 karakter, minimalis & padat)"*.
  4. Perbarui instruksi output contoh `"content"`: `"adafaktanews - [Isi lengkap berita mengalir dalam paragraf bersih...]"`.

### Langkah 2: Tambahkan Sanitasi & Post-Processing Guard di `lib/ai-generator.ts`
* **File Target:** `lib/ai-generator.ts` (bagian pemrosesan hasil AI).
* **Poin Perubahan:**
  1. **Awalan Standar:** Tambahkan pengecekan otomatis:
     ```typescript
     if (!finalContent.toLowerCase().startsWith('adafaktanews -')) {
       finalContent = finalContent.replace(/^adafaktanews\s*[-–—]?\s*/i, '');
       finalContent = `adafaktanews - ${finalContent.trimStart()}`;
     }
     ```
  2. **Pembersihan Garis & Heading Liar:** Bersihkan baris `---` jika LLM masih menyelipkannya, serta buang subjudul `## ` yang muncul di tengah teks agar narasi tetap mengalir bersih.
  3. **Penyelarasan Panjang Excerpt:** Potong excerpt maksimal 200 karakter:
     ```typescript
     excerpt: String(parsed.excerpt || parsed.title).slice(0, 200).trim(),
     ```

### Langkah 3: Sinkronisasi Default Provider di `app/admin/sadur/actions.ts`
* **File Target:** `app/admin/sadur/actions.ts`.
* **Poin Perubahan:**
  - Ambil konfigurasi default provider dinamis dari `getAISettings()` jika parameter provider dari antarmuka belum ditentukan, agar konsisten dengan pengaturan AI yang dipilih pengguna di `/admin/pengaturan`.

### Langkah 4: Tampilan Pratinjau Excerpt di Kartu Sukses `app/admin/sadur/page.tsx`
* **File Target:** `app/admin/sadur/page.tsx`.
* **Poin Perubahan:**
  - Pada kartu hijau sukses sadur (`sadurResult`), tambahkan tampilan baris cuplikan `excerpt` (deskripsi singkat) dan awalan liputan agar admin dapat memverifikasi bahwa format saduran sudah bergaya minimalis sebelum membukanya di editor atau situs publik.

---

## 4. Validasi & Pengujian

1. **Uji Kompilasi TypeScript:** Menjalankan `npx tsc --noEmit` untuk memastikan tidak ada error tipe atau parameter yang hilang.
2. **Uji Sadur Berita Nyata:** Melakukan uji coba sadur 1 URL berita untuk memverifikasi:
   - Paragraf pertama diawali `adafaktanews - `.
   - Tidak ada subjudul `##` atau bullet points di dalam isi berita.
   - Atribusi di baris terakhir berupa `*Sumber: [Media]*` tanpa garis pembatas `---`.
   - Kolom `excerpt` tersimpan ringkas dan padat (≤ 200 karakter).
3. **Pemeriksaan Editor Admin:** Membuka draf hasil saduran di `/admin/edit/[id]` untuk memastikan format teks tampil rapi dan minimalis.
