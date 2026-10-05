// Real API client — calls our Node.js backend which uses yt-dlp

const API = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

/**
 * Fetch real video metadata via yt-dlp
 * @param {string} url
 * @returns {Promise<{success: boolean, metadata: object}>}
 */
export async function fetchVideoInfo(url) {
  const res = await fetch(`${API}/api/info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url.trim() }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch video info');
  return data;
}

/**
 * Download a specific carousel slide
 */
export async function downloadCarouselSlide({ url, slideIndex, qualityId = '4k', onProgress }) {
  onProgress?.(10);
  const res = await fetch(`${API}/api/carousel-download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url.trim(), slideIndex, qualityId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
    throw new Error(err.error || 'Slide download failed');
  }

  onProgress?.(50);

  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition') || '';
  const match = cd.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || `slide_${slideIndex + 1}.mp4`;

  const a = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);

  onProgress?.(100);
  return { filename, size: blob.size };
}

/**
 * Check backend health
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API}/api/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export function detectPlatform(url) {
  const u = (url || '').toLowerCase();
  if (u.includes('instagram.com') || u.includes('instagr.am'))
    return { id: 'instagram', name: 'Instagram', gradient: 'linear-gradient(135deg, #fd1d1d, #e1306c, #833ab4)', color: '#e1306c' };
  if (u.includes('youtube.com') || u.includes('youtu.be'))
    return { id: 'youtube', name: 'YouTube', gradient: 'linear-gradient(135deg, #ff0000, #cc0000)', color: '#ff0000' };
  if (u.includes('facebook.com') || u.includes('fb.watch'))
    return { id: 'facebook', name: 'Facebook', gradient: 'linear-gradient(135deg, #0064e0, #00c6ff)', color: '#0084ff' };
  if (u.includes('tiktok.com'))
    return { id: 'tiktok', name: 'TikTok', gradient: 'linear-gradient(135deg, #000, #00f2fe)', color: '#00f2fe' };
  if (u.includes('twitter.com') || u.includes('x.com'))
    return { id: 'twitter', name: 'Twitter/X', gradient: 'linear-gradient(135deg, #1DA1F2, #14171A)', color: '#1DA1F2' };
  return { id: 'unknown', name: 'Universal', gradient: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', color: '#8b5cf6' };
}

export function detectMediaType(url) {
  const u = (url || '').toLowerCase();
  if (u.includes('/reel/') || u.includes('fb.watch')) return 'Reel';
  if (u.includes('/shorts/')) return 'Short';
  if (u.includes('/p/') && !u.includes('/reel/')) return 'Post';
  if (u.includes('playlist') || u.includes('list=')) return 'Playlist';
  return 'Video';
}

export function isValidUrl(url) {
  try { new URL(url); return true; } catch { return false; }
}

export function formatFileSize(bytes) {
  if (!bytes) return '–';
  const mb = bytes / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}
