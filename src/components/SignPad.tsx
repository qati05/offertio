"use client";

import { useRef, useState, useCallback } from "react";

interface Props {
  onDraw: (path: string) => void;
  onClear?: () => void;
}

export default function SignPad({ onDraw, onClear }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [path, setPath] = useState("");

  const getPoint = useCallback((e: React.MouseEvent | React.TouchEvent): [number, number] => {
    const rect = svgRef.current!.getBoundingClientRect();
    const touch = "touches" in e ? e.touches[0] : null;
    const clientX = touch ? touch.clientX : (e as React.MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (e as React.MouseEvent).clientY;
    // Scale to the SVG viewBox (600×160)
    const scaleX = 600 / rect.width;
    const scaleY = 160 / rect.height;
    return [(clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY];
  }, []);

  const start = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDrawing(true);
    const [x, y] = getPoint(e);
    const newPath = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    setPath(newPath);
  }, [getPoint]);

  const move = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const [x, y] = getPoint(e);
    setPath((p) => {
      const updated = `${p} L ${x.toFixed(1)} ${y.toFixed(1)}`;
      return updated;
    });
  }, [drawing, getPoint]);

  const end = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);
    setPath((p) => {
      onDraw(p);
      return p;
    });
  }, [drawing, onDraw]);

  const clear = useCallback(() => {
    setPath("");
    onDraw("");
    onClear?.();
  }, [onDraw, onClear]);

  return (
    <div className="sign-pad-root">
      <div
        style={{
          position: "relative",
          borderRadius: "10px",
          overflow: "hidden",
          border: "1.5px solid rgba(26,25,22,0.12)",
          background: "#FAFAF8",
          cursor: "crosshair",
          userSelect: "none",
          touchAction: "none",
        }}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 600 160"
          preserveAspectRatio="none"
          style={{ display: "block", width: "100%", height: "120px" }}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        >
          {/* baseline */}
          <line x1="20" y1="128" x2="580" y2="128" stroke="rgba(26,25,22,0.1)" strokeWidth="1" strokeDasharray="4 4" />
          <path
            d={path}
            stroke="#1A1916"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {!path && (
          <div
            style={{
              position: "absolute",
              bottom: "18px",
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: "12px",
              color: "rgba(26,25,22,0.35)",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            Hier unterschreiben
          </div>
        )}
      </div>
      {path && (
        <button
          type="button"
          onClick={clear}
          style={{
            marginTop: "8px",
            fontSize: "12px",
            color: "rgba(26,25,22,0.5)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 0",
          }}
        >
          Löschen
        </button>
      )}
    </div>
  );
}
