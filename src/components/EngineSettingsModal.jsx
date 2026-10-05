import React, { useState } from 'react';
import { X, Settings, Server, Cpu, Check, Copy, Terminal, ExternalLink } from 'lucide-react';

export default function EngineSettingsModal({ isOpen, onClose, engineConfig, onSaveConfig }) {
  const [mode, setMode] = useState(engineConfig.mode || 'client');
  const [customApiUrl, setCustomApiUrl] = useState(engineConfig.customApiUrl || '');
  const [hwAcceleration, setHwAcceleration] = useState(engineConfig.hwAcceleration ?? true);
  const [defaultAudioBitrate, setDefaultAudioBitrate] = useState(engineConfig.defaultAudioBitrate || '320');
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig({
      mode,
      customApiUrl,
      hwAcceleration,
      defaultAudioBitrate
    });
    onClose();
  };

  const copyPythonServerSnippet = () => {
    const code = `# 1-Line Self-Hosted yt-dlp 4K Downloader Server
pip install yt-dlp flask flask-cors
python -c "
from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp
app = Flask(__name__)
CORS(app)
@app.route('/api/download', methods=['POST'])
def dl():
    url = request.json.get('url')
    ydl_opts = {'format': 'bestvideo[height<=2160]+bestaudio/best', 'merge_output_format': 'mp4'}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
    return jsonify({'success': True, 'title': info.get('title')})
app.run(port=5000)
"`;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card glass-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Settings className="text-accent-purple" size={22} />
            <h3>Engine & 4K Stream Configuration</h3>
          </div>
          <button id="btn-close-settings-modal" className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Mode Selector */}
          <div className="setting-group">
            <label className="setting-label">Stream Extraction Engine</label>
            <div className="engine-modes-grid">
              <div 
                className={`mode-option-card ${mode === 'client' ? 'active' : ''}`}
                onClick={() => setMode('client')}
              >
                <div className="mode-card-header">
                  <Cpu size={18} className="text-accent-cyan" />
                  <span className="mode-name">High-Fidelity Client Engine</span>
                </div>
                <p className="mode-desc">
                  Instant browser stream demuxing & direct CDN extraction. No server setup required.
                </p>
              </div>

              <div 
                className={`mode-option-card ${mode === 'backend' ? 'active' : ''}`}
                onClick={() => setMode('backend')}
              >
                <div className="mode-card-header">
                  <Server size={18} className="text-accent-purple" />
                  <span className="mode-name">Self-Hosted yt-dlp Server</span>
                </div>
                <p className="mode-desc">
                  Connect your own local or remote yt-dlp / Cobalt instance for unlimited 4K/8K batch jobs.
                </p>
              </div>
            </div>
          </div>

          {/* Custom Backend URL input if backend mode */}
          {mode === 'backend' && (
            <div className="setting-group">
              <label className="setting-label">Microservice Endpoint URL</label>
              <input
                id="custom-api-input"
                type="text"
                className="setting-input"
                placeholder="http://localhost:5000/api/download or https://api.cobalt.tools"
                value={customApiUrl}
                onChange={e => setCustomApiUrl(e.target.value)}
              />
            </div>
          )}

          {/* Hardware acceleration toggle */}
          <div className="toggle-row-item">
            <div className="toggle-info">
              <span className="toggle-title">GPU Hardware Stream Acceleration</span>
              <span className="toggle-sub">Use WebCodecs / WebGPU for 60FPS video demuxing</span>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={hwAcceleration}
                onChange={e => setHwAcceleration(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          {/* Audio Bitrate Preference */}
          <div className="setting-group">
            <label className="setting-label">Default Audio Extraction Bitrate</label>
            <div className="bitrate-pills-row">
              {['320', '256', '192', '128'].map(bitrate => (
                <button
                  key={bitrate}
                  type="button"
                  className={`bitrate-pill ${defaultAudioBitrate === bitrate ? 'active' : ''}`}
                  onClick={() => setDefaultAudioBitrate(bitrate)}
                >
                  {bitrate} kbps {bitrate === '320' ? '(Lossless)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Python server helper */}
          <div className="terminal-guide-box">
            <div className="terminal-guide-header">
              <div className="terminal-title">
                <Terminal size={15} />
                <span>Local yt-dlp Microservice Command</span>
              </div>
              <button className="copy-code-btn" onClick={copyPythonServerSnippet}>
                {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="terminal-code">pip install yt-dlp flask && python server.py</pre>
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-pill-btn" onClick={onClose}>
            Cancel
          </button>
          <button 
            id="btn-save-settings"
            className="save-settings-btn btn-pressable" 
            onClick={handleSave}
          >
            Save Settings
          </button>
        </div>

        <style>{`
          .modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(4, 6, 12, 0.85);
            backdrop-filter: blur(12px);
            z-index: 100;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
          }

          .modal-card {
            width: 100%;
            max-width: 620px;
            background: #0f1220;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: var(--radius-lg);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
          }

          .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }

          .modal-title-group {
            display: flex;
            align-items: center;
            gap: 0.65rem;
          }

          .modal-title-group h3 {
            font-size: 1.15rem;
            color: #ffffff;
            font-weight: 700;
          }

          .close-btn {
            color: var(--text-secondary);
            padding: 0.4rem;
            border-radius: 50%;
          }

          .close-btn:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.1);
          }

          .modal-body {
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
          }

          .setting-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .setting-label {
            font-size: 0.82rem;
            font-weight: 700;
            color: var(--text-main);
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }

          .engine-modes-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
          }

          .mode-option-card {
            padding: 1rem;
            border-radius: var(--radius-md);
            background: rgba(255, 255, 255, 0.03);
            border: 1.5px solid rgba(255, 255, 255, 0.07);
            cursor: pointer;
            transition: all var(--transition-fast);
          }

          .mode-option-card:hover {
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(255, 255, 255, 0.15);
          }

          .mode-option-card.active {
            background: rgba(139, 92, 246, 0.12);
            border-color: var(--accent-purple);
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.25);
          }

          .mode-card-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.45rem;
          }

          .mode-name {
            font-size: 0.88rem;
            font-weight: 700;
            color: #ffffff;
          }

          .mode-desc {
            font-size: 0.76rem;
            color: var(--text-secondary);
            line-height: 1.45;
          }

          .setting-input {
            width: 100%;
            padding: 0.75rem 1rem;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-md);
            color: #ffffff;
            font-size: 0.88rem;
            font-family: var(--font-mono);
          }

          .setting-input:focus {
            border-color: var(--accent-purple);
          }

          .toggle-row-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.85rem 1rem;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: var(--radius-md);
          }

          .toggle-info {
            display: flex;
            flex-direction: column;
          }

          .toggle-title {
            font-size: 0.88rem;
            font-weight: 700;
            color: #ffffff;
          }

          .toggle-sub {
            font-size: 0.76rem;
            color: var(--text-muted);
          }

          /* Switch styling */
          .switch {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
          }

          .switch input {
            opacity: 0;
            width: 0;
            height: 0;
          }

          .slider {
            position: absolute;
            cursor: pointer;
            inset: 0;
            background-color: rgba(255, 255, 255, 0.15);
            transition: .3s;
            border-radius: 24px;
          }

          .slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .3s;
            border-radius: 50%;
          }

          input:checked + .slider {
            background-color: var(--accent-purple);
          }

          input:checked + .slider:before {
            transform: translateX(20px);
          }

          .bitrate-pills-row {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
          }

          .bitrate-pill {
            padding: 0.5rem 0.85rem;
            border-radius: var(--radius-full);
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: var(--text-secondary);
            font-size: 0.82rem;
            font-weight: 600;
          }

          .bitrate-pill.active {
            background: rgba(139, 92, 246, 0.2);
            border-color: var(--accent-purple);
            color: #ffffff;
          }

          .terminal-guide-box {
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: var(--radius-md);
            overflow: hidden;
          }

          .terminal-guide-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.5rem 0.85rem;
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          }

          .terminal-title {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            font-size: 0.74rem;
            color: var(--text-secondary);
            font-weight: 600;
          }

          .copy-code-btn {
            display: flex;
            align-items: center;
            gap: 0.3rem;
            font-size: 0.72rem;
            color: var(--accent-cyan);
            font-weight: 600;
          }

          .terminal-code {
            padding: 0.75rem 1rem;
            font-family: var(--font-mono);
            font-size: 0.78rem;
            color: #34d399;
          }

          .modal-footer {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 0.75rem;
            padding: 1.1rem 1.5rem;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(10, 13, 24, 0.5);
          }

          .cancel-pill-btn {
            padding: 0.6rem 1.1rem;
            border-radius: var(--radius-full);
            color: var(--text-secondary);
            font-size: 0.85rem;
            font-weight: 600;
          }

          .cancel-pill-btn:hover {
            color: #ffffff;
          }

          .save-settings-btn {
            padding: 0.65rem 1.35rem;
            border-radius: var(--radius-full);
            background: linear-gradient(135deg, #ec4899, #8b5cf6);
            color: #ffffff;
            font-size: 0.88rem;
            font-weight: 700;
            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
          }
        `}</style>
      </div>
    </div>
  );
}
