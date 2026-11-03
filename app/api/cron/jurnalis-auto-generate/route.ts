import { NextRequest, NextResponse } from 'next/server';
import { processAutoGenerateNextDraftAction } from '@/app/admin/jurnalis/actions';

export const maxDuration = 60; // Max execution timeout untuk AI generation

async function handleAutoGenerate(request: Request) {
  try {
    const url = new URL(request.url);
    const secretQuery = url.searchParams.get('secret');
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Verifikasi otorisasi jika CRON_SECRET terkonfigurasi
    if (cronSecret) {
      const isValidBearer = authHeader === `Bearer ${cronSecret}`;
      const isValidQuery = secretQuery === cronSecret;

      if (!isValidBearer && !isValidQuery) {
        return NextResponse.json(
          { error: 'Unauthorized: Kunci rahasia cron tidak valid' },
          { status: 401 }
        );
      }
    }

    // Jalankan logika Auto-Generate untuk 1 draf terlama
    const result = await processAutoGenerateNextDraftAction();

    return NextResponse.json({
      success: result.success,
      timestamp: new Date().toISOString(),
      processed: result.processed,
      draftId: result.draftId || null,
      title: result.title || null,
      coverUrl: result.coverUrl || null,
      message: result.message,
      error: result.error || null,
    });
  } catch (err: any) {
    console.error('Error in jurnalis-auto-generate cron:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Terjadi kesalahan internal pada cron auto-generate',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handleAutoGenerate(request);
}

export async function POST(request: Request) {
  return handleAutoGenerate(request);
}

