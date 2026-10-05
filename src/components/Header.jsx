import React from 'react';
import { Sparkles, Layers, History, Settings, Zap, Video } from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  historyCount = 0, 
  onOpenSettings,
  onOpenBatch 
}) {
  return (
    <header className="header-wrapper glass-panel" id="main-header">
      <div className="header-top">
        <div className="logo-group">
          <div className="logo-icon-box">
            <Zap className="logo-lightning" size={26} />
            <div className="logo-pulse-ring"></div>
          </div>
          <div className="logo-titles">
            <div className="logo-main">
              OmniStream <span className="gradient-text-4k">4K</span>
            </div>
            <p className="logo-sub">Ultra-HD Video & Carousel Downloader</p>
          </div>
        </div>

        <div className="header-actions">
          <button 
            id="btn-batch-queue"
            className="action-pill-btn btn-pressable"
            onClick={onOpenBatch}
            title="Batch Download Multiple URLs"
          >
            <Layers size={16} />
            <span>Batch Queue</span>
          </button>

          <button 
            id="btn-history"
            className={`action-pill-btn btn-pressable ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab(activeTab === 'history' ? 'downloader' : 'history')}
            title="View Download History"
          >
            <History size={16} />
            <span>History</span>
            {historyCount > 0 && <span className="badge-counter">{historyCount}</span>}
          </button>

          <button 
            id="btn-settings"
            className="action-pill-btn btn-pressable icon-only"
            onClick={onOpenSettings}
            title="Engine & API Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      <div className="supported-platforms-bar">
        <span className="platform-tag ig">
          <span className="dot"></span> Instagram (Reels & Carousels)
        </span>
        <span className="platform-tag yt">
          <span className="dot"></span> YouTube (4K UHD & Shorts)
        </span>
        <span className="platform-tag fb">
          <span className="dot"></span> Facebook (Watch & Reels)
        </span>
        <span className="platform-tag uhd">
          <Sparkles size={12} /> 4K Ultra-HD 60FPS
        </span>
      </div>

      <style>{`
        .header-wrapper {
          padding: 1.25rem 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
          background: rgba(15, 18, 30, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 16px 36px -10px rgba(0, 0, 0, 0.6);
        }

        .header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .logo-group {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .logo-icon-box {
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 25px rgba(236, 72, 153, 0.45);
        }

        .logo-lightning {
          color: #ffffff;
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4));
        }

        .logo-pulse-ring {
          position: absolute;
          inset: -4px;
          border-radius: 18px;
          border: 2px solid rgba(139, 92, 246, 0.4);
          animation: pulseGlow 2.5s infinite;
          pointer-events: none;
        }

        .logo-main {
          font-size: 1.65rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.03em;
          line-height: 1.1;
        }

        .logo-sub {
          font-size: 0.82rem;
          color: var(--text-secondary);
          margin-top: 0.2rem;
          font-weight: 500;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .action-pill-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.1rem;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-main);
          border: 1px solid rgba(255, 255, 255, 0.09);
          font-size: 0.88rem;
          font-weight: 600;
          transition: all var(--transition-fast);
        }

        .action-pill-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }

        .action-pill-btn.active {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3));
          border-color: var(--accent-purple);
          box-shadow: 0 0 18px rgba(139, 92, 246, 0.35);
        }

        .action-pill-btn.icon-only {
          padding: 0.6rem;
        }

        .badge-counter {
          background: var(--accent-primary);
          color: white;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.1rem 0.45rem;
          border-radius: var(--radius-full);
        }

        .supported-platforms-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 0.85rem;
        }

        .platform-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 0.3rem 0.75rem;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .platform-tag.ig {
          color: #f472b6;
          border-color: rgba(244, 114, 182, 0.25);
        }
        .platform-tag.ig .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #e1306c;
          box-shadow: 0 0 8px #e1306c;
        }

        .platform-tag.yt {
          color: #f87171;
          border-color: rgba(248, 113, 113, 0.25);
        }
        .platform-tag.yt .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 8px #ef4444;
        }

        .platform-tag.fb {
          color: #60a5fa;
          border-color: rgba(96, 165, 250, 0.25);
        }
        .platform-tag.fb .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #3b82f6;
          box-shadow: 0 0 8px #3b82f6;
        }

        .platform-tag.uhd {
          color: #a78bfa;
          background: rgba(139, 92, 246, 0.12);
          border-color: rgba(139, 92, 246, 0.35);
          font-weight: 700;
          margin-left: auto;
        }

        @media (max-width: 640px) {
          .supported-platforms-bar {
            justify-content: flex-start;
          }
          .platform-tag.uhd {
            margin-left: 0;
          }
        }
      `}</style>
    </header>
  );
}
