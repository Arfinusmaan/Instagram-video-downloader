import React, { useState } from 'react';
import { 
  Search, 
  Clipboard, 
  X, 
  ArrowRight, 
  Loader2, 
  Video, 
  Sparkles,
  Link as LinkIcon 
} from 'lucide-react';
import { InstagramIcon, YoutubeIcon, FacebookIcon, TikTokIcon } from './BrandIcons';
import { detectPlatform, detectMediaType, PRESET_SAMPLES } from '../utils/mediaDetector';

export default function UrlInputBar({ 
  url, 
  setUrl, 
  onAnalyze, 
  isLoading 
}) {
  const [isFocused, setIsFocused] = useState(false);
  const platform = detectPlatform(url);
  const mediaType = detectMediaType(url);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        onAnalyze(text);
      }
    } catch (err) {
      console.warn('Clipboard read error, focusing input instead', err);
      document.getElementById('video-url-input')?.focus();
    }
  };

  const handleClear = () => {
    setUrl('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) {
      onAnalyze(url);
    }
  };

  const getPlatformIcon = () => {
    switch (platform.id) {
      case 'instagram': return <InstagramIcon size={18} />;
      case 'youtube': return <YoutubeIcon size={18} />;
      case 'facebook': return <FacebookIcon size={18} />;
      case 'tiktok': return <TikTokIcon size={18} />;
      default: return <LinkIcon size={18} />;
    }
  };

  return (
    <div className="url-bar-section">
      <div className="hero-text-area">
        <h1 className="hero-heading">
          Download Social Media Videos in <span className="gradient-text-4k">4K Ultra-HD</span>
        </h1>
        <p className="hero-subheading">
          High-bitrate video, audio & carousel extractor for Instagram Reels, Posts, YouTube 4K, Shorts, and Facebook Watch.
        </p>
      </div>

      <form 
        onSubmit={handleSubmit}
        className={`search-glass-container ${isFocused ? 'focused' : ''} ${platform.id !== 'unknown' ? `platform-${platform.id}` : ''}`}
      >
        <div className="platform-detector-badge" style={{ background: platform.id !== 'unknown' ? platform.gradient : 'rgba(255, 255, 255, 0.06)' }}>
          {getPlatformIcon()}
          <span className="platform-name">
            {platform.id !== 'unknown' ? `${platform.name} ${mediaType.toUpperCase()}` : 'URL'}
          </span>
        </div>

        <input
          id="video-url-input"
          type="url"
          className="search-input"
          placeholder="Paste Instagram Reel, Carousel, YouTube 4K, Shorts, or Facebook link..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={isLoading}
          autoComplete="off"
          spellCheck="false"
        />

        <div className="input-inner-actions">
          {url && (
            <button
              type="button"
              id="btn-clear-url"
              className="action-icon-btn btn-pressable"
              onClick={handleClear}
              title="Clear input"
            >
              <X size={17} />
            </button>
          )}

          <button
            type="button"
            id="btn-paste-clipboard"
            className="paste-badge-btn btn-pressable"
            onClick={handlePaste}
            title="Paste link from clipboard"
          >
            <Clipboard size={15} />
            <span>Paste</span>
          </button>
        </div>

        <button
          type="submit"
          id="btn-fetch-stream"
          className="fetch-stream-btn btn-pressable"
          disabled={isLoading || !url.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles size={17} />
              <span>Extract 4K</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      {/* Quick Test Drive Chips */}
      <div className="presets-container">
        <span className="presets-label">Quick Test Presets:</span>
        <div className="presets-list">
          {PRESET_SAMPLES.map((preset) => (
            <button
              key={preset.id}
              id={`preset-btn-${preset.id}`}
              type="button"
              className={`preset-chip btn-pressable ${url === preset.url ? 'active' : ''}`}
              onClick={() => {
                setUrl(preset.url);
                onAnalyze(preset.url);
              }}
            >
              {preset.platform === 'instagram' && '📸'}
              {preset.platform === 'youtube' && (preset.type === 'short' ? '⚡' : '🎬')}
              {preset.platform === 'facebook' && '👥'}
              <span>{preset.title.split(' - ')[0]}</span>
              <span className="preset-sub-pill">{preset.type}</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .url-bar-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          width: 100%;
        }

        .hero-text-area {
          text-align: center;
          max-width: 820px;
          margin: 0.5rem 0;
        }

        .hero-heading {
          font-size: 2.75rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.15;
          letter-spacing: -0.035em;
        }

        .hero-subheading {
          font-size: 1.05rem;
          color: var(--text-secondary);
          margin-top: 0.75rem;
          font-weight: 400;
          line-height: 1.6;
        }

        .search-glass-container {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          max-width: 900px;
          background: rgba(14, 18, 30, 0.85);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-xl);
          padding: 0.5rem 0.6rem 0.5rem 1rem;
          box-shadow: 0 20px 50px -15px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08);
          transition: all var(--transition-normal);
          gap: 0.75rem;
        }

        .search-glass-container.focused {
          border-color: rgba(139, 92, 246, 0.75);
          box-shadow: 0 0 35px rgba(139, 92, 246, 0.3), 0 20px 50px -15px rgba(0, 0, 0, 0.8);
          transform: translateY(-2px);
        }

        .search-glass-container.platform-instagram.focused {
          border-color: rgba(225, 48, 108, 0.8);
          box-shadow: 0 0 35px rgba(225, 48, 108, 0.35);
        }

        .search-glass-container.platform-youtube.focused {
          border-color: rgba(239, 68, 68, 0.8);
          box-shadow: 0 0 35px rgba(239, 68, 68, 0.35);
        }

        .search-glass-container.platform-facebook.focused {
          border-color: rgba(59, 130, 246, 0.8);
          box-shadow: 0 0 35px rgba(59, 130, 246, 0.35);
        }

        .platform-detector-badge {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.45rem 0.85rem;
          border-radius: var(--radius-full);
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 700;
          white-space: nowrap;
          letter-spacing: 0.02em;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
          transition: all var(--transition-normal);
        }

        .search-input {
          flex: 1;
          background: transparent;
          color: #ffffff;
          font-size: 1.05rem;
          font-weight: 500;
          padding: 0.5rem 0;
          min-width: 0;
        }

        .search-input::placeholder {
          color: rgba(148, 163, 184, 0.55);
          font-size: 0.95rem;
        }

        .input-inner-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .action-icon-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.05);
        }

        .action-icon-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.15);
        }

        .paste-badge-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.8rem;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.07);
          color: var(--text-secondary);
          font-size: 0.8rem;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .paste-badge-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .fetch-stream-btn {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.85rem 1.6rem;
          border-radius: var(--radius-lg);
          background: linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6);
          background-size: 200% 200%;
          color: #ffffff;
          font-weight: 700;
          font-size: 0.98rem;
          letter-spacing: -0.01em;
          box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
          white-space: nowrap;
        }

        .fetch-stream-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 25px rgba(236, 72, 153, 0.5);
          filter: brightness(1.08);
        }

        .fetch-stream-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          filter: grayscale(0.5);
        }

        .presets-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          justify-content: center;
          max-width: 950px;
        }

        .presets-label {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .presets-list {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .preset-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.4rem 0.85rem;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-secondary);
          font-size: 0.82rem;
          font-weight: 600;
        }

        .preset-chip:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }

        .preset-chip.active {
          color: #ffffff;
          background: rgba(139, 92, 246, 0.25);
          border-color: var(--accent-purple);
        }

        .preset-sub-pill {
          font-size: 0.68rem;
          padding: 0.1rem 0.45rem;
          border-radius: var(--radius-full);
          background: rgba(0, 0, 0, 0.4);
          color: var(--accent-cyan);
          text-transform: uppercase;
          font-weight: 700;
        }

        @media (max-width: 820px) {
          .hero-heading {
            font-size: 2.1rem;
          }
          .search-glass-container {
            flex-wrap: wrap;
            padding: 0.75rem;
          }
          .platform-detector-badge {
            order: 1;
          }
          .search-input {
            order: 2;
            width: 100%;
          }
          .input-inner-actions {
            order: 3;
            margin-left: auto;
          }
          .fetch-stream-btn {
            order: 4;
            width: 100%;
            justify-content: center;
            margin-top: 0.25rem;
          }
        }
      `}</style>
    </div>
  );
}
