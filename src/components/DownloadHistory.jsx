import React from 'react';
import { History, Download, Trash2, ArrowLeft, ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react';

export default function DownloadHistory({ history, onClearHistory, onReDownload, onBackToDownloader }) {
  return (
    <div className="history-page glass-panel" id="download-history-panel">
      <div className="history-header">
        <button 
          id="btn-back-from-history"
          className="back-btn btn-pressable" 
          onClick={onBackToDownloader}
        >
          <ArrowLeft size={18} />
          <span>Back to Downloader</span>
        </button>

        <div className="history-title-box">
          <History size={22} className="text-accent-purple" />
          <h2>4K Download Session History</h2>
        </div>

        {history.length > 0 && (
          <button 
            id="btn-clear-history-all"
            className="clear-all-btn btn-pressable" 
            onClick={onClearHistory}
          >
            <Trash2 size={16} />
            <span>Clear History</span>
          </button>
        )}
      </div>

      <div className="history-content">
        {history.length === 0 ? (
          <div className="empty-history-box">
            <History size={48} className="empty-icon" />
            <h3>No Downloads in this Session Yet</h3>
            <p>Paste any Instagram Reel, Carousel, YouTube 4K, or Facebook link to download in ultra-high bitrate.</p>
            <button className="empty-cta-btn btn-pressable" onClick={onBackToDownloader}>
              Download 4K Video Now
            </button>
          </div>
        ) : (
          <div className="history-items-grid">
            {history.map((item) => (
              <div key={item.id} className="history-card">
                <div className="history-thumb-wrap">
                  <img src={item.thumbnailUrl} alt={item.title} className="history-thumb-img" />
                  <span className="history-platform-tag" style={{ background: item.platform.gradient }}>
                    {item.platform.name}
                  </span>
                  <span className="history-quality-badge">
                    <Sparkles size={11} /> {item.qualityLabel}
                  </span>
                </div>

                <div className="history-meta-area">
                  <h4 className="history-title">{item.title}</h4>
                  <div className="history-specs-row">
                    <span>{item.resolution}</span>
                    <span>•</span>
                    <span>{item.size}</span>
                    <span>•</span>
                    <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="history-actions-row">
                    <span className="history-completed-tag">
                      <CheckCircle2 size={13} /> Completed
                    </span>

                    <button 
                      className="redownload-btn btn-pressable"
                      onClick={() => onReDownload(item)}
                      title="Download File Again"
                    >
                      <Download size={14} />
                      <span>Download Again</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .history-page {
          padding: 1.75rem;
          background: rgba(14, 18, 30, 0.85);
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .history-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 1.25rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-secondary);
          font-size: 0.88rem;
          font-weight: 600;
          padding: 0.5rem 0.9rem;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.04);
        }

        .back-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.1);
        }

        .history-title-box {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .history-title-box h2 {
          font-size: 1.35rem;
          font-weight: 700;
          color: #ffffff;
        }

        .clear-all-btn {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          color: var(--accent-rose);
          font-size: 0.84rem;
          font-weight: 600;
          padding: 0.45rem 0.85rem;
          border-radius: var(--radius-full);
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.2);
        }

        .clear-all-btn:hover {
          background: rgba(244, 63, 94, 0.2);
        }

        .empty-history-box {
          text-align: center;
          padding: 4rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .empty-icon {
          color: var(--text-muted);
          opacity: 0.4;
        }

        .empty-history-box h3 {
          font-size: 1.25rem;
          color: #ffffff;
        }

        .empty-history-box p {
          color: var(--text-secondary);
          max-width: 450px;
          font-size: 0.9rem;
        }

        .empty-cta-btn {
          margin-top: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-full);
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          color: #ffffff;
          font-weight: 700;
          font-size: 0.9rem;
          box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
        }

        .history-items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.25rem;
        }

        .history-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: var(--radius-md);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: all var(--transition-fast);
        }

        .history-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.15);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        }

        .history-thumb-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
        }

        .history-thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .history-platform-tag {
          position: absolute;
          top: 8px;
          left: 8px;
          padding: 0.2rem 0.55rem;
          border-radius: var(--radius-full);
          font-size: 0.65rem;
          font-weight: 800;
          color: #ffffff;
        }

        .history-quality-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.2rem 0.55rem;
          border-radius: var(--radius-full);
          font-size: 0.65rem;
          font-weight: 700;
          background: rgba(0, 0, 0, 0.75);
          color: var(--accent-cyan);
          backdrop-filter: blur(4px);
        }

        .history-meta-area {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }

        .history-title {
          font-size: 0.92rem;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .history-specs-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.72rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .history-actions-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .history-completed-tag {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.72rem;
          color: var(--accent-emerald);
          font-weight: 700;
        }

        .redownload-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
          font-size: 0.76rem;
          font-weight: 600;
        }

        .redownload-btn:hover {
          background: rgba(139, 92, 246, 0.3);
          color: #ffffff;
        }
      `}</style>
    </div>
  );
}
