import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const m = url?.match(p);
    if (m) return m[1];
  }
  return null;
};

export const YouTubeEmbed = ({ url }: { url: string }) => {
  const id = getYouTubeId(url);
  if (!id) return null;
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', background: '#000', width: '100%', position: 'relative', paddingBottom: '56.25%', height: 0 }}>
      <iframe
        src={`https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`}
        title="YouTube video"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
};

export const YouTubeThumbnail = ({ url, onClick }: { url: string; onClick?: () => void }) => {
  const id = getYouTubeId(url);
  if (!id) return null;
  return (
    <div onClick={onClick} style={{ position: 'relative', borderRadius: '12px 12px 0 0', overflow: 'hidden', background: '#000', cursor: onClick ? 'pointer' : 'default' }}>
      <img src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`} alt="YouTube thumbnail"
        style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block', opacity: 0.85 }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(239,68,68,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(239,68,68,0.5)' }}>
          <svg viewBox="0 0 24 24" fill="white" width="20" height="20"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 8, right: 8, padding: '3px 8px', background: 'rgba(239,68,68,0.9)', borderRadius: 4, color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: '1px' }}>YOUTUBE</div>
    </div>
  );
};
