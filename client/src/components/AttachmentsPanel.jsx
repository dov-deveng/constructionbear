import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../api/index.js';

export default function AttachmentsPanel({ docId, onClose }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [labelInputs, setLabelInputs] = useState({});
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    if (!docId) return;
    try {
      const data = await api.getDocAttachments(docId);
      setAttachments(data.attachments || []);
    } catch (err) {
      console.error('Failed to load attachments:', err);
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => { load(); }, [load]);

  async function handleFiles(files) {
    if (!files.length) return;
    setUploading(true);
    try {
      const captions = Array.from(files).map((_, i) => labelInputs[`new_${i}`] || '');
      await api.addDocAttachments(docId, Array.from(files), captions);
      setLabelInputs({});
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(attId) {
    if (!confirm('Remove this image from the document?')) return;
    try {
      await api.deleteDocAttachment(docId, attId);
      setAttachments(prev => prev.filter(a => a.id !== attId));
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleLabelBlur(attId, label) {
    try {
      await api.updateDocAttachment(docId, attId, { caption_label: label });
    } catch (err) {
      console.error('Label update failed:', err);
    }
  }

  const BASE = import.meta.env.VITE_API_URL || '/api';
  const token = localStorage.getItem('cb_token');

  function attachmentUrl(filePath) {
    // filePath is relative from server root, serve via static or a dedicated route
    const encoded = encodeURIComponent(filePath);
    return `${BASE}/attachments/file?path=${encoded}&token=${token}`;
  }

  return (
    <div className="border-t border-bear-border bg-bear-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-bear-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-semibold text-bear-text">
            Photo Pages {attachments.length > 0 && <span className="text-bear-muted font-normal">({attachments.length})</span>}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            {uploading ? (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            )}
            Add Images
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 text-bear-muted hover:text-bear-text rounded">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
      />

      {/* Content */}
      <div className="px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <span className="w-5 h-5 border-2 border-bear-accent/30 border-t-bear-accent rounded-full animate-spin" />
          </div>
        ) : attachments.length === 0 ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-bear-border rounded-xl p-6 text-center hover:border-bear-accent/50 hover:bg-bear-accent/5 transition-colors group"
          >
            <svg className="w-8 h-8 text-bear-muted group-hover:text-bear-accent mx-auto mb-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-bear-muted group-hover:text-bear-text transition-colors">
              Tap to add site photos
            </p>
            <p className="text-xs text-bear-muted mt-1">Each image becomes a full page in the PDF</p>
          </button>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {attachments.map((att, idx) => (
              <div key={att.id} className="relative group rounded-xl overflow-hidden border border-bear-border bg-bear-bg">
                {/* Page number badge */}
                <div className="absolute top-2 left-2 z-10 bg-black/60 text-white text-xs rounded-full px-1.5 py-0.5 font-mono">
                  p.{idx + 1}
                </div>
                {/* Delete button */}
                <button
                  onClick={() => handleDelete(att.id)}
                  className="absolute top-2 right-2 z-10 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {/* Thumbnail */}
                <div className="aspect-[4/3] bg-bear-surface flex items-center justify-center overflow-hidden">
                  <img
                    src={`${BASE}/documents/${docId}/attachments/${att.id}/file`}
                    alt={att.original_filename || `Page ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                </div>
                {/* Caption input */}
                <div className="p-2">
                  <input
                    type="text"
                    placeholder="Caption (optional)"
                    defaultValue={att.caption_label || ''}
                    className="w-full text-xs bg-bear-bg border border-bear-border rounded-lg px-2 py-1 text-bear-text placeholder-bear-muted focus:outline-none focus:border-bear-accent"
                    onBlur={e => handleLabelBlur(att.id, e.target.value)}
                  />
                </div>
              </div>
            ))}

            {/* Add more tile */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[4/3] border-2 border-dashed border-bear-border rounded-xl flex flex-col items-center justify-center gap-1 hover:border-bear-accent/50 hover:bg-bear-accent/5 transition-colors group"
            >
              <svg className="w-6 h-6 text-bear-muted group-hover:text-bear-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-xs text-bear-muted">Add more</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
