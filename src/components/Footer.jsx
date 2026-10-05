import React from 'react';
import { ShieldCheck, Zap, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="app-footer" id="main-footer">
      <div className="footer-content">
        <div className="footer-left">
          <div className="footer-brand">
            <Zap size={18} className="text-accent-pink" />
            <span>OmniStream 4K</span>
          </div>
          <p className="footer-disclaimer">
            Universal media extraction engine for Instagram Reels & Carousels, YouTube 4K & Shorts, and Facebook Watch. For personal, educational, and backup fair use.
          </p>
        </div>

        <div className="footer-specs">
          <div className="spec-badge">
            <span className="dot online"></span>
            <span>4K Mux Engine: Operational</span>
          </div>
          <div className="spec-badge">
            <span>Bitrate Cap: Unlimited (Max Native)</span>
          </div>
        </div>
      </div>

      <div className="footer-bottom-bar">
        <span>© {new Date().getFullYear()} OmniStream 4K • Engineered for Maximum Fidelity</span>
        <div className="status-live-chip">
          <ShieldCheck size={14} className="text-accent-emerald" />
          <span>SSL Secured • Zero Watermark</span>
        </div>
      </div>

      <style>{`
        .app-footer {
          margin-top: 3rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .footer-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1.5rem;
        }

        .footer-left {
          max-width: 520px;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .footer-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 800;
          font-size: 1.05rem;
          color: #ffffff;
        }

        .footer-disclaimer {
          font-size: 0.82rem;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .footer-specs {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          align-items: flex-end;
        }

        .spec-badge {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.76rem;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 0.3rem 0.65rem;
          border-radius: var(--radius-full);
          font-family: var(--font-mono);
        }

        .dot.online {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }

        .footer-bottom-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          padding-top: 1.25rem;
          font-size: 0.78rem;
          color: var(--text-muted);
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .status-live-chip {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: var(--text-secondary);
        }

        @media (max-width: 768px) {
          .footer-specs {
            align-items: flex-start;
          }
        }
      `}</style>
    </footer>
  );
}
