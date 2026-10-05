import React, { useState } from 'react';
import { 
  Download, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Check, 
  Sparkles, 
  Layers, 
  FileVideo, 
  Music, 
  ShieldCheck, 
  ExternalLink, 
  CheckSquare, 
  Square,
  Clock,
  Eye,
  User,
  Radio,
  Share2,
  FileCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function MediaDisplayCard({ 
  media, 
  onDownload, 
  isDownloading, 
  downloadProgress 
}) {
  const [selectedQuality, setSelectedQuality] = useState(
    media.qualities?.find(q => q.isHighest) || media.qualities[0]
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [selectedCarouselIds, setSelectedCarouselIds] = useState(
    media.carouselItems ? media.carouselItems.map(i => i.id) : []
  );
  const [activeCarouselSlide, setActiveCarouselSlide] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);

  const isCarousel = media.isCarousel && media.carouselItems?.length > 0;

  const toggleCarouselItem = (id) => {
    setSelectedCarouselIds(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const selectAllCarousel = () => {
    if (selectedCarouselIds.length === media.carouselItems.length) {
      setSelectedCarouselIds([]);
    } else {
      setSelectedCarouselIds(media.carouselItems.map(i => i.id));
    }
  };

  const handleDownloadTrigger = async (targetQuality = selectedQuality, itemSpecific = null) => {
    try {
      await onDownload({
        media,
        quality: targetQuality,
        itemSpecific,
        carouselSelection: isCarousel ? selectedCarouselIds : null
      });

      // Fire victory confetti on 4K download completion
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981']
      });
    } catch (err) {
      console.error(err);
    }
  };

  const copyDirectShare = () => {
    navigator.clipboard.writeText(media.url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="media-display-card glass-panel" id="media-preview-card">
      {/* Top Banner Ribbon */}
      <div className="card-top-header">
        <div className="source-info-bar">
          <span 
            className="source-platform-badge" 
            style={{ background: media.platform.gradient }}
          >
            {media.platform.name}
          </span>
          <span className="media-type-pill">
            {media.mediaType.toUpperCase()}
          </span>
          {isCarousel && (
            <span className="carousel-count-pill">
              <Layers size={13} /> {media.carouselItems.length} SLIDES CAROUSEL
            </span>
          )}
          <span className="quality-master-tag">
            <Sparkles size={13} /> 4K MASTER READY
          </span>
        </div>

        <button 
          id="btn-copy-share-link"
          className="share-link-btn btn-pressable"
          onClick={copyDirectShare}
          title="Copy Link"
        >
          {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
          <span>{copiedLink ? 'Copied' : 'Share'}</span>
        </button>
      </div>

      <div className="card-body-grid">
        {/* Left Column: Visual Media Preview Player & Carousel Gallery */}
        <div className="media-preview-column">
          <div className="player-viewport-wrapper">
            <video
              id="preview-video-element"
              className="preview-video"
              poster={media.thumbnailUrl}
              src={media.videoPreviewUrl}
              loop
              playsInline
              muted={isMuted}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Video overlay controls */}
            <div className="player-overlay">
              <div className="overlay-top">
                <span className="fps-counter-badge">
                  <Radio size={12} className="live-dot" /> 4K 60 FPS • {selectedQuality.codec.split(' ')[0]}
                </span>
              </div>

              <div className="overlay-bottom-controls">
                <button
                  id="btn-play-pause"
                  className="control-icon-circle btn-pressable"
                  onClick={(e) => {
                    e.stopPropagation();
                    const v = document.getElementById('preview-video-element');
                    if (v) {
                      if (v.paused) v.play();
                      else v.pause();
                    }
                  }}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
                </button>

                <button
                  id="btn-mute-toggle"
                  className="control-icon-circle btn-pressable"
                  onClick={(e) => {
                    e.stopPropagation();
                    const v = document.getElementById('preview-video-element');
                    if (v) {
                      v.muted = !v.muted;
                      setIsMuted(v.muted);
                    }
                  }}
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>

                <div className="live-stream-label">
                  Preview Stream Active
                </div>
              </div>
            </div>
          </div>

          {/* Carousel Slide Explorer (for Instagram Carousels / Multi-Post Albums) */}
          {isCarousel && (
            <div className="carousel-explorer-box">
              <div className="carousel-header-row">
                <div className="carousel-title-group">
                  <Layers size={16} className="text-accent" />
                  <h4>Carousel Album Slides ({media.carouselItems.length} Items)</h4>
                </div>
                <button 
                  id="btn-select-all-carousel"
                  className="select-all-toggle-btn btn-pressable"
                  onClick={selectAllCarousel}
                >
                  {selectedCarouselIds.length === media.carouselItems.length ? (
                    <>
                      <CheckSquare size={15} /> <span>Deselect All</span>
                    </>
                  ) : (
                    <>
                      <Square size={15} /> <span>Select All ({selectedCarouselIds.length}/{media.carouselItems.length})</span>
                    </>
                  )}
                </button>
              </div>

              <div className="carousel-slides-grid">
                {media.carouselItems.map((slide, idx) => {
                  const isSelected = selectedCarouselIds.includes(slide.id);
                  return (
                    <div 
                      key={slide.id}
                      className={`carousel-slide-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleCarouselItem(slide.id)}
                    >
                      <div className="slide-thumb-wrap">
                        <img src={slide.thumb} alt={slide.title} className="slide-thumb-img" />
                        <span className={`slide-type-tag ${slide.type}`}>
                          {slide.type === 'video' ? <FileVideo size={10} /> : <Sparkles size={10} />}
                          {slide.type.toUpperCase()}
                        </span>
                        <div className="slide-checkbox">
                          {isSelected && <Check size={12} />}
                        </div>
                      </div>
                      <div className="slide-info-row">
                        <span className="slide-number">Slide {idx + 1}</span>
                        <span className="slide-res">{slide.resolution.split(' ')[0]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Metadata, 4K Quality Matrix, & Download Action */}
        <div className="media-details-column">
          <div className="meta-info-header">
            <h2 className="media-title-text">{media.title}</h2>
            <div className="meta-stats-row">
              <span className="meta-chip author">
                <User size={13} /> {media.author}
              </span>
              <span className="meta-chip duration">
                <Clock size={13} /> {media.duration}
              </span>
              <span className="meta-chip views">
                <Eye size={13} /> {media.views}
              </span>
            </div>
          </div>

          {/* Quality Matrix Selector */}
          <div className="qualities-section">
            <div className="section-title-row">
              <h3 className="section-title">Select Quality Stream</h3>
              <span className="stream-badge-4k">
                <Sparkles size={13} /> 2160p 4K Available
              </span>
            </div>

            <div className="quality-options-list">
              {media.qualities.map((q) => {
                const isSelected = selectedQuality.id === q.id;
                return (
                  <div
                    key={q.id}
                    id={`quality-opt-${q.id}`}
                    className={`quality-option-row btn-pressable ${isSelected ? 'active-quality' : ''} ${q.isHighest ? 'is-4k-highlight' : ''}`}
                    onClick={() => setSelectedQuality(q)}
                  >
                    <div className="quality-radio-indicator">
                      {isSelected ? <div className="inner-dot"></div> : null}
                    </div>

                    <div className="quality-main-meta">
                      <div className="quality-title-line">
                        <span className="quality-label">{q.label}</span>
                        <span className={`quality-badge-tag ${q.isHighest ? 'badge-uhd' : ''}`}>
                          {q.tag}
                        </span>
                      </div>
                      <div className="quality-sub-specs">
                        <span>{q.resolution}</span>
                        <span>•</span>
                        <span>{q.fps}</span>
                        <span>•</span>
                        <span>{q.codec}</span>
                      </div>
                    </div>

                    <div className="quality-size-column">
                      <span className="est-size-text">{q.estimatedSize}</span>
                      <span className="audio-spec-text">{q.audio.split(' ')[0]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Download Progress HUD (if currently downloading) */}
          {isDownloading && (
            <div className="download-progress-hud">
              <div className="progress-status-line">
                <span className="status-label">{downloadProgress.label}</span>
                <span className="status-percent">{downloadProgress.progress}%</span>
              </div>
              <div className="progress-track">
                <div 
                  className="progress-fill-bar" 
                  style={{ width: `${downloadProgress.progress}%` }}
                ></div>
              </div>
              <div className="progress-details-row">
                <span>Hardware Acceleration: ON</span>
                <span>4K Container: MP4</span>
              </div>
            </div>
          )}

          {/* Download Actions */}
          <div className="download-actions-group">
            <button
              id="btn-primary-download"
              className="download-master-btn btn-pressable"
              onClick={() => handleDownloadTrigger(selectedQuality)}
              disabled={isDownloading}
            >
              <Download size={22} />
              <div className="btn-label-group">
                <span className="main-download-text">
                  {isDownloading 
                    ? 'Processing Stream...' 
                    : isCarousel 
                    ? `Download 4K Carousel (${selectedCarouselIds.length} Selected)` 
                    : `Download in ${selectedQuality.label}`
                  }
                </span>
                <span className="sub-download-specs">
                  {selectedQuality.resolution} • {selectedQuality.estimatedSize} • Maximum Bitrate
                </span>
              </div>
            </button>

            {/* Quick 1-Click Audio Only Extractor */}
            <button
              id="btn-quick-audio"
              className="quick-audio-btn btn-pressable"
              onClick={() => {
                const audioQ = media.qualities.find(q => q.id.includes('audio')) || media.qualities[media.qualities.length - 1];
                handleDownloadTrigger(audioQ);
              }}
              disabled={isDownloading}
              title="Download 320kbps MP3 Audio Only"
            >
              <Music size={18} />
              <span>Extract 320kbps MP3</span>
            </button>
          </div>

          {/* Quality Guarantee Guarantee Box */}
          <div className="guarantee-footer-card">
            <ShieldCheck size={18} className="shield-icon" />
            <p>
              <strong>Direct Stream Extraction:</strong> No quality degradation or artificial compression. We fetch the absolute highest bitrate file available on {media.platform.name}'s CDN nodes.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .media-display-card {
          padding: 1.75rem;
          background: rgba(14, 18, 30, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 25px 60px -20px rgba(0, 0, 0, 0.7);
        }

        .card-top-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .source-info-bar {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }

        .source-platform-badge {
          padding: 0.35rem 0.85rem;
          border-radius: var(--radius-full);
          color: #ffffff;
          font-weight: 700;
          font-size: 0.82rem;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }

        .media-type-pill {
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-main);
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .carousel-count-pill {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-full);
          background: rgba(236, 72, 153, 0.15);
          color: #f472b6;
          border: 1px solid rgba(236, 72, 153, 0.3);
          font-size: 0.76rem;
          font-weight: 700;
        }

        .quality-master-tag {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-full);
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
          font-size: 0.76rem;
          font-weight: 700;
        }

        .share-link-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.9rem;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 0.8rem;
          font-weight: 600;
        }

        .share-link-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.12);
        }

        .card-body-grid {
          display: grid;
          grid-template-columns: 1.1fr 1.35fr;
          gap: 2rem;
        }

        .media-preview-column {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .player-viewport-wrapper {
          position: relative;
          width: 100%;
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: #000000;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6);
          aspect-ratio: 16 / 10;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .preview-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .player-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 1rem;
          background: linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 40%, rgba(0,0,0,0.7) 100%);
          pointer-events: none;
        }

        .player-overlay button {
          pointer-events: auto;
        }

        .fps-counter-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.25rem 0.65rem;
          border-radius: var(--radius-full);
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          color: #ffffff;
          font-size: 0.72rem;
          font-family: var(--font-mono);
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .live-dot {
          color: #ef4444;
          animation: pulseGlow 1.5s infinite;
        }

        .overlay-bottom-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .control-icon-circle {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .control-icon-circle:hover {
          background: rgba(255, 255, 255, 0.4);
          transform: scale(1.06);
        }

        .live-stream-label {
          margin-left: auto;
          font-size: 0.74rem;
          color: rgba(255, 255, 255, 0.8);
          font-weight: 600;
        }

        /* Carousel Explorer Styling */
        .carousel-explorer-box {
          background: rgba(20, 24, 40, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: var(--radius-md);
          padding: 1rem;
        }

        .carousel-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.85rem;
        }

        .carousel-title-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .carousel-title-group h4 {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .select-all-toggle-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          color: var(--accent-cyan);
          font-weight: 600;
        }

        .carousel-slides-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
          gap: 0.75rem;
        }

        .carousel-slide-card {
          position: relative;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: #090b14;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .carousel-slide-card.selected {
          border-color: var(--accent-purple);
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
        }

        .slide-thumb-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
        }

        .slide-thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .slide-type-tag {
          position: absolute;
          top: 4px;
          left: 4px;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.15rem 0.4rem;
          border-radius: var(--radius-full);
          font-size: 0.62rem;
          font-weight: 700;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
        }

        .slide-type-tag.video {
          color: #f43f5e;
        }
        .slide-type-tag.photo {
          color: #38bdf8;
        }

        .slide-checkbox {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 18px;
          height: 18px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: #ffffff;
        }

        .carousel-slide-card.selected .slide-checkbox {
          background: var(--accent-purple);
          border-color: var(--accent-purple);
        }

        .slide-info-row {
          display: flex;
          justify-content: space-between;
          padding: 0.35rem 0.5rem;
          font-size: 0.7rem;
          color: var(--text-secondary);
          background: rgba(14, 18, 30, 0.9);
        }

        /* Right column */
        .media-details-column {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .media-title-text {
          font-size: 1.45rem;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.3;
        }

        .meta-stats-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 0.5rem;
          flex-wrap: wrap;
        }

        .meta-chip {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.04);
          padding: 0.25rem 0.65rem;
          border-radius: var(--radius-full);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .qualities-section {
          background: rgba(18, 22, 38, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-md);
          padding: 1rem;
        }

        .section-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.85rem;
        }

        .section-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .stream-badge-4k {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: #ec4899;
        }

        .quality-options-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .quality-option-row {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.7rem 0.9rem;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: all var(--transition-fast);
        }

        .quality-option-row:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .quality-option-row.active-quality {
          background: rgba(139, 92, 246, 0.12);
          border-color: rgba(139, 92, 246, 0.6);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
        }

        .quality-option-row.is-4k-highlight {
          border-left: 3px solid #ec4899;
        }

        .quality-radio-indicator {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .quality-option-row.active-quality .quality-radio-indicator {
          border-color: var(--accent-purple);
        }

        .quality-radio-indicator .inner-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent-purple);
          box-shadow: 0 0 8px var(--accent-purple);
        }

        .quality-main-meta {
          flex: 1;
        }

        .quality-title-line {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .quality-label {
          font-size: 0.92rem;
          font-weight: 700;
          color: #ffffff;
        }

        .quality-badge-tag {
          font-size: 0.65rem;
          font-weight: 800;
          padding: 0.1rem 0.45rem;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-secondary);
        }

        .quality-badge-tag.badge-uhd {
          background: linear-gradient(135deg, rgba(236, 72, 153, 0.3), rgba(139, 92, 246, 0.3));
          color: #f472b6;
          border: 1px solid rgba(236, 72, 153, 0.4);
        }

        .quality-sub-specs {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
          margin-top: 0.2rem;
        }

        .quality-size-column {
          text-align: right;
        }

        .est-size-text {
          display: block;
          font-size: 0.88rem;
          font-weight: 700;
          color: #ffffff;
          font-family: var(--font-mono);
        }

        .audio-spec-text {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        /* Progress HUD */
        .download-progress-hud {
          background: rgba(13, 16, 28, 0.95);
          border: 1px solid rgba(139, 92, 246, 0.4);
          border-radius: var(--radius-md);
          padding: 1rem;
          box-shadow: 0 0 25px rgba(139, 92, 246, 0.2);
        }

        .progress-status-line {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 0.5rem;
        }

        .status-percent {
          color: var(--accent-cyan);
          font-family: var(--font-mono);
        }

        .progress-track {
          width: 100%;
          height: 10px;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.1);
          overflow: hidden;
        }

        .progress-fill-bar {
          height: 100%;
          border-radius: var(--radius-full);
          background: linear-gradient(90deg, #ec4899, #8b5cf6, #06b6d4);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
          transition: width 0.3s ease;
        }

        .progress-details-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.72rem;
          color: var(--text-muted);
          margin-top: 0.5rem;
        }

        /* Actions */
        .download-actions-group {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .download-master-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.85rem;
          padding: 1.05rem 1.5rem;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6);
          color: #ffffff;
          box-shadow: 0 8px 30px rgba(139, 92, 246, 0.5);
          transition: all var(--transition-fast);
        }

        .download-master-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 35px rgba(236, 72, 153, 0.6);
          filter: brightness(1.08);
        }

        .download-master-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-label-group {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }

        .main-download-text {
          font-size: 1.05rem;
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        .sub-download-specs {
          font-size: 0.75rem;
          opacity: 0.85;
          font-weight: 500;
        }

        .quick-audio-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          font-size: 0.88rem;
          font-weight: 600;
        }

        .quick-audio-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.2);
        }

        .guarantee-footer-card {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          padding: 0.8rem 1rem;
          border-radius: var(--radius-sm);
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          font-size: 0.78rem;
          color: #a7f3d0;
          line-height: 1.45;
        }

        .shield-icon {
          color: #34d399;
          flex-shrink: 0;
          margin-top: 0.1rem;
        }

        @media (max-width: 900px) {
          .card-body-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
