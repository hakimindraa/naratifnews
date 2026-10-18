import { NextResponse } from "next/server";
import { sql } from "@/db";

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

    const cleanPublishedAt = published_at || new Date().toISOString();

    const result = await sql`
      INSERT INTO jurnalis_drafts (title, source, original_url, published_at, summary)
      VALUES (${title}, ${source || "Bot Berita"}, ${url}, ${cleanPublishedAt}, ${summary || ""})
      ON CONFLICT (original_url) DO NOTHING
      RETURNING id;
    `;

    const inserted = result.length > 0;

    return NextResponse.json({
      success: true,
      inserted,
      message: inserted ? "Berita berhasil masuk ke draf jurnalis" : "Berita sudah ada sebelumnya",
      draftId: inserted ? result[0].id : null,
    });
  } catch (error) {
    console.error("Error incoming news:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}
