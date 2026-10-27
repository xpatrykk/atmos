import assert from "node:assert/strict";
import {afterEach, before, test} from "node:test";
import {JSDOM} from "jsdom";
import {act, cleanup, render} from "@testing-library/react";

import {Atmos} from "../src/index.js";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {pretendToBeVisual: true});
const frames = new Map<number, FrameRequestCallback>();
let nextFrame = 0;
let draws = 0;
let deletedPrograms = 0;
let reducedMotion = false;
let webglAvailable = true;
let context: ReturnType<typeof createContext>;
let notifyIntersection: (inView: boolean) => void;

const createContext = () => ({
  VERTEX_SHADER: 35633, FRAGMENT_SHADER: 35632, COMPILE_STATUS: 35713, LINK_STATUS: 35714,
  ARRAY_BUFFER: 34962, STATIC_DRAW: 35044, FLOAT: 5126, TRIANGLES: 4,
  createProgram: () => ({}), createShader: () => ({}), createBuffer: () => ({}),
  getAttribLocation: () => 0, getUniformLocation: () => ({}),
  getShaderParameter: () => true, getProgramParameter: () => true,
  shaderSource: () => undefined, compileShader: () => undefined, attachShader: () => undefined,
  linkProgram: () => undefined, useProgram: () => undefined, bindBuffer: () => undefined,
  bufferData: () => undefined, enableVertexAttribArray: () => undefined, vertexAttribPointer: () => undefined,
  viewport: () => undefined, uniform1f: () => undefined, uniform2f: () => undefined,
  uniform2fv: () => undefined, uniform1i: () => undefined, uniform3fv: () => undefined,
  deleteBuffer: () => undefined, deleteShader: () => undefined,
  deleteProgram: () => {deletedPrograms += 1;}, drawArrays: () => {draws += 1;},
});

before(() => {
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    requestAnimationFrame: (callback: FrameRequestCallback) => {const id = ++nextFrame; frames.set(id, callback); return id;},
    cancelAnimationFrame: (id: number) => {frames.delete(id);},
    ResizeObserver: class {observe() {} disconnect() {}},
	    IntersectionObserver: class {
      constructor(callback: IntersectionObserverCallback) {
        notifyIntersection = (inView) => callback([{isIntersecting: inView} as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      observe() {} disconnect() {}
    },
  });
  Object.defineProperty(dom.window, "matchMedia", {value: () => ({matches: reducedMotion, addEventListener() {}, removeEventListener() {}})});
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, "getContext", {value: () => webglAvailable ? context : null});
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, "getBoundingClientRect", {value: () => ({x: 0, y: 0, left: 0, top: 0, right: 640, bottom: 360, width: 640, height: 360})});
});

afterEach(() => {
  cleanup(); frames.clear(); draws = 0; reducedMotion = false; webglAvailable = true;
  Object.defineProperty(dom.window.document, "hidden", {value: false, configurable: true});
});

const flushFrame = async (time = 100) => {
  const callbacks = [...frames.values()];
  frames.clear();
  await act(async () => {for (const callback of callbacks) callback(time);});
};

test("keeps a static decorative fallback when WebGL is unavailable", () => {
  webglAvailable = false;
  const {container} = render(<Atmos colors={["invalid", "#abc"]} />);
  assert.equal(container.querySelector("canvas")?.dataset.renderer, "fallback");
  const wrapper = container.firstElementChild as HTMLElement;
  assert.equal(wrapper.getAttribute("aria-hidden"), "true");
  assert.equal(wrapper.style.pointerEvents, "none");
  assert.ok((wrapper.firstElementChild as HTMLElement).style.background.includes("radial-gradient"));
  assert.equal(frames.size, 0);
});

test("paused components draw once, update on prop changes, and release GPU resources on unmount", async () => {
  context = createContext();
  const beforeDelete = deletedPrograms;
  const {rerender, unmount} = render(<Atmos paused />);
  await flushFrame();
  assert.equal(draws, 1);
  assert.equal(frames.size, 0);
  rerender(<Atmos paused colors={["#fff", "#000"]} position="top-left" />);
  await flushFrame(200);
  assert.equal(draws, 2);
  assert.equal(frames.size, 0);
  unmount();
  assert.equal(deletedPrograms, beforeDelete + 1);
  assert.equal(frames.size, 0);
});

test("reduced motion produces a still frame without a continuous animation loop", async () => {
  context = createContext();
  reducedMotion = true;
  render(<Atmos />);
  await flushFrame();
  assert.equal(draws, 1);
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
