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
    SELECT id, title, cover_caption 
    FROM articles 
    WHERE id IN (101, 102, 104, 128, 169)
  `;
  console.log(articles);

  const anyIlustrasi = await sql`
    SELECT count(*) as count 
    FROM articles 
    WHERE cover_caption ILIKE '%ilustrasi%'
  `;
  console.log('Sisa artikel dengan kata ilustrasi:', anyIlustrasi[0].count);

  const anyDraftIlustrasi = await sql`
    SELECT count(*) as count 
    FROM jurnalis_drafts 
    WHERE cover_caption ILIKE '%ilustrasi%'
  `;
  console.log('Sisa draf dengan kata ilustrasi:', anyDraftIlustrasi[0].count);
}

main().catch(console.error);
