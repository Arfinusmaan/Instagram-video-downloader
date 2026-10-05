import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Download, Clipboard, X, Loader2, Sparkles, Check,
  History, Trash2, Music, Shield, Zap, Layers, ArrowRight,
  AlertTriangle, CheckCircle2, ArrowLeft, Eye, User, Clock,
  Square, CheckSquare, ExternalLink, ImageIcon, Film,
  Server, RefreshCw, ChevronDown, Info, Globe
} from 'lucide-react';
import './App.css';
import './theme.css';

// ─── API base ──────────────────────────────────────────────────────────────
// Use Vite's same-origin proxy during local/LAN development. This avoids
// requiring phones to connect directly to the backend port through firewalls.
const API = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

// ─── API calls ─────────────────────────────────────────────────────────────
async function apiFetchInfo(url) {
  const res  = await fetch(`${API}/api/info`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch info');
  return data.metadata;
}

function detectMobileBrowser() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '')
    || (/Macintosh/i.test(navigator.userAgent || '') && navigator.maxTouchPoints > 1);
}

function detectIOSDevice() {
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

// Prepare and verify the complete file before exposing its attachment URL.
// The final anchor click then starts the browser's native download immediately.
async function apiDownload({ url, qualityId, outputMode, onProgress }) {
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const start = await fetch(`${base}/api/download/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, qualityId, outputMode }),
  });
  const started = await start.json().catch(() => ({}));
  if (!start.ok || !started.jobId) throw new Error(started.error || `Could not start download (${start.status}).`);

  const jobUrl = `${base}/api/download/jobs/${encodeURIComponent(started.jobId)}`;
  const fileUrl = `${jobUrl}/file`;
  const deadline = Date.now() + 20 * 60 * 1000;
  while (Date.now() < deadline) {
    const response = await fetch(jobUrl, { cache: 'no-store' });
    const job = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(job.error || `Could not check download (${response.status}).`);
    onProgress?.(job.progress || 1, job.message || 'Preparing your video…');
    if (job.status === 'failed') throw new Error(job.error || 'Video preparation failed.');
    if (job.status === 'ready') {
      const output = job.metadata?.output || {};
      return {
        fileUrl,
        filename: job.filename || 'video.mp4',
        size: Number(output.size || 0),
        verified: {
          resolution: output.width && output.height ? `${output.width}x${output.height}` : null,
          fps: output.fps ? `${output.fps} FPS` : null,
          vcodec: output.videoCodec || null,
          acodec: output.audioCodec || null,
          size: Number(output.size || 0),
        },
      };
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Video preparation timed out. Please try again.');
}

async function apiDownloadAudio({ url, qualityId, title, onProgress }) {
  const audioOnly = true;
  const outputMode = 'source';
  const safeStem = (title || 'video')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 110) || 'video';
  const suggestedName = `${safeStem}.${audioOnly ? 'mp3' : 'mp4'}`;
  let fileHandle = null;
  if (!detectMobileBrowser() && typeof window.showSaveFilePicker === 'function') {
    try {
      fileHandle = await window.showSaveFilePicker({
        suggestedName,
        types: [{
          description: audioOnly ? 'MP3 audio' : 'MP4 video',
          accept: audioOnly ? { 'audio/mpeg': ['.mp3'] } : { 'video/mp4': ['.mp4'] },
        }],
      });
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Download canceled.');
      // Fall back to the browser download when the file picker is unavailable.
    }
  }

  onProgress?.(8, 'Connecting to engine…');
  let simulatedPct = 8;
  const interval = setInterval(() => {
    simulatedPct = Math.min(simulatedPct + Math.floor(Math.random() * 8 + 4), 78);
    const msg = simulatedPct < 30 ? 'Analyzing stream codecs…'
              : simulatedPct < 55 ? 'Processing video stream…'
              : simulatedPct < 75 ? 'Muxing highest quality track…'
              : 'Finalizing media package…';
    onProgress?.(simulatedPct, msg);
  }, 750);

  let res;
  try {
    res = await fetch(`${API}/api/download`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url, qualityId, audioOnly, outputMode }),
    });
  } catch (netErr) {
    clearInterval(interval);
    throw new Error('Could not connect to download backend: ' + netErr.message);
  }

  clearInterval(interval);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${res.status}`);
  }

  onProgress?.(80, 'Streaming to your device…');
  const contentLen = Number(res.headers.get('Content-Length') || 0);
  const reader     = res.body.getReader();
  const chunks     = fileHandle ? null : [];
  const writable   = fileHandle ? await fileHandle.createWritable() : null;
  let   received   = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (writable) await writable.write(value);
      else chunks.push(value);
      received += value.length;
      if (contentLen > 0) {
        const pct = 80 + Math.round((received / contentLen) * 18);
        onProgress?.(Math.min(pct, 98), `Receiving file (${(received/1024/1024).toFixed(1)}MB / ${(contentLen/1024/1024).toFixed(1)}MB)…`);
      } else {
        onProgress?.(90, `Receiving file (${(received/1024/1024).toFixed(1)}MB)…`);
      }
    }
    if (writable) await writable.close();
  } catch (error) {
    if (writable) await writable.abort(error).catch(() => {});
    throw error;
  }

  onProgress?.(99, 'Saving file…');
  const mimeType   = audioOnly ? 'audio/mpeg' : 'video/mp4';
  const blob       = chunks ? new Blob(chunks, { type: mimeType }) : null;
  const cd         = res.headers.get('Content-Disposition') || '';
  const xfn        = res.headers.get('X-Filename') || '';
  const finalRes   = res.headers.get('X-Final-Resolution');
  const finalFps   = res.headers.get('X-Final-Fps');
  const finalVcode = res.headers.get('X-Final-Vcodec');
  const finalAcode = res.headers.get('X-Final-Acodec');
  const finalSize  = Number(res.headers.get('X-Final-Size') || received);

  const encodedName = cd.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  let fn = fileHandle?.name || xfn || (encodedName ? decodeURIComponent(encodedName) : null)
    || cd.match(/filename="?([^";\r\n]+)"?/)?.[1] || suggestedName;
  // Sanitize Windows invalid characters: < > : " / \ | ? *
  fn = fn.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
  const ext = audioOnly ? '.mp3' : '.mp4';
  if (!fn.toLowerCase().endsWith(ext)) {
    fn = fn.replace(/\.[a-zA-Z0-9]+$/, '') + ext;
  }

  if (blob) triggerBlobDownload(blob, fn, mimeType);
  onProgress?.(100, 'Download complete!');
  return {
    filename: fn,
    size: finalSize,
    verified: {
      resolution: finalRes,
      fps: finalFps,
      vcodec: finalVcode,
      acodec: finalAcode,
      size: finalSize,
    }
  };
}

async function apiCarouselSlide({ url, slideIndex, qualityId, onProgress }) {
  onProgress?.(12, `Connecting for slide ${slideIndex + 1}…`);
  let simulatedPct = 12;
  const interval = setInterval(() => {
    simulatedPct = Math.min(simulatedPct + 10, 75);
    onProgress?.(simulatedPct, `Fetching slide ${slideIndex + 1}…`);
  }, 700);

  let res;
  try {
    res = await fetch(`${API}/api/carousel-download`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url, slideIndex, qualityId }),
    });
  } catch (err) {
    clearInterval(interval);
    throw new Error('Connection failed: ' + err.message);
  }
  clearInterval(interval);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${res.status}`);
  }

  onProgress?.(80, `Receiving slide ${slideIndex + 1}…`);
  const rawBlob    = await res.blob();
  const mimeType   = rawBlob.type || 'video/mp4';
  const blob       = new Blob([rawBlob], { type: mimeType });
  const cd         = res.headers.get('Content-Disposition') || '';
  const xfn        = res.headers.get('X-Filename') || '';
  const finalRes   = res.headers.get('X-Final-Resolution');
  const finalFps   = res.headers.get('X-Final-Fps');
  const finalVcode = res.headers.get('X-Final-Vcodec');
  const finalSize  = Number(res.headers.get('X-Final-Size') || blob.size);

  let fn = xfn || cd.match(/filename="?([^";\r\n]+)"?/)?.[1];
  if (!fn) {
    const imageExt = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[mimeType];
    fn = `slide_${slideIndex + 1}.${imageExt || (mimeType.startsWith('audio/') ? 'mp3' : 'mp4')}`;
  }
  fn = fn.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
  const expectedExt = mimeType === 'image/jpeg' ? '.jpg'
    : mimeType === 'image/png' ? '.png'
    : mimeType === 'image/webp' ? '.webp'
    : mimeType.startsWith('audio/') ? '.mp3' : '.mp4';
  if (!fn.toLowerCase().endsWith(expectedExt)) {
    fn = fn.replace(/\.[a-zA-Z0-9]+$/, '') + expectedExt;
  }

  triggerBlobDownload(blob, fn, mimeType);
  onProgress?.(100, `Slide ${slideIndex + 1} saved!`);
  return {
    filename: fn,
    size: finalSize,
    verified: {
      resolution: finalRes,
      fps: finalFps,
      vcodec: finalVcode,
      size: finalSize,
    }
  };
}

// Decode a percent-encoded X-Filename header safely
function decodeXFilename(raw) {
  if (!raw) return null;
  try { return decodeURIComponent(raw); } catch { return raw; }
}

function triggerBlobDownload(blob, filename, mimeType = 'video/mp4') {
  let safeName = (filename || 'video.mp4').trim();
  const imageExt = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[mimeType];
  const requiredExt = mimeType.includes('audio') ? '.mp3' : (imageExt || (mimeType.includes('image') ? '.jpg' : '.mp4'));
  
  // Guarantee no invalid characters for Windows filesystem
  safeName = safeName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
  if (!safeName.toLowerCase().endsWith(requiredExt)) {
    safeName = safeName.replace(/\.[a-zA-Z0-9]+$/, '') + requiredExt;
  }

  // Ensure typed blob so OS assigns correct media player association
  const typedBlob = (blob.type === mimeType) ? blob : new Blob([blob], { type: mimeType });
  const url = URL.createObjectURL(typedBlob);
  const a   = document.createElement('a');
  a.style.display = 'none';
  a.href     = url;
  a.setAttribute('download', safeName);
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);
}

async function apiHealth() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res  = await fetch(`${API}/api/health`, { signal: controller.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`Health check failed (${res.status})`);
    const data = await res.json();
    return data;
  } catch { return { status: 'offline', ytdlp: false }; }
  finally { clearTimeout(timeout); }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function detectPlatform(url = '') {
  const u = url.toLowerCase();
  if (u.includes('instagram.com') || u.includes('instagr.am'))
    return { id:'instagram', name:'Instagram', gradient:'linear-gradient(135deg,#fd1d1d,#e1306c,#833ab4)' };
  if (u.includes('youtube.com') || u.includes('youtu.be'))
    return { id:'youtube', name:'YouTube', gradient:'linear-gradient(135deg,#ff0000,#b00000)' };
  if (u.includes('facebook.com') || u.includes('fb.watch'))
    return { id:'facebook', name:'Facebook', gradient:'linear-gradient(135deg,#0064e0,#00c6ff)' };
  if (u.includes('tiktok.com'))
    return { id:'tiktok', name:'TikTok', gradient:'linear-gradient(135deg,#010101,#00f2fe)' };
  if (u.includes('twitter.com') || u.includes('x.com'))
    return { id:'twitter', name:'Twitter/X', gradient:'linear-gradient(135deg,#1DA1F2,#14171A)' };
  return { id:'unknown', name:'URL', gradient:'rgba(255,255,255,0.08)' };
}

function isValidUrl(str) { try { new URL(str); return true; } catch { return false; } }
function fmtBytes(b) { if (!b) return null; const mb = b/1024/1024; return mb > 1024 ? `${(mb/1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`; }

// ─── Platform icon SVGs ───────────────────────────────────────────────────────
function PlatformSVG({ id, size = 18 }) {
  const s = { width: size, height: size, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:'2', strokeLinecap:'round', strokeLinejoin:'round' };
  switch (id) {
    case 'instagram': return <svg {...s}><rect width="20" height="20" x="2" y="2" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>;
    case 'youtube':   return <svg {...s}><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><polygon points="10 15 15 12 10 9 10 15" fill="currentColor"/></svg>;
    case 'facebook':  return <svg {...s}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>;
    case 'tiktok':    return <svg {...s}><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>;
    case 'twitter':   return <svg {...s} fill="currentColor" stroke="none"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
    default:          return <Globe size={size}/>;
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`toast ${toast.type}`} role="alert">
      {toast.type === 'error' ? <AlertTriangle size={16}/> : <CheckCircle2 size={16}/>}
      <span>{toast.message}</span>
    </div>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
function ProgressBar({ progress, label }) {
  return (
    <div className="progress-hud">
      <div className="progress-top">
        <span className="progress-label">{label}</span>
        <span className="progress-pct">{progress}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }}/>
      </div>
    </div>
  );
}

// ─── QualitySelector ─────────────────────────────────────────────────────────
function QualitySelector({ qualities, selected, onSelect }) {
  return (
    <div className="quality-list">
      {qualities.map(q => (
        <div
          key={q.id}
          className={`quality-row ${selected?.id === q.id ? 'active' : ''} ${q.isHighest ? 'top-quality' : ''}`}
          onClick={() => onSelect(q)}
          role="radio"
          aria-checked={selected?.id === q.id}
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onSelect(q)}
        >
          <div className="q-radio">{selected?.id === q.id && <div className="q-radio-dot"/>}</div>
          <div className="q-meta">
            <div className="q-title-row">
              <span className="q-name">{q.label}</span>
              <span className={`q-tag ${q.isHighest ? 'tag-top' : ''}`}>{q.tag}</span>
            </div>
            <div className="q-specs">
              {q.id === 'audio-320'
                ? `${q.codec} · ${q.audio} Audio`
                : `${q.resolution}${q.isPortrait ? ' (Vertical)' : ''} · ${q.fps} · ${q.codec}${q.iosCompatibleSource ? ' · iPhone source available' : ''}`}
            </div>
          </div>
          <div className="q-size">
            <span className="q-est-size">{q.estimatedSize || 'Size: Unknown'}</span>
            <span className="q-audio-sub">{q.id === 'audio-320' ? 'Lossless Audio' : q.audio}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── CarouselGrid ─────────────────────────────────────────────────────────────
function CarouselGrid({ items, selectedIds, onToggle, onSelectAll, onDownloadSlide, slideProgress }) {
  const allSel = selectedIds.length === items.length;
  return (
    <div className="carousel-box">
      <div className="carousel-header">
        <div className="carousel-title">
          <Layers size={16}/>
          <span>Album — {items.length} Slides</span>
        </div>
        <button className="select-all-btn" onClick={onSelectAll}>
          {allSel
            ? <><CheckSquare size={13}/> Deselect All</>
            : <><Square size={13}/> Select All ({selectedIds.length}/{items.length})</>
          }
        </button>
      </div>

      <div className="carousel-grid">
        {items.map((slide, i) => {
          const isSel = selectedIds.includes(slide.id);
          const prog  = slideProgress?.[i];
          return (
            <div
              key={slide.id}
              className={`slide-card ${isSel ? 'sel' : ''}`}
              onClick={() => onToggle(slide.id)}
            >
              <div className="slide-thumb">
                {slide.thumb
                  ? <img src={slide.thumb} alt={`Slide ${i+1}`} loading="lazy" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}/>
                  : null
                }
                <div className="slide-no-thumb" style={{ display: slide.thumb ? 'none' : 'flex' }}>
                  {slide.type === 'video' ? <Film size={22}/> : <ImageIcon size={22}/>}
                </div>

                {/* Type badge */}
                <span className={`slide-type-badge ${slide.type}`}>
                  {slide.type === 'video' ? <Film size={9}/> : <ImageIcon size={9}/>} {slide.type.toUpperCase()}
                </span>

                {/* Checkbox */}
                <div className={`slide-check ${isSel ? 'checked' : ''}`}>
                  {isSel && <Check size={10}/>}
                </div>

                {/* Per-slide download progress overlay */}
                {prog && prog.active && (
                  <div className="slide-progress-overlay">
                    <Loader2 size={20} className="spin"/>
                    <span>{prog.progress}%</span>
                  </div>
                )}
                {prog && prog.done && (
                  <div className="slide-done-overlay">
                    <CheckCircle2 size={20}/>
                  </div>
                )}
                {prog && prog.error && (
                  <div className="slide-error-overlay">
                    <AlertTriangle size={16}/>
                    <span className="slide-err-text">{prog.error}</span>
                  </div>
                )}
              </div>

              <div className="slide-foot">
                <div className="slide-foot-info">
                  <span className="slide-num">#{i+1}</span>
                  {slide.duration !== 'Photo' && <span className="slide-dur">{slide.duration}</span>}
                  {slide.resolution !== 'N/A' && <span className="slide-res">{slide.resolution}</span>}
                </div>
                <div className="slide-foot-actions">
                  {slide.directUrl && (
                    <a
                      href={slide.directUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="slide-direct-btn"
                      title="Instant open / save slide"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink size={10}/>
                    </a>
                  )}
                  <button
                    className="slide-dl-btn"
                    onClick={e => { e.stopPropagation(); onDownloadSlide(i); }}
                    disabled={prog?.active}
                    title={`Download slide ${i+1}`}
                  >
                    {prog?.active
                      ? <Loader2 size={11} className="spin"/>
                      : prog?.done
                      ? <Check size={11}/>
                      : <Download size={11}/>
                    }
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── HistoryPanel ─────────────────────────────────────────────────────────────
function HistoryPanel({ history, onClear, onBack, onReDownload }) {
  return (
    <div className="history-panel">
      <div className="history-header">
        <button className="back-btn" onClick={onBack}><ArrowLeft size={18}/> Back</button>
        <h2><History size={20}/> Download History</h2>
        {history.length > 0 && (
          <button className="clear-btn" onClick={onClear}><Trash2 size={14}/> Clear</button>
        )}
      </div>

      {history.length === 0
        ? (
          <div className="empty-history">
            <History size={48} style={{ opacity:.25 }}/>
            <p>No downloads yet.<br/>Paste a link on the main page to get started.</p>
          </div>
        )
        : (
          <div className="history-grid">
            {history.map(item => (
              <div key={item.id} className="history-card">
                <div className="hc-thumb">
                  {item.thumb
                    ? <img src={item.thumb} alt={item.title} onError={e => e.target.style.display='none'}/>
                    : <div className="hc-no-thumb"><Sparkles size={28}/></div>
                  }
                  <span className="hc-platform" style={{ background: item.platform?.gradient }}>{item.platform?.name}</span>
                  <span className="hc-quality">{item.quality}</span>
                </div>
                <div className="hc-body">
                  <p className="hc-title">{item.title}</p>
                  <div className="hc-meta">
                    <span>{item.resolution}</span><span>·</span>
                    <span>{new Date(item.ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                  </div>
                  <div className="hc-actions">
                    <span className="hc-done"><CheckCircle2 size={12}/> {item.downloadStarted ? 'Download started' : item.readyForDownload ? 'Ready to download' : 'Saved'}</span>
                    <button className="hc-redl" onClick={() => onReDownload(item)}>
                      <Download size={12}/> Download Again
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  // Navigation
  const [page, setPage]             = useState('main');

  // URL input
  const [url, setUrl]               = useState('');
  const [urlError, setUrlError]     = useState('');

  // Backend health
  const [health, setHealth]         = useState(null); // null=checking, obj=result

  // Info fetch
  const [fetching, setFetching]     = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [media, setMedia]           = useState(null);

  // Quality selection
  const [quality, setQuality]       = useState(null);
  // Keep one visible download action; choose the best delivery mode for this device automatically.
  const [outputMode] = useState(() => detectIOSDevice() ? 'ios-compatible' : 'source');
  // Prepare and verify the file before handing it to the browser's native downloader.
  const [dlState, setDlState] = useState('idle');
  const [dlPct, setDlPct] = useState(0);
  const [dlElapsed, setDlElapsed] = useState(0);
  const [dlLabel, setDlLabel] = useState('');
  const [dlError, setDlError] = useState('');
  const [mobileJob, setMobileJob] = useState(null);

  // Audio download state (video uses a direct <a href> link now)
  const [audioDlState, setAudioDlState] = useState('idle'); // idle|downloading|done|error
  const [audioDlLabel, setAudioDlLabel] = useState('');
  const [audioDlError, setAudioDlError] = useState('');

  // Carousel
  const [carouselSel, setCarouselSel] = useState([]);
  const [slideProgress, setSlideProgress] = useState({}); // { [slideIdx]: {active,progress,done,error} }
  const [batchDlActive, setBatchDlActive] = useState(false);

  // History
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('omnistream_history') || '[]'); } catch { return []; }
  });

  // Toast
  const [toast, setToast]   = useState(null);
  const toastRef            = useRef(null);

  // ── Effects ──
  useEffect(() => {
    apiHealth().then(h => setHealth(h));
    const timer = setInterval(() => {
      apiHealth().then(h => setHealth(h));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try { localStorage.setItem('omnistream_history', JSON.stringify(history.slice(0,30))); } catch (_) {}
  }, [history]);

  useEffect(() => {
    if (dlState !== 'downloading') return;
    const startedAt = Date.now();
    const timer = setInterval(() => setDlElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [dlState]);

  useEffect(() => {
    if (media?.qualities?.length) {
      const best = media.qualities.find(q => q.isHighest) || media.qualities[0];
      setQuality(best);
    }
    if (media?.isCarousel && media.carouselItems) {
      setCarouselSel(media.carouselItems.map(i => i.id));
    }
    setSlideProgress({});
    setAudioDlState('idle');
    setAudioDlError('');
  }, [media]);

  // ── Toast helper ──
  const showToast = useCallback((message, type = 'success') => {
    clearTimeout(toastRef.current);
    setToast({ message, type });
    toastRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  // ── Fetch info ──
  const handleFetch = useCallback(async (inputUrl) => {
    const target = (inputUrl || url).trim();
    if (!target) return;
    if (!isValidUrl(target)) {
      setUrlError('Please enter a valid URL (starting with https://)');
      return;
    }
    setUrlError('');
    setFetching(true);
    setFetchError('');
    setMedia(null);
    setDlState('idle');
    setDlError('');
    setMobileJob(null);

    try {
      const meta = await apiFetchInfo(target);
      setMedia(meta);
      setUrl(target);
      showToast(`${meta.isCarousel ? 'Carousel' : meta.platform.name + ' ' + meta.mediaType} ready to download!`);
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setFetching(false);
    }
  }, [url, showToast]);

  // ── Paste handler ──
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text?.trim()) {
        setUrl(text.trim());
        handleFetch(text.trim());
      }
    } catch {
      document.getElementById('url-input')?.focus();
    }
  }, [handleFetch]);

  // ── Main download ──
  const handleDownload = useCallback(async (overrideQuality) => {
    if (!media) return;
    const q = overrideQuality || quality;
    if (!q) return;

    setDlState('downloading');
    setDlPct(1);
    setDlElapsed(0);
    setDlLabel('Preparing your video…');
    setDlError('');
    setMobileJob(null);

    try {
      const audioOnly = q.id === 'audio-320';
      const downloadOptions = {
        url: media.url,
        qualityId: q.id,
        title: media.platform?.id === 'instagram' ? media.description || media.title : media.title,
        onProgress: (progress, label) => {
          setDlPct(progress);
          setDlLabel(label || 'Preparing your video…');
        },
      };
      const result = audioOnly
        ? await apiDownloadAudio(downloadOptions)
        : await apiDownload({ ...downloadOptions, outputMode });

      setDlState(audioOnly ? 'done' : 'ready');
      setDlLabel(audioOnly ? 'Audio download complete.' : 'Video is ready to download.');

      // Save to history with verified specs
      const finalRes = result.verified?.resolution || q.resolution;
      const finalCodec = result.verified?.vcodec || q.codec;
      const finalFps = result.verified?.fps || q.fps;
      const entry = {
        id:         String(Date.now()),
        title:      media.title,
        url:        media.url,
        thumb:      media.thumbnailUrl,
        platform:   media.platform,
        quality:    q.label,
        resolution: finalRes,
        fps:        finalFps,
        codec:      finalCodec,
        size:       fmtBytes(result.size),
        ts:         Date.now(),
        downloadStarted: false,
        readyForDownload: !audioOnly,
      };
      setHistory(prev => [entry, ...prev]);
      if (!audioOnly) setMobileJob({ ...result, historyId: entry.id });
      const specText = finalRes !== 'Audio Only' ? ` (${finalRes} · ${fmtBytes(result.size)})` : ` (${fmtBytes(result.size)})`;
      showToast(audioOnly ? `Saved: ${result.filename}${specText}` : `Ready! Tap the download button.${specText}`);
    } catch (err) {
      setDlState('error');
      setDlError(err.message);
      showToast(err.message, 'error');
    }
  }, [media, quality, outputMode, showToast]);

  const handleAudioDownload = useCallback(async () => {
    if (!media) return;
    const audioQuality = media.qualities?.find(q => q.id === 'audio-320');
    if (!audioQuality) {
      setAudioDlState('error');
      setAudioDlError('No audio stream is available for this video.');
      return;
    }

    setAudioDlState('downloading');
    setAudioDlLabel('Preparing MP3…');
    setAudioDlError('');
    try {
      const result = await apiDownloadAudio({
        url: media.url,
        qualityId: audioQuality.id,
        title: media.platform?.id === 'instagram' ? media.description || media.title : media.title,
        onProgress: (_progress, label) => setAudioDlLabel(label || 'Preparing MP3…'),
      });
      setAudioDlState('done');
      setAudioDlLabel(`Saved ${result.filename} (${fmtBytes(result.size)}).`);
      const entry = {
        id: String(Date.now()),
        title: media.title,
        url: media.url,
        thumb: media.thumbnailUrl,
        platform: media.platform,
        quality: 'MP3 audio',
        resolution: 'Audio Only',
        codec: 'MP3',
        size: fmtBytes(result.size),
        ts: Date.now(),
        downloadStarted: true,
      };
      setHistory(prev => [entry, ...prev]);
      showToast(`Saved: ${result.filename}`);
    } catch (error) {
      setAudioDlState('error');
      setAudioDlError(error.message || 'Audio download failed.');
      showToast(error.message || 'Audio download failed.', 'error');
    }
  }, [media, showToast]);

  // ── Single slide download ──
  const handleSlideDownload = useCallback(async (slideIdx) => {
    if (!media?.isCarousel) return;
    setSlideProgress(prev => ({ ...prev, [slideIdx]: { active: true, progress: 0, done: false, error: null } }));
    try {
      await apiCarouselSlide({
        url:        media.url,
        slideIndex: slideIdx,
        qualityId:  quality?.id || '1080p',
        onProgress: (pct, label) => {
          setSlideProgress(prev => ({ ...prev, [slideIdx]: { active: true, progress: pct, done: false, error: null } }));
        },
      });
      setSlideProgress(prev => ({ ...prev, [slideIdx]: { active: false, progress: 100, done: true, error: null } }));
      showToast(`Slide ${slideIdx + 1} downloaded!`);
    } catch (err) {
      setSlideProgress(prev => ({ ...prev, [slideIdx]: { active: false, progress: 0, done: false, error: err.message } }));
      showToast(`Slide ${slideIdx + 1}: ${err.message}`, 'error');
    }
  }, [media, quality, showToast]);

  // ── Batch carousel download (sequential) ──
  const handleBatchCarousel = useCallback(async () => {
    if (!media?.isCarousel || !media.carouselItems) return;
    const toDownload = media.carouselItems
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => carouselSel.includes(item.id));

    if (!toDownload.length) {
      showToast('Select at least one slide first.', 'error');
      return;
    }

    setBatchDlActive(true);
    let successCount = 0;

    for (const { item, idx } of toDownload) {
      try {
        await handleSlideDownload(idx);
        successCount++;
        await new Promise(r => setTimeout(r, 400)); // brief gap between downloads
      } catch (_) {}
    }

    setBatchDlActive(false);
    if (successCount === toDownload.length) {
      showToast(`All ${successCount} slides downloaded!`);
    } else {
      showToast(`Downloaded ${successCount}/${toDownload.length} slides.`, 'error');
    }
  }, [media, carouselSel, handleSlideDownload, showToast]);

  // ── Carousel selection helpers ──
  const toggleSlide   = (id) => setCarouselSel(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  const toggleAllSlides = () => {
    if (!media?.carouselItems) return;
    if (carouselSel.length === media.carouselItems.length) setCarouselSel([]);
    else setCarouselSel(media.carouselItems.map(i => i.id));
  };

  // ── History ──
  const handleReDownload = (item) => {
    setUrl(item.url);
    setPage('main');
    handleFetch(item.url);
  };

  const platform = detectPlatform(url);

  // ─── History Page ──────────────────────────────────────────────────────────
  if (page === 'history') {
    return (
      <div className="root">
        <Toast toast={toast}/>
        <HistoryPanel
          history={history}
          onClear={() => { setHistory([]); showToast('History cleared.'); }}
          onBack={() => setPage('main')}
          onReDownload={handleReDownload}
        />
      </div>
    );
  }

  // ─── Main Page ─────────────────────────────────────────────────────────────
  return (
    <div className="root">
      <Toast toast={toast}/>

      {/* ── Header ── */}
      <header className="header">
        <div className="header-left">
          <div className="logo-icon"><Zap size={22}/></div>
          <div>
            <div className="logo-name">OmniStream</div>
            <div className="logo-sub">VIDEO SAVER</div>
          </div>
        </div>
        <div className="header-right">
          {health !== null && (
            <div className={`server-pill ${health?.status === 'ok' ? 'online' : 'offline'}`}>
              <span className="status-dot"/>
              <span>{health?.status !== 'ok' ? 'Backend Offline' : health?.ytdlp ? `Engine v${health.ytdlpVersion || 'Active'}` : 'Backend Online'}</span>
            </div>
          )}
          {health === null && (
            <div className="server-pill checking">
              <Loader2 size={13} className="spin"/><span>Connecting…</span>
            </div>
          )}
          <button className="icon-pill-btn" onClick={() => setPage('history')} title="Download History">
            <History size={17}/>
            {history.length > 0 && <span className="badge">{history.length}</span>}
          </button>
        </div>
      </header>

      <main className="main">

        {/* ── Hero + URL Input ── */}
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow">A simpler way to save</span>
            <h1 className="hero-title">Keep the videos<br className="desktop-break"/> you want to come back to.</h1>
            <p className="hero-sub">Paste a public link, choose the available quality, and save the original video to your device.</p>
          </div>

          {/* Search bar */}
          <div className={`search-bar ${fetching ? 'loading' : ''} ${urlError || fetchError ? 'has-error' : ''} ${!fetching && url && !fetchError ? `platform-${platform.id}` : ''}`}>
            <div
              className="platform-badge"
              style={{ background: url && platform.id !== 'unknown' && !fetchError ? platform.gradient : 'rgba(255,255,255,0.07)' }}
            >
              <PlatformSVG id={url ? platform.id : 'unknown'} size={15}/>
              <span>{url && platform.id !== 'unknown' ? platform.name : 'URL'}</span>
            </div>

            <input
              id="url-input"
              className="search-input"
              type="url"
              placeholder="Paste a video or Reel link"
              value={url}
              onChange={e => { setUrl(e.target.value); setUrlError(''); setFetchError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleFetch()}
              disabled={fetching}
              autoComplete="off"
              spellCheck="false"
            />

            <div className="search-actions">
              {url && !fetching && (
                <button
                  className="icon-btn-sm"
                  onClick={() => { setUrl(''); setMedia(null); setFetchError(''); setUrlError(''); setDlState('idle'); }}
                  title="Clear"
                >
                  <X size={15}/>
                </button>
              )}
              <button className="paste-btn" onClick={handlePaste} disabled={fetching} title="Paste from clipboard">
                <Clipboard size={14}/> <span>Paste</span>
              </button>
            </div>

            <button
              className="fetch-btn"
              onClick={() => handleFetch()}
              disabled={fetching || !url.trim()}
            >
              {fetching
                ? <><Loader2 size={17} className="spin"/> Analyzing…</>
                : <>Get video <ArrowRight size={15}/></>
              }
            </button>
          </div>

          {/* Input validation error */}
          {urlError && (
            <div className="error-msg">
              <AlertTriangle size={15}/> {urlError}
            </div>
          )}

          {/* Fetch error */}
          {fetchError && (
            <div className="error-msg">
              <AlertTriangle size={15}/>
              <div>
                <strong>{fetchError}</strong>
                {fetchError.toLowerCase().includes('yt-dlp') && (
                  <div style={{marginTop:'.35rem'}}>
                    Install the official <a href="https://github.com/yt-dlp/yt-dlp/releases/latest" target="_blank" rel="noreferrer">yt-dlp Windows executable</a>, then restart the backend.
                  </div>
                )}
                {fetchError.toLowerCase().includes('login') && (
                  <div style={{marginTop:'.35rem', fontSize:'.82rem'}}>
                    Only <strong>public</strong> videos are supported. Log-in required content cannot be downloaded.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Backend offline warning */}
          {health !== null && health?.status !== 'ok' && (
            <div className="offline-banner">
              <Server size={18}/>
              <div>
                <strong>Backend server is not running</strong> — open a new terminal and run:<br/>
                <code className="code-block">node server.js</code>
                Then refresh this page.
              </div>
            </div>
          )}
          {health?.status === 'ok' && !health?.ytdlp && (
            <div className="offline-banner">
              <Server size={18}/>
              <div>
                <strong>Backend is running, but yt-dlp is not available.</strong> Install the official yt-dlp executable, then point the backend to it and restart:<br/>
                <code className="code-block">$env:YT_DLP_PATH="C:\tools\yt-dlp.exe"; npm run server</code>
              </div>
            </div>
          )}

          {/* Quick example chips */}
          <div className="examples-row">
            <span className="examples-label">Try a sample</span>
            {[
              { label: '🎬 YT 4K 60FPS', url: 'https://www.youtube.com/watch?v=LXb3EKWsInQ' },
              { label: '⚡ YouTube Short', url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ' },
              { label: '🔥 TikTok', url: 'https://www.tiktok.com/@tiktok/video/6718335390845095173' },
            ].map(ex => (
              <button
                key={ex.url}
                className="example-chip"
                onClick={() => { setUrl(ex.url); handleFetch(ex.url); }}
                disabled={fetching}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </section>

        {/* ── Media Card ── */}
        {media && !fetching && (
          <section className="media-card">

            {/* Top bar */}
            <div className="mc-top-bar">
              <span className="mc-platform-tag" style={{ background: media.platform.gradient }}>
                <PlatformSVG id={media.platform.id} size={13}/> {media.platform.name}
              </span>
              <span className="mc-type-tag">{media.mediaType}</span>
              {media.isCarousel && (
                <span className="mc-carousel-tag">
                  <Layers size={12}/> {media.carouselItems?.length} Slides
                </span>
              )}
              <div className="mc-top-spacer"/>
              <a href={media.url} target="_blank" rel="noreferrer" className="mc-open-link" title="Open original">
                <ExternalLink size={14}/> Open
              </a>
            </div>

            <div className="mc-body">

              {/* Left — Preview + Carousel */}
              <div className="mc-left">
                <div className="player-wrap">
                  {media.thumbnailUrl
                    ? <img src={media.thumbnailUrl} alt={media.title} className="player-thumb" onError={e=>e.target.style.display='none'}/>
                    : <div className="player-placeholder"><Sparkles size={40} style={{opacity:.3}}/></div>
                  }
                  <div className="player-badge-tl">
                    <span className="live-badge">
                      <span className="live-dot"/> 
                      {media.qualities[0]?.resolutionClass || 'Source'} Native
                    </span>
                  </div>
                </div>

                {/* Carousel */}
                {media.isCarousel && media.carouselItems && media.carouselItems.length > 0 && (
                  <CarouselGrid
                    items={media.carouselItems}
                    selectedIds={carouselSel}
                    onToggle={toggleSlide}
                    onSelectAll={toggleAllSlides}
                    onDownloadSlide={handleSlideDownload}
                    slideProgress={slideProgress}
                  />
                )}
              </div>

              {/* Right — Details + Download */}
              <div className="mc-right">

                {/* Meta */}
                <div className="mc-meta">
                  <h2 className="mc-title">{media.title}</h2>
                  <div className="mc-chips">
                    <span className="mc-chip"><User size={12}/> {media.author}</span>
                    {media.duration !== '0:00' && <span className="mc-chip"><Clock size={12}/> {media.duration}</span>}
                    {media.views && <span className="mc-chip"><Eye size={12}/> {media.views}</span>}
                    {media.uploadDate && <span className="mc-chip">{media.uploadDate}</span>}
                  </div>
                  {media.description && (
                    <p className="mc-desc">{media.description.slice(0,200)}{media.description.length > 200 ? '…' : ''}</p>
                  )}
                </div>

                {/* Quality Selector */}
                <div className="mc-section">
                  <div className="mc-section-header">
                    <h3>Quality</h3>
                    <span className="avail-best">
                      <Sparkles size={12}/> Max Source: {media.qualities.find(q=>q.isHighest)?.label || 'Highest'}
                    </span>
                  </div>
                  <QualitySelector
                    qualities={media.qualities}
                    selected={quality}
                    onSelect={nextQuality => { setQuality(nextQuality); setMobileJob(null); setDlState('idle'); setDlPct(0); setDlError(''); }}
                  />
                </div>

                {/* ── Audio download status ── */}
                {audioDlState === 'downloading' && (
                  <div className="dl-success" style={{ opacity: .85 }}>
                    <Loader2 size={15} className="spin"/>
                    <div>{audioDlLabel || 'Extracting audio…'}</div>
                  </div>
                )}
                {audioDlState === 'done' && (
                  <div className="dl-success">
                    <CheckCircle2 size={15}/>
                    <div>{audioDlLabel}</div>
                  </div>
                )}
                {audioDlState === 'error' && (
                  <div className="dl-error">
                    <AlertTriangle size={14}/>
                    <div>{audioDlError}</div>
                  </div>
                )}

                {/* ── Download Buttons ── */}
                <div className="dl-actions">
                  {/* Carousel batch download */}
                  {media.isCarousel ? (
                    <>
                      <button
                        className="dl-primary"
                        disabled={batchDlActive || carouselSel.length === 0}
                        onClick={handleBatchCarousel}
                      >
                        {batchDlActive
                          ? <><Loader2 size={19} className="spin"/> Downloading slides…</>
                          : <><Download size={19}/> Download {carouselSel.length} Selected Slide{carouselSel.length !== 1 ? 's' : ''} in {quality?.label || '4K'}</>
                        }
                      </button>
                      <div className="carousel-info-note">
                        <Info size={13}/>
                        <span>Each slide downloads sequentially. You can also click the ↓ button on any individual slide thumbnail.</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {dlState === 'downloading' && (
                        <ProgressBar
                          progress={dlPct}
                          label={`${dlLabel || 'Preparing your video…'} · ${Math.floor(dlElapsed / 60)}:${String(dlElapsed % 60).padStart(2, '0')}`}
                        />
                      )}
                      {dlState === 'error' && (
                        <div className="dl-error" role="alert">
                          <AlertTriangle size={15}/><span>{dlError}</span>
                        </div>
                      )}
                      {dlState === 'downloading' ? (
                        <button id="download-video-btn" className="dl-primary" disabled>
                          <Loader2 size={19} className="spin"/> Preparing video for download…
                        </button>
                      ) : dlState === 'ready' && mobileJob?.fileUrl ? (
                        <a
                          id="download-video-btn"
                          className="dl-primary"
                          href={mobileJob.fileUrl}
                          onClick={() => {
                            setHistory(prev => prev.map(item => item.id === mobileJob.historyId
                              ? { ...item, downloadStarted: true, readyForDownload: false }
                              : item));
                            showToast('Browser download started. Check your Downloads.');
                          }}
                        >
                          <Download size={19}/> Download {quality?.label || 'video'}
                        </a>
                      ) : (
                        <button
                          id="download-video-btn"
                          className="dl-primary"
                          disabled={!quality}
                          onClick={() => handleDownload()}
                        >
                          <Download size={19}/> Prepare {quality?.label || 'video'}
                        </button>
                      )}
                    </>
                  )}

                  {/* Audio extract button */}
                  {!media.isCarousel && (
                    <button
                      className="dl-secondary"
                      disabled={audioDlState === 'downloading'}
                      onClick={handleAudioDownload}
                    >
                      {audioDlState === 'downloading'
                        ? <><Loader2 size={15} className="spin"/> Extracting…</>
                        : <><Music size={16}/> Extract MP3 (320kbps)</>}
                    </button>
                  )}
                </div>

                {/* Guarantee note */}
                <div className="dl-guarantee">
                  <Shield size={14}/>
                  <span>{outputMode === 'ios-compatible'
                    ? 'Compatible source streams are preferred. Conversion is used only if needed, without changing the resolution.'
                    : 'Original source video is kept without re-encoding. Playback depends on the codecs your device supports.'}</span>
                </div>

              </div>
            </div>
          </section>
        )}

        {/* ── Features (shown when no media loaded) ── */}
        {!media && !fetching && (
          <section className="features-row">
            {[
              { icon: <Sparkles size={22}/>,  title: 'Keep the source quality', desc: 'Choose from the resolutions available for the original video, including 2K and 4K when offered.' },
              { icon: <Layers size={22}/>,    title: 'Save a whole carousel', desc: 'Download Instagram photos and videos one by one or select the slides you want.' },
              { icon: <Music size={22}/>,     title: 'Audio when you need it', desc: 'Save audio separately as an MP3 file.' },
              { icon: <Shield size={22}/>,    title: 'No added watermark', desc: 'The downloader does not add a watermark or re-encode the source video.' },
            ].map(f => (
              <div key={f.title} className="feature-card">
                <div className="fc-icon">{f.icon}</div>
                <h3 className="fc-title">{f.title}</h3>
                <p className="fc-desc">{f.desc}</p>
              </div>
            ))}
          </section>
        )}

        {/* Supported platforms note */}
        {!media && !fetching && (
          <div className="platforms-note">
            <span className="pn-label">Supported:</span>
            {['Instagram','YouTube','Facebook','TikTok','Twitter/X','Reddit','Vimeo','Dailymotion'].map(p => (
              <span key={p} className="pn-chip">{p}</span>
            ))}
            <span className="pn-chip pn-more">+1000 more via yt-dlp</span>
          </div>
        )}

      </main>

      <footer className="footer">
        <span>OmniStream 4K · Powered by yt-dlp · Personal fair-use only</span>
        <div className={`footer-status ${health?.ytdlp ? 'ok' : 'err'}`}>
          <span className="status-dot"/>
          {health?.ytdlp ? `Engine Active · yt-dlp ${health.ytdlpVersion || ''}` : health?.status === 'ok' ? 'Backend Active · yt-dlp required' : 'Backend Offline — run: npm run server'}
        </div>
      </footer>
    </div>
  );
}
