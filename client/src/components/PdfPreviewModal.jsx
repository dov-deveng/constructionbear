import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * PdfPreviewModal — full-screen in-app PDF viewer.
 *
 * Props:
 *   pdfUrl {string}   — full URL to the PDF (authenticated fetch done inside)
 *   filename {string} — used for download/share
 *   onClose()         — called to dismiss
 */
export default function PdfPreviewModal({ pdfUrl, filename, onClose }) {
  const containerRef = useRef(null);
  const [pages, setPages] = useState([]);       // array of { canvas, pageNum }
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(1);
  const [sharing, setSharing] = useState(false);
  const pdfDocRef = useRef(null);
  const renderTasksRef = useRef([]);

  // Load PDF.js lazily to keep initial bundle small
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // Fetch the PDF bytes with auth token
        const token = localStorage.getItem('cb_token');
        const res = await fetch(pdfUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Failed to load PDF');
        const arrayBuffer = await res.arrayBuffer();

        // Dynamically import PDF.js (splits it from main bundle)
        const pdfjsLib = await import('pdfjs-dist');
        // Point worker to CDN — avoids bundler complications
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) return;

        pdfDocRef.current = pdfDoc;
        setTotalPages(pdfDoc.numPages);

        // Render all pages sequentially into canvas elements
        const rendered = [];
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          if (cancelled) break;
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 2 }); // 2× for sharpness on retina

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          const ctx = canvas.getContext('2d');
          const task = page.render({ canvasContext: ctx, viewport });
          renderTasksRef.current.push(task);
          await task.promise;

          rendered.push({ canvas, pageNum: i, width: viewport.width, height: viewport.height });
        }

        if (!cancelled) {
          setPages(rendered);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('PDF load error:', err);
          setError('Could not load PDF. Please try downloading instead.');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      renderTasksRef.current.forEach(t => t.cancel?.());
    };
  }, [pdfUrl]);

  // Track current page via IntersectionObserver on each canvas wrapper
  useEffect(() => {
    if (!pages.length || !containerRef.current) return;
    const observers = [];
    const wrappers = containerRef.current.querySelectorAll('[data-page]');
    wrappers.forEach(el => {
      const obs = new IntersectionObserver(
        entries => {
          entries.forEach(e => {
            if (e.isIntersecting) setCurrentPage(Number(el.dataset.page));
          });
        },
        { root: containerRef.current, threshold: 0.5 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [pages]);

  async function handleDownload() {
    try {
      const token = localStorage.getItem('cb_token');
      const res = await fetch(pdfUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await res.blob();

      // Mobile: try native share sheet first; fall back to direct download
      if (navigator.share && navigator.canShare?.({ files: [new File([blob], filename || 'document.pdf', { type: 'application/pdf' })] })) {
        const file = new File([blob], filename || 'document.pdf', { type: 'application/pdf' });
        await navigator.share({ files: [file], title: filename || 'Document' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'document.pdf';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Download error:', err);
    }
  }

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    try {
      const token = localStorage.getItem('cb_token');
      const res = await fetch(pdfUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await res.blob();
      const file = new File([blob], filename || 'document.pdf', { type: 'application/pdf' });

      if (navigator.share) {
        await navigator.share({
          title: filename || 'Document',
          files: [file],
        });
      } else {
        // Desktop fallback: copy URL or just trigger download
        await handleDownload();
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Share error:', err);
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#111] flex flex-col">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 pt-safe-top py-3 bg-black/80 backdrop-blur-sm border-b border-white/10"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex-1 text-center px-3">
          <p className="text-sm font-semibold text-white truncate">{filename || 'Document'}</p>
          {totalPages > 1 && !loading && (
            <p className="text-xs text-white/50">{currentPage} of {totalPages}</p>
          )}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
            className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg text-lg font-light"
          >−</button>
          <span className="text-xs text-white/40 w-10 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(s => Math.min(3, s + 0.25))}
            className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg text-lg font-light"
          >+</button>
        </div>
      </div>

      {/* PDF canvas area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-auto"
        style={{ background: '#1a1a1a' }}
      >
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-sm text-white/50">Rendering PDF…</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
            <svg className="w-12 h-12 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm text-white/50">{error}</p>
            <button onClick={handleDownload} className="text-sm text-[#0A84FF] font-semibold">
              Download instead
            </button>
          </div>
        )}

        {!loading && !error && pages.length > 0 && (
          <div className="flex flex-col items-center gap-4 py-4 px-4 min-h-full">
            {pages.map(({ canvas, pageNum, width, height }) => (
              <div
                key={pageNum}
                data-page={pageNum}
                className="shadow-2xl rounded overflow-hidden flex-shrink-0"
                style={{
                  width: `min(${width / 2 * scale}px, calc(100vw - 32px))`,
                  aspectRatio: `${width} / ${height}`,
                  transformOrigin: 'top center',
                }}
              >
                <canvas
                  ref={el => { if (el && !el._attached) { el._attached = true; el.parentNode.replaceChild(canvas, el); } }}
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />
                {/* Replace placeholder with real canvas */}
                <CanvasMount canvas={canvas} scale={scale} naturalWidth={width} naturalHeight={height} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div
        className="flex-shrink-0 bg-black/80 backdrop-blur-sm border-t border-white/10 flex items-center gap-3 px-4 py-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        {/* Share */}
        <button
          onClick={handleShare}
          disabled={loading || sharing}
          className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 rounded-2xl py-3 text-sm font-medium text-white transition-colors disabled:opacity-40"
        >
          {sharing ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          )}
          Share
        </button>

        {/* Download */}
        <button
          onClick={handleDownload}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-[#0A84FF] hover:bg-[#0070E0] rounded-2xl py-3 text-sm font-semibold text-white transition-colors disabled:opacity-40"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </button>
      </div>
    </div>
  );
}

// Mounts the real canvas element into a React-managed div
function CanvasMount({ canvas, scale, naturalWidth, naturalHeight }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !canvas) return;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    el.innerHTML = '';
    el.appendChild(canvas);
  }, [canvas, scale]);

  return (
    <div
      ref={ref}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
