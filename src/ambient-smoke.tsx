"use client";

import {useEffect, useRef} from "react";
import {anchors} from "./geometry.js";
import {mountRenderer} from "./mount-renderer.js";
import {resolveOptions} from "./resolve-options.js";
import type {AmbientSmokeProps} from "./types.js";

const sameOptions = (left: ReturnType<typeof resolveOptions>, right: ReturnType<typeof resolveOptions>) =>
  left.variant === right.variant && left.position === right.position && left.theme === right.theme &&
  left.intensity === right.intensity && left.speed === right.speed && left.spread === right.spread &&
  left.grain === right.grain && left.interactive === right.interactive && left.paused === right.paused &&
  left.renderMode === right.renderMode && left.colors.length === right.colors.length &&
  left.colors.every((color, index) => color === right.colors[index]);

/** Place before content inside a positioned, isolated container. */
export const AmbientSmoke = (props: AmbientSmokeProps) => {
  const {className} = props;
  const resolved = resolveOptions(props);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef(resolved);
  const rendererRef = useRef<ReturnType<typeof mountRenderer> | null>(null);
  useEffect(() => {
    const changed = !sameOptions(optionsRef.current, resolved);
    optionsRef.current = resolved;
    if (changed) rendererRef.current?.invalidate();
  }, [resolved]);
  useEffect(() => {
    const canvas = canvasRef.current;
    const fallback = fallbackRef.current;
    if (!canvas || !fallback) return;
    if (resolved.renderMode === "static") {canvas.dataset.renderer = "fallback"; return;}
    const renderer = mountRenderer(canvas, fallback, () => optionsRef.current);
    rendererRef.current = renderer;
    return () => {renderer.dispose(); rendererRef.current = null;};
  }, [resolved.renderMode]);

  const {position, colors, intensity, spread} = resolved;
  const anchor = anchors[position];
  const origin = `${anchor[0] * 100}% ${(1 - anchor[1]) * 100}%`;
  const edgeMask = `radial-gradient(ellipse at ${origin}, black, transparent ${spread * 80}%)`;
  const centerMask = "radial-gradient(ellipse at center, transparent 13%, black 38%)";
  const stops = colors.map((color, index) => `${color}99 ${index * 48 / colors.length}%`).join(", ");
  return (
    <div aria-hidden="true" className={className} style={{position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden", borderRadius: "inherit"}}>
      <div ref={fallbackRef} style={{position: "absolute", inset: 0, opacity: intensity, maskImage: centerMask, WebkitMaskImage: centerMask}}>
        <div style={{position: "absolute", inset: 0, background: `radial-gradient(ellipse at ${origin}, ${stops}, transparent 66%)`, maskImage: edgeMask, WebkitMaskImage: edgeMask}} />
      </div>
      <canvas key={resolved.renderMode} ref={canvasRef} style={{width: "100%", height: "100%", display: "block", visibility: "hidden"}} />
    </div>
  );
};
