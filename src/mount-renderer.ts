import {createRenderer, type ResolvedOptions} from "./create-renderer.js";

const canvasOwners = new WeakMap<HTMLCanvasElement, object>();

// Owns only browser lifecycle; createRenderer owns GPU state. No global context pool.
export const mountRenderer = (canvas: HTMLCanvasElement, fallback: HTMLDivElement, getOptions: () => ResolvedOptions) => {
  const owner = {};
  canvasOwners.set(canvas, owner);
  let renderer: ReturnType<typeof createRenderer> | undefined;
  let frameId = 0;
  let presentationFrameId = 0;
  let previousTime: number | null = null;
  let phase = 2.4;
  let disposed = false;
  let lost = false;
  let failed = false;
  let inView = true;
  let pageActive = true;
  const pointer = {x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, strength: 0, targetStrength: 0};
  const pendingPointer = {x: 0, y: 0, dirty: false, left: false};
  const cleanups: (() => void)[] = [];
  const cancelPresentation = () => {if (presentationFrameId) window.cancelAnimationFrame(presentationFrameId); presentationFrameId = 0;};
  const cancel = () => {if (frameId) window.cancelAnimationFrame(frameId); frameId = 0; cancelPresentation(); previousTime = null;};
  const showFallback = () => {
    if (canvas.style.visibility !== "hidden") canvas.style.visibility = "hidden";
    if (canvas.dataset.renderer !== "fallback") canvas.dataset.renderer = "fallback";
    if (fallback.style.display !== "block") fallback.style.display = "block";
  };
  showFallback();
  const canAnimate = typeof window.requestAnimationFrame === "function" && typeof window.cancelAnimationFrame === "function";
  let motion: MediaQueryList | undefined;
  try {motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");} catch { /* Static is safe if feature detection is denied. */ }
  const reduceMotion = () => !motion || motion.matches;
  const fail = () => {cancel(); renderer?.dispose(); renderer?.releaseContext(); renderer = undefined; failed = true; showFallback();};

  const render = (now: number) => {
    frameId = 0;
    if (disposed || lost || failed || document.hidden || !pageActive || !inView) {previousTime = null; return;}
    const options = getOptions();
    const moving = !options.paused && !reduceMotion();
    const delta = previousTime === null ? 0 : Math.min((now - previousTime) / 1000, 0.08);
    if (moving && previousTime !== null && delta < 1 / 30) {frameId = window.requestAnimationFrame(render); return;}
    cancelPresentation();
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {previousTime = null; return;}
    previousTime = now;
    if (pendingPointer.dirty) {
      pointer.targetX = (pendingPointer.x - rect.left) / rect.width;
      pointer.targetY = 1 - (pendingPointer.y - rect.top) / rect.height;
      pointer.targetStrength = !pendingPointer.left && pointer.targetX >= 0 && pointer.targetX <= 1 && pointer.targetY >= 0 && pointer.targetY <= 1 ? 1 : 0;
      pendingPointer.dirty = false;
    }
    if (moving) {
      phase += delta * options.speed * 0.12;
      pointer.x += (pointer.targetX - pointer.x) * 0.045;
      pointer.y += (pointer.targetY - pointer.y) * 0.045;
      pointer.strength += (pointer.targetStrength - pointer.strength) * 0.04;
    }
    // Keep the same clock/smoothing while invisible, without allocating or drawing GPU work.
    if (options.intensity === 0) {
      showFallback();
      if (moving && options.speed > 0) frameId = window.requestAnimationFrame(render);
      return;
    }
    try {
      renderer ??= createRenderer(canvas);
      const framePointer = {...pointer, strength: options.interactive && !reduceMotion() ? pointer.strength : 0};
      if (!renderer.draw(options, phase, framePointer, rect)) {
        lost = true; showFallback(); return;
      }
      // Do not remove the SSR/static decoration until a real frame has been drawn.
      if (canvas.style.visibility !== "visible") canvas.style.visibility = "visible";
      if (canvas.dataset.renderer !== "webgl") canvas.dataset.renderer = "webgl";
      if (fallback.style.display !== "none") fallback.style.display = "none";
      if (!moving || options.speed === 0) {
        const frameRenderer = renderer; const framePhase = phase;
        // Some compositors present the previous buffer. Replay a still image once,
        // without advancing simulation time or pointer smoothing, then go idle.
        presentationFrameId = window.requestAnimationFrame(() => {
          presentationFrameId = 0;
          if (disposed || lost || failed || document.hidden || !pageActive || !inView || renderer !== frameRenderer || getOptions().intensity === 0) return;
          try {
            if (!frameRenderer.draw(options, framePhase, framePointer, rect)) {lost = true; cancel(); showFallback();}
          } catch {fail();}
        });
      }
    } catch {fail(); return;}
    if (moving && options.speed > 0) frameId = window.requestAnimationFrame(render);
  };
  const invalidate = () => {
    if (!disposed && !lost && !failed && !frameId && canAnimate) frameId = window.requestAnimationFrame(render);
  };
  const listen = (target: EventTarget, event: string, callback: EventListener, options?: AddEventListenerOptions) => {
    target.addEventListener(event, callback, options);
    cleanups.push(() => target.removeEventListener(event, callback, options));
  };
  const resume = () => {cancel(); invalidate();};
  listen(canvas, "webglcontextlost", event => {
    event.preventDefault(); lost = true; cancel(); showFallback();
  });
  listen(canvas, "webglcontextrestored", () => {
    // All resources and uniform locations from the old context are invalid.
    renderer?.dispose(); renderer = undefined; lost = false; failed = false; resume();
  });
  listen(document, "pointermove", event => {
    const {interactive, paused} = getOptions();
    const pointerEvent = event as PointerEvent;
    if (!interactive || paused || reduceMotion() || pointerEvent.pointerType === "touch") return;
    pendingPointer.x = pointerEvent.clientX; pendingPointer.y = pointerEvent.clientY; pendingPointer.dirty = true; pendingPointer.left = false;
    if (inView && pageActive && !document.hidden) invalidate();
  }, {passive: true});
  listen(document, "pointerleave", () => {
    // Preserve the last move's target while its influence decays after leaving.
    pendingPointer.left = true; pointer.targetStrength = 0;
    if (inView && pageActive && !document.hidden) invalidate();
  });
  listen(document, "visibilitychange", resume);
  listen(window, "pageshow", () => {pageActive = true; resume();});
  listen(window, "pagehide", () => {pageActive = false; cancel();});
  listen(window, "resize", resume, {passive: true});
  listen(window, "orientationchange", resume, {passive: true});
  if (motion?.addEventListener) listen(motion, "change", resume);
  else if (motion?.addListener) {motion.addListener(resume); cleanups.push(() => motion?.removeListener(resume));}

  if (typeof ResizeObserver === "function") {
    try {const observer = new ResizeObserver(resume); observer.observe(canvas); cleanups.push(() => observer.disconnect());} catch { /* Window resize remains available. */ }
  }
  if (typeof IntersectionObserver === "function") {
    try {
      const observer = new IntersectionObserver(([entry]) => {inView = entry.isIntersecting; resume();});
      observer.observe(canvas); cleanups.push(() => observer.disconnect());
      const rect = canvas.getBoundingClientRect();
      inView = rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
    } catch {motion = undefined; /* A single static frame avoids an uncontrolled off-screen loop. */ }
  } else {
    // Without observers, a static WebGL frame is safer than polling every instance.
    motion = undefined;
  }
  // A paused instance still needs to follow DPR changes when moving between displays.
  let dprCleanup = () => {};
  const watchDpr = () => {
    dprCleanup();
    try {
      const media = window.matchMedia?.(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      if (!media?.addEventListener) return;
      const change = () => {watchDpr(); resume();};
      media.addEventListener("change", change);
      dprCleanup = () => media.removeEventListener("change", change);
    } catch { /* resize/orientation events still redraw at the current DPR. */ }
  };
  watchDpr();
  invalidate();
  return {
    invalidate,
    dispose() {
      disposed = true; cancel(); cleanups.forEach(cleanup => cleanup()); dprCleanup();
      const retired = renderer;
      retired?.dispose(); renderer = undefined; showFallback();
      // Release detached canvases, but keep a retained DOM node reusable after
      // Strict Mode replay or a later React effect reconnection.
      void Promise.resolve().then(() => {
        if (canvasOwners.get(canvas) === owner) {
          canvasOwners.delete(canvas);
          if (!canvas.isConnected) retired?.releaseContext();
        }
      });
    },
  };
};
