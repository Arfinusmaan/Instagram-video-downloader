import React, { useState } from 'react';
import { 
  Cpu, 
  Layers, 
  HelpCircle, 
  CheckCircle2, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Sliders, 
  Zap,
  HardDrive
} from 'lucide-react';

export default function TechExplainer() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'How does 4K downloading work for YouTube Videos & Shorts?',
      a: 'When YouTube provides 4K (2160p) or 1440p formats, the downloader selects the highest available source resolution and combines separate video and audio tracks when needed. The saved resolution depends on the formats available for that video.'
    },
    {
      q: 'Can Instagram Reels and Posts be downloaded in 2K or 4K?',
      a: 'The downloader uses the highest resolution Instagram makes available for each public post. Some posts may be available in 2K or 4K, while others are limited to lower resolutions. Downloads preserve the source resolution and are not artificially upscaled.'
    },
    {
      q: 'How does Carousel Multi-Slide downloading work?',
      a: 'When you paste an Instagram album or carousel link, our parser inspects the entire media bundle. It extracts every video slide and lossless full-resolution photo individually, allowing you to selectively download specific slides or grab the complete album all at once.'
    },
    {
      q: 'Does OmniStream 4K support Facebook Watch and Facebook Reels?',
      a: 'Yes! Facebook videos uploaded in 4K UHD or 1080p Full HD are detected through Facebook’s Graph & Video CDN manifests, extracting the highest available resolution without watermarks.'
    }
  ];

  return (
    <section className="tech-explainer-section" id="tech-specs-section">
      <div className="features-grid">
        <div className="feature-card glass-panel">
          <div className="feature-icon-box uhd">
            <Zap size={22} />
          </div>
          <h3 className="feature-title">Native 4K & 60FPS</h3>
          <p className="feature-desc">
            Direct high-bitrate demuxing for YouTube, Facebook, and Reels. Enjoy 3840x2160 UHD playback with HDR color preservation.
          </p>
        </div>

        <div className="feature-card glass-panel">
          <div className="feature-icon-box carousel">
            <Layers size={22} />
          </div>
          <h3 className="feature-title">Carousel Multi-Slide Unpacker</h3>
          <p className="feature-desc">
            Extract every single image and video slide from Instagram posts. Preview thumbnails and download in 1 click.
          </p>
        </div>

        <div className="feature-card glass-panel">
          <div className="feature-icon-box audio">
            <Sliders size={22} />
          </div>
          <h3 className="feature-title">Studio 320kbps Audio</h3>
          <p className="feature-desc">
            Lossless audio extraction for music videos, podcast reels, and background tracks in crystal clear 320kbps MP3 and M4A.
          </p>
        </div>

        <div className="feature-card glass-panel">
          <div className="feature-icon-box hw">
            <HardDrive size={22} />
          </div>
          <h3 className="feature-title">Zero Watermarks</h3>
          <p className="feature-desc">
            Raw stream preservation directly from edge CDN servers. Clean video without burned-in logos, stamps, or compression artifacts.
          </p>
        </div>
      </div>

      {/* Interactive FAQ & Technical Details Accordion */}
      <div className="faq-container glass-panel">
        <div className="faq-header">
          <HelpCircle size={20} className="text-purple" />
          <h3 className="faq-main-title">4K Stream Architecture & Capabilities</h3>
        </div>

        <div className="faq-list">
          {faqs.map((faq, idx) => (
            <div 
              key={idx} 
              className={`faq-item ${openFaq === idx ? 'open' : ''}`}
              onClick={() => toggleFaq(idx)}
            >
              <div className="faq-question-row">
                <span className="faq-q-text">{faq.q}</span>
                <span className="faq-toggle-icon">
                  {openFaq === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
              </div>
              {openFaq === idx && (
                <div className="faq-answer">
                  <p>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .tech-explainer-section {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
          margin-top: 1rem;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.25rem;
        }

        .feature-card {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          background: rgba(14, 18, 30, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.07);
          transition: all var(--transition-normal);
        }

        .feature-card:hover {
          transform: translateY(-3px);
          border-color: rgba(255, 255, 255, 0.15);
          background: rgba(20, 26, 44, 0.75);
          box-shadow: 0 15px 35px -10px rgba(0, 0, 0, 0.6);
        }

        .feature-icon-box {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
        }

        .feature-icon-box.uhd {
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          box-shadow: 0 0 20px rgba(236, 72, 153, 0.35);
        }

        .feature-icon-box.carousel {
          background: linear-gradient(135deg, #06b6d4, #3b82f6);
          box-shadow: 0 0 20px rgba(6, 182, 212, 0.35);
        }

        .feature-icon-box.audio {
          background: linear-gradient(135deg, #10b981, #059669);
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.35);
        }

        .feature-icon-box.hw {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.35);
        }

        .feature-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #ffffff;
        }

        .feature-desc {
          font-size: 0.86rem;
          color: var(--text-secondary);
          line-height: 1.55;
        }

        /* FAQ */
        .faq-container {
          padding: 1.75rem;
          background: rgba(14, 18, 30, 0.65);
        }

        .faq-header {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          margin-bottom: 1.25rem;
        }

        .faq-main-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #ffffff;
        }

        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .faq-item {
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          overflow: hidden;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .faq-item:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.12);
        }

        .faq-item.open {
          background: rgba(139, 92, 246, 0.08);
          border-color: rgba(139, 92, 246, 0.3);
        }

        .faq-question-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
        }

        .faq-q-text {
          font-size: 0.95rem;
          font-weight: 600;
          color: #ffffff;
        }

        .faq-toggle-icon {
          color: var(--text-secondary);
        }

        .faq-answer {
          padding: 0 1.25rem 1.25rem 1.25rem;
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.6;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 0.85rem;
        }
      `}</style>
    </section>
  );
}
