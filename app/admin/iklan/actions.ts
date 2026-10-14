'use server';

import { getAdSettings, saveAdSettings, AdSettingsData } from '@/lib/ads';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';

export async function getAdSettingsAction(): Promise<AdSettingsData> {
  return await getAdSettings();
}

export async function saveAdSettingsAction(settings: AdSettingsData) {
  try {
    await saveAdSettings(settings);

    // Revalidate semua halaman publik dan layout
    revalidatePath('/', 'layout');
    revalidatePath('/admin/iklan');

    return {
      success: true,
      message: 'Pengaturan iklan & monetisasi berhasil disimpan dan langsung aktif!',
    };
  } catch (error: any) {
    console.error('Error saving ad settings:', error);
    return {
      success: false,
      message: error?.message || 'Gagal menyimpan pengaturan iklan.',
    };
  }
}

export interface AdsTxtStatus {
  exists: boolean;
  content: string;
  hasPublisherId: boolean;
  expectedLine: string;
}

export async function checkAdsTxtAction(publisherId: string): Promise<AdsTxtStatus> {
  const cleanPubId = publisherId.replace(/^ca-/, '');
  const expectedLine = `google.com, ${cleanPubId}, DIRECT, f08c47fec0942fa0`;

  try {
    const filePath = path.join(process.cwd(), 'public', 'ads.txt');
    if (!fs.existsSync(filePath)) {
      return {
        exists: false,
        content: '',
        hasPublisherId: false,
        expectedLine,
      };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const hasPublisherId = content.includes(cleanPubId);

    return {
      exists: true,
      content,
      hasPublisherId,
      expectedLine,
    };
  } catch (err: any) {
    return {
      exists: false,
      content: '',
      hasPublisherId: false,
      expectedLine,
    };
  }
}

export async function syncAdsTxtAction(publisherId: string) {
  try {
    const cleanPubId = publisherId.replace(/^ca-/, '');
    const line = `google.com, ${cleanPubId}, DIRECT, f08c47fec0942fa0\n`;
    const filePath = path.join(process.cwd(), 'public', 'ads.txt');
    
    fs.writeFileSync(filePath, line, 'utf-8');

    return {
      success: true,
      message: 'File ads.txt berhasil disinkronkan dengan Publisher ID Anda!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Gagal memperbarui file ads.txt',
    };
  }
}
