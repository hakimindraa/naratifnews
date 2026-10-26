import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

export function cleanCaption(oldCaption, title, sourceName = 'Redaksi') {
  let text = (oldCaption || title || '').trim();

  // 1. Bersihkan awalan 'Ilustrasi', 'Ilustrasi liputan:', 'Foto ilustrasi:', dsb.
  text = text.replace(/^(?:foto\s+)?ilustrasi(?:\s+(?:liputan|berita|sampul|artikel))?\s*[:–—-]?\s*/i, '');

  // 2. Jika teks terpotong dari judul (misal '... Eco-Masji'), pulihkan judul lengkap
  if (title && title.toLowerCase().startsWith(text.toLowerCase()) && text.length < title.length) {
    text = title;
  }

  // 3. Bersihkan titik/spasi di ujung
  text = text.replace(/[.\s]+$/, '');

  // 4. Tambahkan format kredit standar ala Detik/Kompas jika belum ada
  if (!/\((?:foto|dok)[^)]*\)$/i.test(text)) {
    const credit = sourceName && sourceName !== 'Redaksi' ? sourceName : 'Redaksi';
    text = `${text}. (Foto: Dok. ${credit})`;
  }

  return text.slice(0, 160).trim();
}

async function main() {
  console.log('--- MEMULAI MIGRASI CAPTION BERITA LAMA ---');

  // 1. Ambil artikel di tabel articles
  const articlesToUpdate = await sql`
    SELECT id, title, cover_caption, author 
    FROM articles 
    WHERE cover_caption ILIKE '%ilustrasi%'
    ORDER BY id ASC;
  `;

  console.log(`\nMenemukan ${articlesToUpdate.length} artikel terbit yang memuat 'ilustrasi':`);
  let updatedArticlesCount = 0;

  for (const art of articlesToUpdate) {
    const newCaption = cleanCaption(art.cover_caption, art.title, art.author || 'Redaksi');
    await sql`
      UPDATE articles 
      SET cover_caption = ${newCaption}, updated_at = NOW() 
      WHERE id = ${art.id};
    `;
    updatedArticlesCount++;
    console.log(`[ARTIKEL #${art.id}]`);
    console.log(`  Lama : ${art.cover_caption}`);
    console.log(`  Baru : ${newCaption}\n`);
  }

  // 2. Ambil draf di tabel jurnalis_drafts
  const draftsToUpdate = await sql`
    SELECT id, title, cover_caption, source, generated_title 
    FROM jurnalis_drafts 
    WHERE cover_caption ILIKE '%ilustrasi%'
    ORDER BY id ASC;
  `;

  console.log(`\nMenemukan ${draftsToUpdate.length} draf jurnalis yang memuat 'ilustrasi':`);
  let updatedDraftsCount = 0;

  for (const draft of draftsToUpdate) {
    const refTitle = draft.generated_title || draft.title;
    const newCaption = cleanCaption(draft.cover_caption, refTitle, draft.source || 'Istimewa');
    await sql`
      UPDATE jurnalis_drafts 
      SET cover_caption = ${newCaption} 
      WHERE id = ${draft.id};
    `;
    updatedDraftsCount++;
    console.log(`[DRAF #${draft.id}]`);
    console.log(`  Lama : ${draft.cover_caption}`);
    console.log(`  Baru : ${newCaption}\n`);
  }

  console.log('============================================');
  console.log(`SUKSES: Berhasil memperbarui ${updatedArticlesCount} artikel & ${updatedDraftsCount} draf jurnalis.`);
  console.log('============================================');
}

main().catch((err) => {
  console.error('Error saat migrasi:', err);
  process.exit(1);
});
