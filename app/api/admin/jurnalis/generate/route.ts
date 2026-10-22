import { NextResponse } from "next/server";
import { generateJurnalisDraftAction } from "@/app/admin/jurnalis/actions";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { draftId } = await req.json();
    if (!draftId) {
      return NextResponse.json({ error: "draftId diperlukan" }, { status: 400 });
    }

    const result = await generateJurnalisDraftAction(draftId);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error, details: (result as any).details },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Gagal generate artikel jurnalis route:", error);
    return NextResponse.json(
      { error: "Gagal memproses AI", details: String(error) },
      { status: 500 }
    );
  }
}
