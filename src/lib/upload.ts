// src/lib/upload.ts - Supabase Storage Upload Helper (Bucket: medical-files)
import { getSupabaseClient } from './supabase';

export async function uploadMedicalFile(
  file: File,
  folder: 'fotos' | 'dokumen' | 'rujukan' | 'surat-sakit' | 'intervensi' = 'dokumen'
): Promise<{ path: string; publicUrl: string } | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${folder}/${Date.now()}_${cleanFileName}`;

    const { data, error } = await client.storage
      .from('medical-files')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn('Storage upload note:', error.message);
      return null;
    }

    return {
      path: data.path,
      publicUrl: getMedicalFileUrl(data.path),
    };
  } catch (err) {
    console.error('Exception uploadMedicalFile:', err);
    return null;
  }
}

export function getMedicalFileUrl(path: string): string {
  const client = getSupabaseClient();
  if (!client || !path) return '';
  const { data } = client.storage.from('medical-files').getPublicUrl(path);
  return data.publicUrl;
}
