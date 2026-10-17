'use client';

// Desktop enhancement only. Phones and tablets use <input capture>, which opens
// the native camera without a permission prompt. Video is recorded without
// audio: audio analysis is out of scope, and microphone access stays disabled
// by the Permissions-Policy.

import { useEffect, useRef, useState } from 'react';
import { MEDIA_LIMITS } from '@/lib/visual-media';

interface Props {
  mode: 'photo' | 'video';
  onCapture: (file: File, durationHint?: number) => void;
  onCancel: () => void;
  /** Called when the camera cannot be opened, so the caller can fall back to a file input. */
  onUnavailable: (reason: string) => void;
}

function pickRecorderType(): string | undefined {
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
  return candidates.find(t => MediaRecorder.isTypeSupported?.(t));
}

export default function CameraCapture({ mode, onCapture, onCancel, onUnavailable }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  // Set on cancel/unmount so stopping the recorder does not deliver a clip.
  const discardRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {});
        }
        setReady(true);
      })
      .catch(err => {
        const name = err instanceof DOMException ? err.name : '';
        onUnavailable(name === 'NotAllowedError'
          ? 'Camera permission was denied.'
          : 'No camera is available.');
      });
    return () => {
      cancelled = true;
      discardRef.current = true;
      recorderRef.current?.state === 'recording' && recorderRef.current.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recording timer with the hard 30 s stop.
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      const s = (Date.now() - startedAtRef.current) / 1000;
      setElapsed(s);
      if (s >= MEDIA_LIMITS.maxVideoSeconds) stopRecording();
    }, 200);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (blob) onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    const mimeType = pickRecorderType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      if (discardRef.current) return;
      const type = recorder.mimeType || 'video/webm';
      const ext = type.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunksRef.current, { type });
      const duration = (Date.now() - startedAtRef.current) / 1000;
      onCapture(new File([blob], `recording-${Date.now()}.${ext}`, { type }), Math.min(duration, MEDIA_LIMITS.maxVideoSeconds));
    };
    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    recorder.start(1000);
    setElapsed(0);
    setRecording(true);
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setRecording(false);
  }

  return (
    <div className="vt-camera" role="dialog" aria-label={mode === 'photo' ? 'Take a photo' : 'Record a short video'}>
      <video ref={videoRef} className="vt-camera-video" muted playsInline autoPlay />
      <div className="vt-camera-bar">
        {mode === 'photo' ? (
          <button type="button" className="lab-btn lab-btn-primary" onClick={takePhoto} disabled={!ready}>
            Capture photo
          </button>
        ) : recording ? (
          <button type="button" className="lab-btn lab-btn-primary" onClick={stopRecording}>
            Stop ({Math.max(0, Math.ceil(MEDIA_LIMITS.maxVideoSeconds - elapsed))} s left)
          </button>
        ) : (
          <button type="button" className="lab-btn lab-btn-primary" onClick={startRecording} disabled={!ready}>
            Start recording (max {MEDIA_LIMITS.maxVideoSeconds} s, no audio)
          </button>
        )}
        <button type="button" className="lab-btn lab-btn-secondary" onClick={() => { discardRef.current = true; stopRecording(); onCancel(); }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
