import React, { useState } from 'react';
import { X, Layers, Plus, Trash2, Download, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { detectPlatform, detectMediaType } from '../utils/mediaDetector';

export default function BatchQueueModal({ isOpen, onClose, onBatchDownload }) {
  const [inputText, setInputText] = useState('');
  const [queueItems, setQueueItems] = useState([
    {
      id: '1',
      url: 'https://www.instagram.com/reel/C8qXkLpMNgR/',
      platform: 'instagram',
      type: 'reel',
      title: 'Instagram 4K Reel - Dolomites Cinematic Alps',
      status: 'ready'
    },
    {
      id: '2',
      url: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
      platform: 'youtube',
      type: 'full-video',
      title: 'YouTube 4K UHD 60FPS - Costa Rica Wildlife',
      status: 'ready'
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleAddLinks = () => {
    const lines = inputText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const newItems = lines.map((url, i) => {
      const platform = detectPlatform(url);
      const mediaType = detectMediaType(url);
      return {
        id: `${Date.now()}_${i}`,
        url,
        platform: platform.id,
        type: mediaType,
        title: `${platform.name} ${mediaType.toUpperCase()} Stream`,
        status: 'ready'
      };
    });

    setQueueItems(prev => [...prev, ...newItems]);
    setInputText('');
  };

  const handleRemove = (id) => {
    setQueueItems(prev => prev.filter(item => item.id !== id));
  };

  const handleClearAll = () => {
    setQueueItems([]);
  };

  const handleStartBatch = async () => {
    setIsProcessing(true);
    for (let i = 0; i < queueItems.length; i++) {
      const item = queueItems[i];
      setQueueItems(prev => prev.map(q => q.id === item.id ? { ...q, status: 'downloading' } : q));
      await onBatchDownload(item);
      setQueueItems(prev => prev.map(q => q.id === item.id ? { ...q, status: 'completed' } : q));
    }
    setIsProcessing(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card glass-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Layers className="text-accent-purple" size={22} />
            <h3>Batch Multi-URL Queue Downloader</h3>
          </div>
          <button id="btn-close-batch-modal" className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-subtext">
            Paste multiple video or carousel URLs (one link per line). OmniStream will queue and download them all in maximum 4K quality.
          </p>

          <div className="batch-input-area">
            <textarea
              id="batch-urls-textarea"
              className="batch-textarea"
              rows={4}
              placeholder="https://www.instagram.com/reel/...&#10;https://www.youtube.com/watch?v=...&#10;https://www.facebook.com/watch/..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
            />
            <button 
              id="btn-add-batch-links"
              className="add-to-queue-btn btn-pressable"
              onClick={handleAddLinks}
              disabled={!inputText.trim()}
            >
              <Plus size={16} />
              <span>Add to Queue</span>
            </button>
          </div>

          <div className="queue-list-container">
            <div className="queue-list-header">
              <span>Queued Items ({queueItems.length})</span>
              {queueItems.length > 0 && (
                <button className="clear-text-btn" onClick={handleClearAll}>
                  Clear All
                </button>
              )}
            </div>

            <div className="queue-items-scroll">
              {queueItems.length === 0 ? (
                <div className="empty-queue-message">
                  No items in batch queue yet. Paste URLs above to get started.
                </div>
              ) : (
                queueItems.map(item => (
                  <div key={item.id} className="queue-item-row">
                    <span className={`platform-pill ${item.platform}`}>
                      {item.platform.toUpperCase()}
                    </span>
                    <div className="item-text-column">
                      <span className="item-title">{item.title}</span>
                      <span className="item-url-sub">{item.url}</span>
                    </div>

                    <div className="item-status-col">
                      {item.status === 'ready' && (
                        <span className="status-badge ready">4K Ready</span>
                      )}
                      {item.status === 'downloading' && (
                        <span className="status-badge downloading">
                          <Loader2 size={12} className="animate-spin" /> Processing
                        </span>
                      )}
                      {item.status === 'completed' && (
                        <span className="status-badge completed">
                          <CheckCircle size={12} /> Saved
                        </span>
                      )}

                      <button 
                        className="delete-item-btn"
                        onClick={() => handleRemove(item.id)}
                        disabled={isProcessing}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-pill-btn" onClick={onClose}>
            Close
          </button>
          <button 
            id="btn-start-batch-download"
            className="start-batch-btn btn-pressable"
            onClick={handleStartBatch}
            disabled={queueItems.length === 0 || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Downloading Batch...</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>Download All in 4K ({queueItems.length})</span>
              </>
            )}
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
            max-width: 650px;
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
            gap: 1.1rem;
          }

          .modal-subtext {
            font-size: 0.85rem;
            color: var(--text-secondary);
            line-height: 1.5;
          }

          .batch-input-area {
            display: flex;
            flex-direction: column;
            gap: 0.65rem;
          }

          .batch-textarea {
            width: 100%;
            padding: 0.85rem;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-md);
            color: #ffffff;
            font-size: 0.88rem;
            font-family: var(--font-mono);
            resize: vertical;
          }

          .batch-textarea:focus {
            border-color: var(--accent-purple);
          }

          .add-to-queue-btn {
            align-self: flex-end;
            display: flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.5rem 1rem;
            border-radius: var(--radius-full);
            background: rgba(139, 92, 246, 0.2);
            border: 1px solid var(--accent-purple);
            color: #ffffff;
            font-size: 0.82rem;
            font-weight: 600;
          }

          .add-to-queue-btn:hover:not(:disabled) {
            background: var(--accent-purple);
          }

          .queue-list-container {
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: var(--radius-md);
            background: rgba(10, 13, 24, 0.6);
            overflow: hidden;
          }

          .queue-list-header {
            display: flex;
            justify-content: space-between;
            padding: 0.65rem 1rem;
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            font-size: 0.78rem;
            font-weight: 700;
            color: var(--text-secondary);
          }

          .clear-text-btn {
            color: var(--accent-rose);
            font-size: 0.74rem;
            font-weight: 600;
          }

          .queue-items-scroll {
            max-height: 220px;
            overflow-y: auto;
            padding: 0.5rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .empty-queue-message {
            text-align: center;
            padding: 2rem 1rem;
            color: var(--text-muted);
            font-size: 0.85rem;
          }

          .queue-item-row {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.55rem 0.75rem;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: var(--radius-sm);
          }

          .platform-pill {
            font-size: 0.65rem;
            font-weight: 800;
            padding: 0.15rem 0.45rem;
            border-radius: var(--radius-full);
            color: #ffffff;
          }

          .platform-pill.instagram { background: #e1306c; }
          .platform-pill.youtube { background: #ef4444; }
          .platform-pill.facebook { background: #3b82f6; }
          .platform-pill.unknown { background: #64748b; }

          .item-text-column {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
          }

          .item-title {
            font-size: 0.84rem;
            color: #ffffff;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .item-url-sub {
            font-size: 0.7rem;
            color: var(--text-muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .item-status-col {
            display: flex;
            align-items: center;
            gap: 0.6rem;
          }

          .status-badge {
            font-size: 0.72rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 0.3rem;
          }

          .status-badge.ready { color: var(--accent-cyan); }
          .status-badge.downloading { color: var(--accent-amber); }
          .status-badge.completed { color: var(--accent-emerald); }

          .delete-item-btn {
            color: var(--text-muted);
            padding: 0.25rem;
          }

          .delete-item-btn:hover:not(:disabled) {
            color: var(--accent-rose);
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

          .start-batch-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.65rem 1.35rem;
            border-radius: var(--radius-full);
            background: linear-gradient(135deg, #ec4899, #8b5cf6);
            color: #ffffff;
            font-size: 0.88rem;
            font-weight: 700;
            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
          }

          .start-batch-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
}
