import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * ImageMarkupEditor — full-screen canvas markup tool.
 * Opens when user taps a thumbnail in ImageUploadSheet.
 *
 * Tools: Draw (freehand), Arrow, Text, Erase
 * Markup is baked into the image blob on Done.
 * Cancel discards all markup.
 *
 * Props:
 *   src {string} — object URL of the image
 *   onDone(blob) — called with marked-up image blob
 *   onCancel() — discard markup
 */
export default function ImageMarkupEditor({ src, onDone, onCancel }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('draw'); // draw | arrow | text | erase
  const [color, setColor] = useState('#FF3B30');
  const [thickness, setThickness] = useState(4);
  const [drawing, setDrawing] = useState(false);
  const [startPt, setStartPt] = useState(null);
  const [history, setHistory] = useState([]); // array of ImageData snapshots
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState(null); // {x, y} — pending text placement
  const imgRef = useRef(null);
  const overlayCtxRef = useRef(null); // used for arrow preview

  // Load image into canvas
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      saveHistory(ctx, canvas);
    };
    img.src = src;
  }, [src]);

  function saveHistory(ctx, canvas) {
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev, snapshot]);
  }

  function undo() {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
  }

  // Convert mouse/touch event to canvas coordinates
  function getCanvasPoint(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function setupCtx(ctx) {
    ctx.strokeStyle = tool === 'erase' ? '#000' : color;
    ctx.lineWidth = tool === 'erase' ? thickness * 5 : thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (tool === 'erase') ctx.globalCompositeOperation = 'destination-out';
    else ctx.globalCompositeOperation = 'source-over';
  }

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    if (tool === 'text') {
      const pt = getCanvasPoint(e);
      setTextPos(pt);
      setTextInput('');
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pt = getCanvasPoint(e);
    setStartPt(pt);
    setDrawing(true);
    if (tool === 'draw' || tool === 'erase') {
      setupCtx(ctx);
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
    }
  }, [tool, color, thickness]);

  const handlePointerMove = useCallback((e) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pt = getCanvasPoint(e);
    if (tool === 'draw' || tool === 'erase') {
      setupCtx(ctx);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    } else if (tool === 'arrow') {
      // Restore last saved state then draw preview arrow
      if (history.length) ctx.putImageData(history[history.length - 1], 0, 0);
      drawArrow(ctx, startPt, pt);
    }
  }, [drawing, tool, color, thickness, history, startPt]);

  const handlePointerUp = useCallback((e) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (tool === 'arrow') {
      const pt = getCanvasPoint(e);
      if (history.length) ctx.putImageData(history[history.length - 1], 0, 0);
      drawArrow(ctx, startPt, pt);
    }
    setDrawing(false);
    setStartPt(null);
    saveHistory(ctx, canvas);
  }, [drawing, tool, startPt, history]);

  function drawArrow(ctx, from, to) {
    if (!from || !to) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len < 2) return;

    // Line
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Arrowhead
    const headLen = Math.max(16, thickness * 4);
    const angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headLen * Math.cos(angle - Math.PI / 7), to.y - headLen * Math.sin(angle - Math.PI / 7));
    ctx.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 7), to.y - headLen * Math.sin(angle + Math.PI / 7));
    ctx.closePath();
    ctx.fill();
  }

  function commitText() {
    if (!textPos || !textInput.trim()) { setTextPos(null); return; }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = color;
    const fontSize = Math.max(24, thickness * 8);
    ctx.font = `bold ${fontSize}px -apple-system, sans-serif`;
    ctx.fillText(textInput, textPos.x, textPos.y);
    setTextPos(null);
    setTextInput('');
    saveHistory(ctx, canvas);
  }

  async function handleDone() {
    // Dismiss any pending text first
    if (textPos && textInput.trim()) commitText();
    const canvas = canvasRef.current;
    canvas.toBlob(blob => { if (blob) onDone(blob); }, 'image/jpeg', 0.92);
  }

  const COLORS = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#FFFFFF', '#000000'];
  const TOOLS = [
    { id: 'draw', label: 'Draw', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
    { id: 'arrow', label: 'Arrow', icon: 'M17 8l4 4m0 0l-4 4m4-4H3' },
    { id: 'text', label: 'Text', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
    { id: 'erase', label: 'Erase', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' },
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 pt-safe-top pt-4 pb-3 flex-shrink-0 bg-black/80 backdrop-blur-sm">
        <button onClick={onCancel} className="text-white/70 hover:text-white text-sm font-medium px-2 py-1">Cancel</button>
        <div className="flex items-center gap-3">
          {/* Undo */}
          <button
            onClick={undo}
            disabled={history.length <= 1}
            className="w-8 h-8 flex items-center justify-center text-white/60 disabled:text-white/20 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6" />
            </svg>
          </button>
        </div>
        <button onClick={handleDone} className="text-[#0A84FF] font-semibold text-sm px-2 py-1">Done</button>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-[#111]">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain touch-none"
          style={{ cursor: tool === 'text' ? 'text' : tool === 'erase' ? 'cell' : 'crosshair' }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />

        {/* Floating text input */}
        {textPos && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40" onClick={() => setTextPos(null)}>
            <div className="bg-[#1C1C1E] rounded-2xl p-4 mx-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <p className="text-white/60 text-xs mb-2">Type text — tap Confirm to place on image</p>
              <input
                type="text"
                autoFocus
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitText(); }}
                className="w-full bg-white/10 text-white rounded-xl px-3 py-2 text-base focus:outline-none"
                style={{ fontSize: 16 }}
                placeholder="Enter text..."
              />
              <div className="flex gap-2 mt-3">
                <button onClick={() => setTextPos(null)} className="flex-1 text-sm text-white/50 py-2">Cancel</button>
                <button onClick={commitText} className="flex-1 text-sm text-[#0A84FF] font-semibold py-2">Confirm</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="flex-shrink-0 bg-black/80 backdrop-blur-sm px-4 pb-safe-bottom pb-6 pt-3" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
        {/* Tool picker */}
        <div className="flex items-center justify-center gap-4 mb-4">
          {TOOLS.map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
                tool === t.id ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
              </svg>
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Color + thickness row */}
        <div className="flex items-center gap-3 justify-center">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="rounded-full transition-transform"
              style={{
                width: color === c ? 28 : 22,
                height: color === c ? 28 : 22,
                background: c,
                border: color === c ? '3px solid white' : '2px solid rgba(255,255,255,0.2)',
                transform: color === c ? 'scale(1.1)' : 'scale(1)',
              }}
            />
          ))}
          <div className="ml-2 flex items-center gap-1">
            <button
              onClick={() => setThickness(t => Math.max(1, t - 1))}
              className="w-7 h-7 rounded-full bg-white/10 text-white text-sm flex items-center justify-center"
            >−</button>
            <span className="text-white/60 text-xs w-4 text-center">{thickness}</span>
            <button
              onClick={() => setThickness(t => Math.min(20, t + 1))}
              className="w-7 h-7 rounded-full bg-white/10 text-white text-sm flex items-center justify-center"
            >+</button>
          </div>
        </div>
      </div>
    </div>
  );
}
