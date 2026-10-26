import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const sql = neon(process.env.DATABASE_URL);

async function main() {
  const articles = await sql`
    SELECT id, title, cover_caption, author 
    FROM articles 
    WHERE cover_caption ILIKE 'berita%'
  `;
  console.log(`Ditemukan ${articles.length} artikel dengan awalan 'berita':`);

  for (const a of articles) {
    let clean = a.cover_caption.replace(/^berita(?:\s*liputan)?\s*[:.–-]?\s*/i, '').trim();
    if (clean.length === 0 || clean.startsWith('(Dok.') || clean.startsWith('(Foto:')) {
      clean = a.title;
    }
    clean = clean.replace(/[.\s]+$/, '');
    if (!/\((?:foto|dok)[^)]*\)$/i.test(clean)) {
      clean = `${clean}. (Foto: Dok. ${a.author || 'Redaksi'})`;
    }
    await sql`
      UPDATE articles 
      SET cover_caption = ${clean} 
      WHERE id = ${a.id};
    `;
    console.log(`[#${a.id}] ${a.cover_caption} -> ${clean}`);
  }

  // Also check jurnalis_drafts
  const drafts = await sql`
    SELECT id, title, cover_caption, source, generated_title 
    FROM jurnalis_drafts 
    WHERE cover_caption ILIKE 'berita%'
  `;
  console.log(`Ditemukan ${drafts.length} draf dengan awalan 'berita':`);

  for (const d of drafts) {
    const refTitle = d.generated_title || d.title;
    let clean = d.cover_caption.replace(/^berita(?:\s*liputan)?\s*[:.–-]?\s*/i, '').trim();
    if (clean.length === 0 || clean.startsWith('(Dok.') || clean.startsWith('(Foto:')) {
      clean = refTitle;
    }
    clean = clean.replace(/[.\s]+$/, '');
    if (!/\((?:foto|dok)[^)]*\)$/i.test(clean)) {
      clean = `${clean}. (Foto: Dok. ${d.source || 'Istimewa'})`;
    }
    await sql`
      UPDATE jurnalis_drafts 
      SET cover_caption = ${clean} 
      WHERE id = ${d.id};
    `;
    console.log(`[Draf #${d.id}] ${d.cover_caption} -> ${clean}`);
  }
}

main().catch(console.error);
