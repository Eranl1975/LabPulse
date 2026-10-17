import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getUser, getProfile } from '@/lib/auth';
import { hasAppAccess } from '@/lib/auth-shared';
import { checkRateLimit } from '@/lib/rate-limit';
import { isSameOriginRequest } from '@/lib/same-origin';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { MEDIA_LIMITS } from '@/lib/visual-media';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/troubleshooting/visual/upload-url');

// Issues signed upload URLs for the private visual-media bucket, so the browser
// uploads originals straight to Supabase Storage. Media never passes through a
// Vercel function (which caps request bodies at ~4.5 MB).

// Route files may only export handlers and route config, so this stays local.
const VISUAL_MEDIA_BUCKET = 'visual-media';

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

const MAX_FILES = MEDIA_LIMITS.maxPhotos + MEDIA_LIMITS.maxVideos;

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req.headers, req.url)) {
    return NextResponse.json({ error: 'Cross-site request rejected.' }, { status: 403 });
  }
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const profile = await getProfile();
  if (profile && !hasAppAccess(profile)) {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
  }

  if (!checkRateLimit(`visual-upload:${user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many uploads. Please wait before trying again.' }, { status: 429 });
  }

  let body: { files?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(body.files) || body.files.length === 0 || body.files.length > MAX_FILES) {
    return NextResponse.json({ error: `Request 1–${MAX_FILES} upload URLs.` }, { status: 400 });
  }

  const requests: Array<{ ext: string; type: string }> = [];
  for (const f of body.files) {
    const type = f && typeof f === 'object' ? (f as Record<string, unknown>).content_type : null;
    const size = f && typeof f === 'object' ? (f as Record<string, unknown>).size : null;
    if (typeof type !== 'string' || !EXT_BY_TYPE[type]) {
      return NextResponse.json({ error: 'Unsupported file type.' }, { status: 400 });
    }
    const limit = type.startsWith('video/') ? MEDIA_LIMITS.maxVideoBytes : MEDIA_LIMITS.maxPhotoBytes;
    if (typeof size !== 'number' || size <= 0 || size > limit) {
      return NextResponse.json({ error: 'File too large.' }, { status: 400 });
    }
    requests.push({ ext: EXT_BY_TYPE[type], type });
  }
  if (requests.filter(r => r.type.startsWith('video/')).length > MEDIA_LIMITS.maxVideos) {
    return NextResponse.json({ error: 'Only one video per submission.' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getSupabaseServiceClient();
  } catch {
    return NextResponse.json({ error: 'Storage is not configured on this server.' }, { status: 503 });
  }

  const uploads: Array<{ path: string; token: string }> = [];
  for (const r of requests) {
    // One folder per user; the storage.objects RLS policies key on this prefix.
    const path = `${user.id}/${randomUUID()}.${r.ext}`;
    const { data, error } = await supabase.storage.from(VISUAL_MEDIA_BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      log.error('signed-url', 'could not create a signed upload URL', { error: error?.message });
      return NextResponse.json({ error: 'Storage is unavailable; your media will still be analysed but not kept.' }, { status: 503 });
    }
    uploads.push({ path: data.path, token: data.token });
  }

  return NextResponse.json({ bucket: VISUAL_MEDIA_BUCKET, uploads });
}
