import React, { useRef, useState, useEffect } from 'react';

const TOOLS = [
  { id: 'highlight', label: 'Highlight', cursor: 'crosshair' },
  { id: 'draw',      label: 'Draw',      cursor: 'crosshair' },
  { id: 'text',      label: 'Text',      cursor: 'text' },
];

const VIEWER_HEIGHT = 480;

export default function ChatFileViewer({ url, filename, mimetype }) {
  const [tool, setTool]               = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [isDrawing, setIsDrawing]     = useState(false);
  const [current, setCurrent]         = useState(null);
  const [pendingText, setPendingText] = useState(null); // { x, y }
  const [textInput, setTextInput]     = useState('');
  const canvasRef   = useRef(null);
  const containerRef = useRef(null);

  const isPDF   = mimetype === 'application/pdf';
  const isImage = mimetype?.startsWith('image/');
  const isWord  = mimetype?.includes('word') || mimetype?.includes('document');

  // Sync canvas size to container width
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const observer = new ResizeObserver(() => {
      canvas.width  = container.offsetWidth;
      canvas.height = VIEWER_HEIGHT;
      redraw(annotations, current);
    });
    observer.observe(container);
    canvas.width  = container.offsetWidth;
    canvas.height = VIEWER_HEIGHT;
    return () => observer.disconnect();
  }, []); // eslint-disable-line

  // Redraw whenever annotations or in-progress annotation changes
  useEffect(() => { redraw(annotations, current); }, [annotations, current]);

  function redraw(anns, inProgress) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const a of anns) {
      if (a.type === 'highlight') {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.38)';
        ctx.fillRect(a.x, a.y, a.w, a.h);
        ctx.strokeStyle = 'rgba(200, 140, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(a.x, a.y, a.w, a.h);
      } else if (a.type === 'draw') {
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.85)';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap  = 'round';
        ctx.beginPath();
        a.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();
      } else if (a.type === 'text') {
        ctx.font      = 'bold 13px sans-serif';
        ctx.fillStyle = 'rgba(37, 99, 235, 0.9)';
        ctx.fillText(a.text, a.x, a.y);
      }
    }

    // In-progress highlight preview
    if (inProgress?.type === 'highlight') {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
      ctx.fillRect(inProgress.x, inProgress.y, inProgress.w, inProgress.h);
    }
  }

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handleMouseDown(e) {
    if (!tool) return;
    const pos = getPos(e);
    if (tool === 'highlight') {
      setIsDrawing(true);
      setCurrent({ type: 'highlight', x: pos.x, y: pos.y, w: 0, h: 0 });
    } else if (tool === 'draw') {
      setIsDrawing(true);
      setCurrent({ type: 'draw', points: [pos] });
    } else if (tool === 'text') {
      setPendingText(pos);
      setTextInput('');
    }
  }

  function handleMouseMove(e) {
    if (!isDrawing || !current) return;
    const pos = getPos(e);
    if (current.type === 'highlight') {
      setCurrent(c => ({ ...c, w: pos.x - c.x, h: pos.y - c.y }));
    } else if (current.type === 'draw') {
      setCurrent(c => ({ ...c, points: [...c.points, pos] }));
    }
  }

  function handleMouseUp() {
    if (!isDrawing || !current) return;
    setIsDrawing(false);
    if (current.type === 'highlight' && (Math.abs(current.w) > 4 || Math.abs(current.h) > 4)) {
      setAnnotations(a => [...a, current]);
    } else if (current.type === 'draw' && current.points.length > 1) {
      setAnnotations(a => [...a, current]);
    }
    setCurrent(null);
  }

  function submitText() {
    if (textInput.trim() && pendingText) {
      setAnnotations(a => [...a, { type: 'text', x: pendingText.x, y: pendingText.y, text: textInput.trim() }]);
    }
    setPendingText(null);
    setTextInput('');
  }

  return (
    <div className="rounded-xl overflow-hidden border border-bear-border bg-bear-surface w-full max-w-sm">
      {/* File header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-bear-border">
        <svg className="w-4 h-4 text-bear-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-xs font-medium text-bear-text flex-1 truncate">{filename}</span>
        <span className="text-[10px] text-bear-muted uppercase font-semibold">
          {isPDF ? 'PDF' : isWord ? 'DOCX' : isImage ? 'IMG' : 'File'}
        </span>
      </div>

      {/* Markup toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-bear-border bg-bear-bg flex-wrap">
        <span className="text-[10px] text-bear-muted mr-1 font-medium">Markup:</span>
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => setTool(tool === t.id ? null : t.id)}
            className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
              tool === t.id
                ? 'bg-bear-accent text-white'
                : 'text-bear-muted hover:text-bear-text bg-bear-surface hover:bg-bear-border/50'
            }`}
          >
            {t.label}
          </button>
        ))}
        {annotations.length > 0 && (
          <button
            onClick={() => setAnnotations([])}
            className="text-[10px] px-2 py-0.5 rounded text-red-400 hover:bg-red-400/10 transition-colors ml-auto"
          >
            Clear
          </button>
        )}
      </div>

      {/* Content + canvas overlay */}
      <div ref={containerRef} className="relative" style={{ height: VIEWER_HEIGHT }}>
        {isPDF && (
          <iframe
            src={url}
            className="w-full h-full border-0"
            title={filename}
          />
        )}
        {isImage && (
          <img src={url} className="w-full h-full object-contain" alt={filename} />
        )}
        {isWord && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-bear-text">{filename}</p>
            <p className="text-xs text-bear-muted mt-1">Word document attached — Bear will use it as the base.</p>
            <p className="text-[10px] text-bear-muted mt-1">Markup tools are available for PDFs and images.</p>
          </div>
        )}
        {!isPDF && !isImage && !isWord && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-bear-muted">{filename}</p>
          </div>
        )}

        {/* Canvas markup overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{
            pointerEvents: tool ? 'all' : 'none',
            cursor: tool ? TOOLS.find(t => t.id === tool)?.cursor : 'default',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />

        {/* Text annotation input popup */}
        {pendingText && (
          <div
            className="absolute z-10 bg-bear-surface border border-bear-accent rounded-lg shadow-lg p-2 flex gap-1.5 items-center"
            style={{ left: Math.min(pendingText.x, (containerRef.current?.offsetWidth || 400) - 220), top: pendingText.y }}
          >
            <input
              autoFocus
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitText(); if (e.key === 'Escape') setPendingText(null); }}
              placeholder="Type annotation..."
              className="text-xs bg-transparent outline-none text-bear-text w-36"
            />
            <button onClick={submitText} className="text-xs text-bear-accent font-semibold">Add</button>
          </div>
        )}
      </div>

      {/* Tool hint */}
      {tool && (
        <div className="px-3 py-1.5 bg-bear-bg border-t border-bear-border">
          <p className="text-[10px] text-bear-muted">
            {tool === 'highlight' ? 'Drag to highlight an area'
              : tool === 'draw' ? 'Drag to draw freehand'
              : 'Click to place a text annotation — Enter to confirm'}
          </p>
        </div>
      )}
    </div>
  );
}
