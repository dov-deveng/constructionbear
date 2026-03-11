import React, { useState, useRef, useEffect } from 'react';

/**
 * ImageUploadSheet — slides up from the bottom of the screen.
 * Shows image thumbnails, lets user write a description, then taps Send.
 * Only then does content enter the chat.
 *
 * Props:
 *   onSend(files, description) — called when user confirms
 *   onClose() — called when user dismisses
 */
export default function ImageUploadSheet({ onSend, onClose }) {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Generate preview URLs when files change
  useEffect(() => {
    const urls = files.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [files]);

  // Auto-focus textarea after files are chosen
  useEffect(() => {
    if (files.length > 0) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [files.length]);

  function handleFilePick(e) {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setFiles(prev => [...prev, ...picked]);
    e.target.value = '';
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSend() {
    if (!files.length && !description.trim()) return;
    setSending(true);
    try {
      await onSend(files, description.trim());
    } finally {
      setSending(false);
    }
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={handleBackdrop}
    >
      <div
        className="bg-[#1C1C1E] rounded-t-[20px] flex flex-col max-h-[85vh] animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
          <span className="text-sm font-semibold text-white">Add to Chat</span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Thumbnail strip */}
        <div className="flex-shrink-0 px-4 py-3">
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
            {previews.map((url, idx) => (
              <div key={idx} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                <img src={url} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removeFile(idx)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                >
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Add more button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-1 hover:border-white/40 hover:bg-white/5 transition-colors"
            >
              <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px] text-white/40">{files.length === 0 ? 'Add photos' : 'More'}</span>
            </button>
          </div>
        </div>

        {/* Description input */}
        <div className="px-4 pb-3 flex-shrink-0">
          <textarea
            ref={textareaRef}
            value={description}
            onChange={e => setDescription(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && (files.length || description.trim())) { e.preventDefault(); handleSend(); } }}
            placeholder={files.length > 0 ? 'Add a description (optional)...' : 'Describe the document or question...'}
            rows={3}
            className="w-full bg-white/8 border border-white/10 rounded-2xl px-4 py-3 text-base text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none leading-relaxed"
            style={{ fontSize: 16, background: 'rgba(255,255,255,0.08)' }}
          />
        </div>

        {/* Send button */}
        <div className="px-4 pb-safe-bottom pb-6 flex-shrink-0" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
          <button
            onClick={handleSend}
            disabled={sending || (!files.length && !description.trim())}
            className="w-full flex items-center justify-center gap-2 bg-[#0A84FF] hover:bg-[#0070E0] rounded-2xl px-4 py-3.5 text-sm font-semibold text-white transition-colors active:scale-[0.98] disabled:opacity-40"
          >
            {sending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4 rotate-90" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
                Send{files.length > 0 ? ` ${files.length} photo${files.length > 1 ? 's' : ''}` : ''}
              </>
            )}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFilePick}
      />
    </div>
  );
}
