import assert from "node:assert/strict";
import {afterEach, before, test} from "node:test";
import {JSDOM} from "jsdom";
import {act, cleanup, render} from "@testing-library/react";
import {StrictMode} from "react";

import {Atmos} from "../src/index.js";
import {mountRenderer} from "../src/mount-renderer.js";
import {resolveOptions} from "../src/resolve-options.js";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {pretendToBeVisual: true});
const frames = new Map<number, FrameRequestCallback>();
let nextFrame = 0;
let draws = 0;
let deletedPrograms = 0;
let reducedMotion = false;
let webglAvailable = true;
let contextThrows = false;
let compileSucceeds = true;
let linkSucceeds = true;
let bufferAvailable = true;
let drawThrows = false;
let notifyResize: () => void;
let notifyMotion: () => void;
let notifyDpr: () => void;
let contextRequests = 0;
let releasedContexts = 0;
let context: ReturnType<typeof createContext>;
let notifyIntersection: (inView: boolean) => void;
const uniformWrites: string[] = [];
const uniformValues = new Map<string, number[]>();
const recordUniform = (location: {name: string}, ...values: number[]) => {uniformWrites.push(location.name); uniformValues.set(location.name, values);};

const createContext = () => ({
  VERTEX_SHADER: 35633, FRAGMENT_SHADER: 35632, COMPILE_STATUS: 35713, LINK_STATUS: 35714,
  ARRAY_BUFFER: 34962, STATIC_DRAW: 35044, FLOAT: 5126, TRIANGLES: 4,
  BLEND: 3042, DEPTH_TEST: 2929, COLOR_BUFFER_BIT: 16384,
  disable: () => undefined, clearColor: () => undefined, clear: () => undefined,
  isContextLost: () => false,
  getExtension: () => ({loseContext: () => {releasedContexts += 1;}}),
  createProgram: () => ({}), createShader: () => ({}), createBuffer: () => bufferAvailable ? {} : null,
  getAttribLocation: () => 0, getUniformLocation: (_program: unknown, name: string) => ({name}),
  getShaderParameter: () => compileSucceeds, getProgramParameter: () => linkSucceeds,
  getShaderInfoLog: () => "Test shader failure",
  shaderSource: () => undefined, compileShader: () => undefined, attachShader: () => undefined,
  linkProgram: () => undefined, useProgram: () => undefined, bindBuffer: () => undefined,
  bufferData: () => undefined, enableVertexAttribArray: () => undefined, vertexAttribPointer: () => undefined,
  viewport: () => undefined, uniform1f: recordUniform, uniform2f: recordUniform,
  uniform2fv: (location: {name: string}, values: number[]) => recordUniform(location, ...values), uniform1i: recordUniform,
  uniform3fv: (location: {name: string}, values: Float32Array) => recordUniform(location, ...values),
  deleteBuffer: () => undefined, deleteShader: () => undefined,
  deleteProgram: () => {deletedPrograms += 1;}, drawArrays: () => {if (drawThrows) throw new Error("Driver draw failure"); draws += 1;},
});

before(() => {
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    requestAnimationFrame: (callback: FrameRequestCallback) => {const id = ++nextFrame; frames.set(id, callback); return id;},
    cancelAnimationFrame: (id: number) => {frames.delete(id);},
    ResizeObserver: class {constructor(callback: () => void) {notifyResize = callback;} observe() {} disconnect() {}},
	    IntersectionObserver: class {
      constructor(callback: IntersectionObserverCallback) {
        notifyIntersection = (inView) => callback([{isIntersecting: inView} as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      observe() {} disconnect() {}
    },
  });
  dom.window.requestAnimationFrame = globalThis.requestAnimationFrame;
  dom.window.cancelAnimationFrame = globalThis.cancelAnimationFrame;
  Object.defineProperty(dom.window, "matchMedia", {configurable: true, value: (query: string) => ({get matches() {return reducedMotion;}, addEventListener(_event: string, callback: () => void) {if (query.includes("reduced-motion")) notifyMotion = callback; else if (query.includes("resolution")) notifyDpr = callback;}, removeEventListener() {}})});
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, "getContext", {value: () => {contextRequests += 1; if (contextThrows) throw new Error("Context denied"); return webglAvailable ? context : null;}});
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, "getBoundingClientRect", {writable: true, value: () => ({x: 0, y: 0, left: 0, top: 0, right: 640, bottom: 360, width: 640, height: 360})});
});

afterEach(() => {
  cleanup(); frames.clear(); draws = 0; reducedMotion = false; webglAvailable = true;
  contextThrows = false; compileSucceeds = true; linkSucceeds = true; bufferAvailable = true; drawThrows = false;
  uniformWrites.length = 0; uniformValues.clear();
  Object.defineProperty(dom.window.document, "hidden", {value: false, configurable: true});
});

const flushFrame = async (time = 100) => {
  const callbacks = [...frames.values()];
  frames.clear();
  await act(async () => {for (const callback of callbacks) callback(time);});
};

test("a still update replays its exact frame once for compositors that present a draw late", async () => {
  context = createContext();
  render(<Atmos speed={0} />);
  await flushFrame(100); await flushFrame(116);
  assert.equal(frames.size, 0);
  await act(async () => {document.dispatchEvent(new dom.window.MouseEvent("pointermove", {clientX: 640, clientY: 180}));});
  await flushFrame(140);
  const phase = uniformValues.get("u_time")!.slice();
  const point = uniformValues.get("u_pointer")!.slice();
  const strength = uniformValues.get("u_pointerStrength")!.slice();
  const count = draws;
  assert.equal(frames.size, 1);
  await flushFrame(156);
  assert.equal(draws, count + 1);
  assert.deepEqual(uniformValues.get("u_time"), phase);
  assert.deepEqual(uniformValues.get("u_pointer"), point);
  assert.deepEqual(uniformValues.get("u_pointerStrength"), strength);
  assert.equal(frames.size, 0);
});

test("equivalent normalized props do not redraw a paused decoration", async () => {
  context = createContext();
  const {rerender} = render(<Atmos paused colors={["#abc", "#123456"]} intensity={2} />);
  await flushFrame(); await flushFrame(116);
  rerender(<Atmos paused colors={["#aabbcc", "#123456"]} intensity={1} className="changed-wrapper" />);
  await flushFrame(200);
  assert.equal(draws, 2);
});

test("animated frames retain GPU configuration until props change and reupload after restoration", async () => {
  context = createContext();
  const {container, rerender} = render(<Atmos colors={["#ff0000", "#00ff00"]} />);
  await flushFrame();
  assert.ok(uniformWrites.includes("u_colors[0]"));
  uniformWrites.length = 0;
  await flushFrame(140);
  assert.deepEqual(uniformWrites.sort(), ["u_pointer", "u_pointerStrength", "u_time"]);
  rerender(<Atmos colors={["#0000ff", "#ffffff"]} position="top-right" theme="light" />);
  await flushFrame(180);
  assert.deepEqual(uniformValues.get("u_colors[0]")?.slice(0,6), [0,0,1,1,1,1]);
  assert.deepEqual(uniformValues.get("u_anchor"), [1,1]);
  assert.deepEqual(uniformValues.get("u_light"), [1]);
  const canvas = container.querySelector("canvas")!;
  await act(async () => {canvas.dispatchEvent(new dom.window.Event("webglcontextlost", {cancelable: true})); canvas.dispatchEvent(new dom.window.Event("webglcontextrestored"));});
  uniformWrites.length = 0;
  await flushFrame(220);
  assert.ok(uniformWrites.includes("u_colors[0]"));
  assert.ok(uniformWrites.includes("u_anchor"));
  assert.ok(uniformWrites.includes("u_resolution"));
});

test("zero intensity allocates no context but preserves phase when made visible", async () => {
  context = createContext();
  const before = contextRequests;
  const {rerender, container} = render(<Atmos intensity={0} speed={1} />);
  await flushFrame(100); await flushFrame(140);
  assert.equal(contextRequests, before);
  assert.equal(draws, 0);
  rerender(<Atmos intensity={1} speed={1} />);
  await flushFrame(180);
  assert.equal(draws, 1);
  assert.ok(Math.abs(uniformValues.get("u_time")![0] - 2.4096) < 0.000001);
  rerender(<Atmos intensity={0} speed={1} />);
  await flushFrame(220);
  assert.equal(draws, 1);
  assert.equal(container.querySelector("canvas")?.style.visibility, "hidden");
});

test("skipped frames and pointer bursts do not repeatedly measure layout", async () => {
  context = createContext();
  const prototype = dom.window.HTMLCanvasElement.prototype;
  const original = prototype.getBoundingClientRect;
  let measurements = 0;
  prototype.getBoundingClientRect = function () {measurements += 1; return original.call(this);};
  try {
    render(<Atmos />);
    await flushFrame(100); measurements = 0;
    await flushFrame(108);
    assert.equal(measurements, 0);
    await act(async () => {
      for (let index = 0; index < 100; index += 1) document.dispatchEvent(new dom.window.MouseEvent("pointermove", {clientX: 320, clientY: 180}));
    });
    assert.equal(measurements, 0);
    await flushFrame(140);
    assert.equal(measurements, 1);
    assert.deepEqual(uniformValues.get("u_pointer"), [0.5,0.5]);
    assert.deepEqual(uniformValues.get("u_pointerStrength"), [0.04]);
    await act(async () => {document.dispatchEvent(new dom.window.MouseEvent("pointermove", {clientX: 640, clientY: 360})); document.dispatchEvent(new dom.window.Event("pointerleave"));});
    await flushFrame(180);
    assert.deepEqual(uniformValues.get("u_pointer"), [0.5225,0.4775]);
    assert.ok(Math.abs(uniformValues.get("u_pointerStrength")![0] - 0.0384) < 0.000001);
  } finally {prototype.getBoundingClientRect = original;}
});

test("keeps a static decorative fallback when WebGL is unavailable", async () => {
  webglAvailable = false;
  const {container} = render(<Atmos colors={["invalid", "#abc"]} />);
  await flushFrame();
  assert.equal(container.querySelector("canvas")?.dataset.renderer, "fallback");
  const wrapper = container.firstElementChild as HTMLElement;
  assert.equal(wrapper.getAttribute("aria-hidden"), "true");
  assert.equal(wrapper.style.pointerEvents, "none");
  assert.ok((wrapper.firstElementChild!.firstElementChild as HTMLElement).style.background.includes("radial-gradient"));
  assert.equal(frames.size, 0);
});

test("missing animation APIs leave a visible CSS fallback", () => {
  const raf = window.requestAnimationFrame;
  const caf = window.cancelAnimationFrame;
  Object.assign(window, {requestAnimationFrame: undefined, cancelAnimationFrame: undefined});
  try {
    const {container} = render(<Atmos />);
    assert.equal(container.querySelector("canvas")?.style.visibility, "hidden");
    assert.equal(frames.size, 0);
  } finally {cleanup(); Object.assign(window, {requestAnimationFrame: raf, cancelAnimationFrame: caf});}
});

test("paused components settle then go idle, update on prop changes, and release GPU resources on unmount", async () => {
  context = createContext();
  const beforeDelete = deletedPrograms;
  const {rerender, unmount} = render(<Atmos paused />);
  await flushFrame();
  assert.equal(draws, 1);
  await flushFrame(116);
  assert.equal(draws, 2);
  assert.equal(frames.size, 0);
  rerender(<Atmos paused colors={["#fff", "#000"]} position="top-left" />);
  await flushFrame(200);
  assert.equal(draws, 3);
  assert.equal(frames.size, 1); // Unmount must cancel the pending presentation replay.
  unmount();
  assert.equal(deletedPrograms, beforeDelete + 1);
  assert.equal(frames.size, 0);
});

test("reduced motion produces a still frame without a continuous animation loop", async () => {
  context = createContext();
  reducedMotion = true;
  render(<Atmos />);
  await flushFrame(); await flushFrame(116);
  assert.equal(draws, 2);
  assert.deepEqual(uniformValues.get("u_time"), [2.4]);
  assert.equal(frames.size, 0);
});

test("an active animation cancels its pending frame on unmount", async () => {
  context = createContext();
  const {unmount} = render(<Atmos />);
  await flushFrame();
  assert.equal(draws, 1);
  assert.equal(frames.size, 1);
  unmount();
  assert.equal(frames.size, 0);
});

test("a real unmount releases the context after effect replay has had a chance to reuse the canvas", async () => {
  context = createContext();
  const before = releasedContexts;
  const {unmount} = render(<StrictMode><Atmos /></StrictMode>);
  await flushFrame();
  assert.equal(releasedContexts, before);
  unmount();
  await act(async () => {await Promise.resolve();});
  assert.equal(releasedContexts, before + 1);
});

test("effect suspension can reconnect a retained canvas without intentionally losing its context", async () => {
  context = createContext();
  const canvas = document.createElement("canvas");
  const fallback = document.createElement("div");
  document.body.append(canvas, fallback);
  const before = releasedContexts;
  let renderer = mountRenderer(canvas, fallback, () => resolveOptions({paused: true}));
  await flushFrame();
  renderer.dispose();
  await Promise.resolve();
  assert.equal(releasedContexts, before);
  renderer = mountRenderer(canvas, fallback, () => resolveOptions({paused: true}));
  await flushFrame();
  assert.equal(canvas.dataset.renderer, "webgl");
  canvas.remove(); fallback.remove(); renderer.dispose();
  await Promise.resolve();
  assert.equal(releasedContexts, before + 1);
});

test("context loss stops animation and reveals the gradient fallback", async () => {
  context = createContext();
  const {container} = render(<Atmos />);
  await flushFrame();
  const canvas = container.querySelector("canvas")!;
  await act(async () => {canvas.dispatchEvent(new dom.window.Event("webglcontextlost", {cancelable: true}));});
  assert.equal(canvas.dataset.renderer, "fallback");
  assert.equal((canvas.previousElementSibling as HTMLElement).style.display, "block");
  assert.equal(frames.size, 0);
});

test("context restoration recreates resources and draws again", async () => {
  context = createContext();
  const {container} = render(<Atmos />);
  await flushFrame();
  const canvas = container.querySelector("canvas")!;
  await act(async () => {canvas.dispatchEvent(new dom.window.Event("webglcontextlost", {cancelable: true}));});
  await act(async () => {canvas.dispatchEvent(new dom.window.Event("webglcontextrestored"));});
  await flushFrame(200);
  assert.equal(canvas.dataset.renderer, "webgl");
  assert.equal(draws, 2);
});

test("context creation exceptions degrade to a visible static fallback", async () => {
  contextThrows = true;
  const {container} = render(<Atmos />);
  await flushFrame();
  const canvas = container.querySelector("canvas")!;
  assert.equal(canvas.dataset.renderer, "fallback");
  assert.equal(canvas.style.visibility, "hidden");
  assert.notEqual((canvas.previousElementSibling as HTMLElement).style.display, "none");
});

test("zero-size mounts defer GPU allocation and recover after a resize", async () => {
  context = createContext();
  const prototype = dom.window.HTMLCanvasElement.prototype;
  const original = prototype.getBoundingClientRect;
  const requestsBefore = contextRequests;
  prototype.getBoundingClientRect = () => ({...original.call(document.createElement("canvas")), width: 0, height: 0}) as DOMRect;
  try {
    render(<Atmos />);
    await flushFrame();
    assert.equal(contextRequests, requestsBefore);
  } finally {prototype.getBoundingClientRect = original;}
  await act(async () => {notifyResize(); notifyIntersection(true);});
  await flushFrame(200);
  assert.equal(draws, 1);
});

test("missing observers and matchMedia degrade without throwing or leaking a continuous loop", async () => {
  context = createContext();
  const resize = globalThis.ResizeObserver; const intersection = globalThis.IntersectionObserver;
  const matchMedia = window.matchMedia;
  Object.assign(globalThis, {ResizeObserver: undefined, IntersectionObserver: undefined});
  Object.defineProperty(window, "matchMedia", {value: undefined, configurable: true});
  try {
    const {container} = render(<Atmos />);
    await flushFrame(); await flushFrame(116);
    assert.equal(container.querySelector("canvas")?.dataset.renderer, "webgl");
    assert.equal(frames.size, 0);
    await act(async () => {window.dispatchEvent(new dom.window.Event("resize"));});
    await flushFrame(200); await flushFrame(216);
    assert.equal(draws, 4);
  } finally {
    cleanup();
    Object.assign(globalThis, {ResizeObserver: resize, IntersectionObserver: intersection});
    Object.defineProperty(window, "matchMedia", {value: matchMedia, configurable: true});
  }
});

test("a denied IntersectionObserver does not leave an off-screen render loop", async () => {
  context = createContext();
  const original = globalThis.IntersectionObserver;
  Object.assign(globalThis, {IntersectionObserver: class {constructor() {throw new Error("Observer denied");}}});
  try {
    render(<Atmos />);
    await flushFrame(); await flushFrame(116);
    assert.equal(draws, 2);
    assert.equal(frames.size, 0);
  } finally {cleanup(); Object.assign(globalThis, {IntersectionObserver: original});}
});

test("failed shader initialization releases its unused drawing context", async () => {
  context = createContext(); compileSucceeds = false;
  const before = releasedContexts;
  render(<Atmos />);
  await flushFrame();
  assert.equal(releasedContexts, before + 1);
});

test("a runtime draw failure releases its context and exposes fallback without scheduling more frames", async () => {
  context = createContext();
  const {container} = render(<Atmos />);
  await flushFrame();
  const before = releasedContexts;
  drawThrows = true;
  await flushFrame(200);
  assert.equal(container.querySelector("canvas")?.style.visibility, "hidden");
  assert.equal(container.querySelector("canvas")?.dataset.renderer, "fallback");
  assert.equal(releasedContexts, before + 1);
  assert.equal(frames.size, 0);
});

test("a presentation replay failure exposes fallback and releases the context", async () => {
  context = createContext();
  const {container} = render(<Atmos paused />);
  await flushFrame(100);
  const before = releasedContexts;
  drawThrows = true;
  await flushFrame(116);
  assert.equal(container.querySelector("canvas")?.style.visibility, "hidden");
  assert.equal(container.querySelector("canvas")?.dataset.renderer, "fallback");
  assert.equal(releasedContexts, before + 1);
  assert.equal(frames.size, 0);
});

test("a paused frame follows a live DPR change without requiring a resize event", async () => {
  context = createContext();
  const ratio = window.devicePixelRatio;
  Object.defineProperty(window, "devicePixelRatio", {value: 1, configurable: true});
  try {
    const {container} = render(<Atmos paused />);
    await flushFrame();
    const canvas = container.querySelector("canvas")!;
    assert.equal(canvas.width, 640);
    Object.defineProperty(window, "devicePixelRatio", {value: 2, configurable: true});
    await act(async () => {notifyDpr();});
    await flushFrame(200); await flushFrame(216);
    assert.equal(canvas.width, 960);
    assert.equal(canvas.height, 540);
    assert.equal(frames.size, 0);
  } finally {Object.defineProperty(window, "devicePixelRatio", {value: ratio, configurable: true});}
});

test("explicit static mode never allocates WebGL and can switch back to the renderer", async () => {
  context = createContext();
  const before = contextRequests;
  const {container, rerender} = render(<Atmos renderMode="static" />);
  await flushFrame();
  assert.equal(contextRequests, before);
  assert.equal(container.querySelector("canvas")?.style.visibility, "hidden");
  rerender(<Atmos renderMode="auto" />);
  await flushFrame(200);
  assert.equal(container.querySelector("canvas")?.dataset.renderer, "webgl");
  rerender(<Atmos renderMode="static" colors={["#123456", "#abcdef", "#fedcba"]} />);
  await flushFrame(300);
  assert.equal(frames.size, 0);
  assert.equal(container.querySelector("canvas")?.style.visibility, "hidden");
  const gradient = container.firstElementChild!.firstElementChild!.firstElementChild as HTMLElement;
  const previousGradient = gradient.style.background;
  rerender(<Atmos renderMode="static" colors={["#123456", "#abcdef", "#112233"]} />);
  assert.notEqual(gradient.style.background, previousGradient);
});

for (const failure of ["compile", "link", "buffer"] as const) {
  test(`${failure} failure hides the canvas and keeps the fallback visible`, async () => {
    context = createContext();
    compileSucceeds = failure !== "compile";
    linkSucceeds = failure !== "link";
    bufferAvailable = failure !== "buffer";
    const {container} = render(<Atmos />);
    await flushFrame();
    const canvas = container.querySelector("canvas")!;
    assert.equal(canvas.dataset.renderer, "fallback");
    assert.equal(canvas.style.visibility, "hidden");
    assert.notEqual((canvas.previousElementSibling as HTMLElement).style.display, "none");
    assert.equal(frames.size, 0);
  });
}

test("Strict Mode never hides the fallback before the remounted renderer draws", async () => {
  context = createContext();
  const {container} = render(<StrictMode><Atmos /></StrictMode>);
  const canvas = container.querySelector("canvas")!;
  assert.notEqual((canvas.previousElementSibling as HTMLElement).style.display, "none");
  await flushFrame();
  assert.equal(canvas.dataset.renderer, "webgl");
  assert.equal(frames.size, 1);
});

test("a still frame reappears after resize and runtime reduced-motion changes", async () => {
  context = createContext();
  render(<Atmos />);
  await flushFrame();
  reducedMotion = true;
  await act(async () => {notifyMotion();});
  await flushFrame(200); await flushFrame(216);
  assert.equal(frames.size, 0);
  await act(async () => {notifyResize();});
  await flushFrame(300); await flushFrame(316);
  assert.equal(draws, 5);
  reducedMotion = false;
  await act(async () => {notifyMotion();});
  await flushFrame(400);
  assert.equal(frames.size, 1);
});

test("off-screen instances stop drawing and resume when visible", async () => {
  context = createContext();
  render(<Atmos />);
  await flushFrame();
  await act(async () => {notifyIntersection(false);});
  await flushFrame(200);
  assert.equal(draws, 1);
  assert.equal(frames.size, 0);
  await act(async () => {notifyIntersection(true);});
  await flushFrame(300);
  assert.equal(draws, 2);
  assert.equal(frames.size, 1);
});

test("hidden documents stop drawing and resume after a visibility change", async () => {
  context = createContext();
  render(<Atmos />);
  await flushFrame();
  Object.defineProperty(dom.window.document, "hidden", {value: true, configurable: true});
  await act(async () => {document.dispatchEvent(new dom.window.Event("visibilitychange"));});
  await flushFrame(200);
  assert.equal(draws, 1);
  assert.equal(frames.size, 0);
  Object.defineProperty(dom.window.document, "hidden", {value: false, configurable: true});
  await act(async () => {document.dispatchEvent(new dom.window.Event("visibilitychange"));});
  await flushFrame(300);
  assert.equal(draws, 2);
  assert.equal(frames.size, 1);
});
