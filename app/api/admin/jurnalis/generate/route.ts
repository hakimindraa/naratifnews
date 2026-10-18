import { NextResponse } from "next/server";
import { sql } from "@/db";

export const maxDuration = 60;

function parseAIResponseContent(rawBody: string): string {
  const trimmed = rawBody.trim();

  // 1. Tangani jika respons berupa SSE streaming (dimulai atau mengandung data:)
  if (trimmed.startsWith("data:") || trimmed.includes("\ndata:") || trimmed.includes("\r\ndata:")) {
    let accumulated = "";
    const lines = trimmed.split(/\r?\n/);
    for (const line of lines) {
      const lineTrimmed = line.trim();
      if (!lineTrimmed.startsWith("data:")) continue;
      const dataPayload = lineTrimmed.slice(5).trim();
      if (!dataPayload || dataPayload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(dataPayload);
        const piece =
          parsed?.choices?.[0]?.delta?.content ??
          parsed?.choices?.[0]?.message?.content ??
          parsed?.choices?.[0]?.text ??
          "";
        accumulated += piece;
      } catch {
        // Abaikan chunk non-JSON
      }
    }
    if (accumulated.trim()) return accumulated.trim();
  }

  // 2. Tangani respons JSON standar OpenAI
  try {
    const json = JSON.parse(trimmed);
    return json?.choices?.[0]?.message?.content ?? trimmed;
  } catch {
    return trimmed;
  }
}

function cleanJsonOutput(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  return cleaned.trim();
}

export async function POST(req: Request) {
  try {
    const { draftId } = await req.json();

    if (!draftId) {
      return NextResponse.json({ error: "draftId diperlukan" }, { status: 400 });
    }

    // 1. Ambil data draf dari database
    const rows = (await sql`
      SELECT id, title, source, original_url, summary
      FROM jurnalis_drafts
      WHERE id = ${draftId}
      LIMIT 1;
    `) as Array<{
      id: number;
      title: string;
      source: string;
      original_url: string;
      summary: string | null;
    }>;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Draf berita tidak ditemukan" }, { status: 404 });
    }

    const draft = rows[0];

    // 2. Konfigurasi kredensial AI (9Router / OpenAI-compatible)
    const baseUrl =
      process.env.NINEROUTER_BASE_URL ||
      process.env.LOCAL_9ROUTER_BASE_URL ||
      "http://node7.botkeep.cloud:40022/v1";
    const apiKey =
      process.env.NINEROUTER_API_KEY ||
      process.env.LOCAL_9ROUTER_KEY ||
      "sk-d6bddb272e797ddb-oj08b1-36238240";
    const model =
      process.env.NINEROUTER_MODEL ||
      process.env.LOCAL_9ROUTER_MODEL ||
      "ag/claude-opus-4-6-thinking";

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
4. Format output HANYA dalam bentuk JSON valid persis seperti ini tanpa komentar tambahan:
{
  "title": "Judul Berita Baru",
  "content": "Isi lengkap artikel berita...",
  "category": "Kategori yang cocok (misal: Olahraga, Nasional, Ekonomi, Teknologi, Internasional)",
  "tags": ["tag1", "tag2", "tag3"]
}`;

    const promptUser = `Tolong tuliskan artikel berita lengkap berdasarkan fakta intelijen berikut:
Judul Sumber: ${draft.title}
Sumber Media Asli: ${draft.source}
Tautan Asli: ${draft.original_url}
Ringkasan Fakta: ${draft.summary || "-"}`;

    const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

    const aiRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: false, // Menghindari response chunk SSE dari 9Router
        messages: [
          { role: "system", content: promptSystem },
          { role: "user", content: promptUser },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`AI Gateway error (${aiRes.status}): ${errText}`);
    }

    const rawText = await aiRes.text();
    const rawContent = parseAIResponseContent(rawText);
    const cleanedJson = cleanJsonOutput(rawContent);

    let aiParsed: {
      title?: string;
      content?: string;
      category?: string;
      tags?: string[];
    } = {};

    try {
      aiParsed = JSON.parse(cleanedJson);
    } catch {
      aiParsed = {
        title: draft.title,
        content: cleanedJson,
        category: "Umum",
        tags: [],
      };
    }

    const finalTitle = aiParsed.title || draft.title;
    const finalContent = aiParsed.content || "";
    const finalCategory = aiParsed.category || "Umum";
    const finalTags = Array.isArray(aiParsed.tags) ? aiParsed.tags : [];

    // 3. Simpan hasil generate ke database
    await sql`
      UPDATE jurnalis_drafts
      SET 
        generated_title = ${finalTitle},
        generated_article = ${finalContent},
        status = 'generated'
      WHERE id = ${draftId};
    `;

    return NextResponse.json({
      success: true,
      data: {
        draftId,
        generatedTitle: finalTitle,
        generatedArticle: finalContent,
        category: finalCategory,
        tags: finalTags,
      },
    });
  } catch (error) {
    console.error("Gagal generate artikel jurnalis:", error);
    return NextResponse.json(
      { error: "Gagal memproses AI", details: String(error) },
      { status: 500 }
    );
  }
}
