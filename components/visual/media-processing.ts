'use client';

// Browser-side media handling for Visual Troubleshooting. Captured and uploaded
// files take exactly the same path from here on: type check by magic bytes,
// limits, canvas re-encode (which also strips EXIF/GPS), frame extraction and
// thumbnails.

import {
  MEDIA_LIMITS, detectImageType, detectVideoType, selectFrameTimes, targetEdgeFor,
  type DetectedImageType, type DetectedVideoType,
} from '@/lib/visual-media';

export type ClassifiedFile =
  | { kind: 'image'; type: DetectedImageType }
  | { kind: 'video'; type: DetectedVideoType };

export async function readHead(file: Blob, bytes = 32): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(0, bytes).arrayBuffer());
}

/** Classify by content, not by extension or the browser-reported MIME type. */
export async function classifyFile(file: Blob): Promise<ClassifiedFile | null> {
  const head = await readHead(file);
  const image = detectImageType(head);
  if (image) return { kind: 'image', type: image };
  const video = detectVideoType(head);
  if (video) return { kind: 'video', type: video };
  return null;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not encode the image.'))), type, quality);
  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'));
    reader.readAsDataURL(blob);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'));
    reader.readAsDataURL(blob);
  });
}

async function decodeImage(file: Blob): Promise<ImageBitmap> {
  try {
    // from-image applies the EXIF orientation before the EXIF block is discarded.
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('This browser cannot open that image. HEIC photos open in Safari; elsewhere, export the photo as JPEG.');
  }
}

function drawScaled(source: CanvasImageSource, width: number, height: number, longEdge: number): HTMLCanvasElement {
  const scale = Math.min(1, longEdge / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

const QUALITIES = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5];

/** Encode under a byte budget: lower JPEG quality first, then the resolution. */
async function encodeWithinBudget(
  source: CanvasImageSource, width: number, height: number, longEdge: number, budget: number, preferPng: boolean,
): Promise<{ blob: Blob; type: 'image/jpeg' | 'image/png' }> {
  let edge = longEdge;
  for (let attempt = 0; attempt < 4; attempt++) {
    const canvas = drawScaled(source, width, height, edge);
    if (preferPng) {
      // Screenshots: lossless keeps small error text crisp, when it fits.
      const png = await canvasToBlob(canvas, 'image/png');
      if (png.size <= budget) return { blob: png, type: 'image/png' };
    }
    for (const q of QUALITIES) {
      const jpg = await canvasToBlob(canvas, 'image/jpeg', q);
      if (jpg.size <= budget) return { blob: jpg, type: 'image/jpeg' };
    }
    edge = Math.round(edge * 0.8);
  }
  const canvas = drawScaled(source, width, height, edge);
  return { blob: await canvasToBlob(canvas, 'image/jpeg', 0.5), type: 'image/jpeg' };
}

async function makeThumbnail(source: CanvasImageSource, width: number, height: number): Promise<string> {
  const edge = targetEdgeFor(width, height, 'thumbnail');
  const canvas = drawScaled(source, width, height, edge);
  for (const q of [0.72, 0.6, 0.5]) {
    const blob = await canvasToBlob(canvas, 'image/jpeg', q);
    if (blob.size <= MEDIA_LIMITS.maxThumbnailBytes) return blobToDataUrl(blob);
  }
  return blobToDataUrl(await canvasToBlob(drawScaled(source, width, height, 200), 'image/jpeg', 0.5));
}

export interface EncodedImage {
  blob: Blob;
  base64: string;
  mediaType: 'image/jpeg' | 'image/png';
  thumbnail: string;
}

export async function encodePhoto(file: Blob, sourceType: DetectedImageType, budget: number): Promise<EncodedImage> {
  const bitmap = await decodeImage(file);
  try {
    const edge = targetEdgeFor(bitmap.width, bitmap.height, 'photo');
    const { blob, type } = await encodeWithinBudget(bitmap, bitmap.width, bitmap.height, edge, budget, sourceType === 'image/png');
    return {
      blob,
      base64: await blobToBase64(blob),
      mediaType: type,
      thumbnail: await makeThumbnail(bitmap, bitmap.width, bitmap.height),
    };
  } finally {
    bitmap.close();
  }
}

/** Thumbnail for the preview grid only (no budget, no base64). */
export async function previewThumbnail(file: Blob): Promise<string> {
  const bitmap = await decodeImage(file);
  try {
    return await makeThumbnail(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

function once(el: HTMLMediaElement, event: string, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error('The video could not be read in this browser.')); }, timeoutMs);
    const ok = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error('This video format cannot be decoded in this browser. Try an MP4 file, or record in the browser.')); };
    function cleanup() {
      clearTimeout(timer);
      el.removeEventListener(event, ok);
      el.removeEventListener('error', fail);
    }
    el.addEventListener(event, ok, { once: true });
    el.addEventListener('error', fail, { once: true });
  });
}

async function openVideo(file: Blob): Promise<{ video: HTMLVideoElement; url: string; duration: number }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = url;
  try {
    await once(video, 'loadedmetadata');
    let duration = video.duration;
    if (!Number.isFinite(duration)) {
      // MediaRecorder WebM files report Infinity until the end is sought once.
      video.currentTime = 1e7;
      await once(video, 'seeked');
      duration = video.duration;
      video.currentTime = 0;
      await once(video, 'seeked');
    }
    return { video, url, duration };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

/** Duration in seconds, for the limit check before anything else is done. */
export async function videoDuration(file: Blob): Promise<number> {
  const { url, duration } = await openVideo(file);
  URL.revokeObjectURL(url);
  return duration;
}

export interface EncodedFrame extends EncodedImage {
  time: number;
}

/** Evenly spaced key frames plus the first and last frame, encoded under a per-frame budget. */
export async function extractKeyFrames(file: Blob, budgetPerFrame: number): Promise<{ frames: EncodedFrame[]; duration: number }> {
  const { video, url, duration } = await openVideo(file);
  try {
    const frames: EncodedFrame[] = [];
    for (const time of selectFrameTimes(duration, MEDIA_LIMITS.maxFrames)) {
      video.currentTime = time;
      await once(video, 'seeked');
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) continue;
      const edge = targetEdgeFor(w, h, 'frame');
      const { blob, type } = await encodeWithinBudget(video, w, h, edge, budgetPerFrame, false);
      frames.push({
        time,
        blob,
        base64: await blobToBase64(blob),
        mediaType: type,
        thumbnail: await makeThumbnail(video, w, h),
      });
    }
    if (frames.length === 0) throw new Error('No frames could be extracted from the video.');
    return { frames, duration };
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute('src');
    video.load();
  }
}

/** True on phones/tablets, where the capture attribute opens the native camera. */
export function prefersNativeCapture(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

export function canUseBrowserCamera(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

export function canRecordInBrowser(): boolean {
  return canUseBrowserCamera() && typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined';
}
