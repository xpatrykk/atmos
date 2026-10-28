import {anchors, extentFor} from "./geometry.js";
import {fragmentShader, vertexShader} from "./shaders.js";
import type {resolveOptions} from "./resolve-options.js";

export type ResolvedOptions = ReturnType<typeof resolveOptions>;
export interface PointerState {x: number; y: number; strength: number;}

// One full-screen pass writes the complete buffer. Page compositing, not GL blending,
// mixes it with HTML. Both the context and fragment output use premultiplied alpha.
export const createRenderer = (canvas: HTMLCanvasElement) => {
  const gl = canvas.getContext("webgl", {alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power"});
  if (!gl) throw new Error("WebGL unavailable");
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  const shaders: WebGLShader[] = [];
  const releaseContext = () => {
    try {gl.getExtension("WEBGL_lose_context")?.loseContext();} catch { /* Browser/GC owns contexts when the extension is denied. */ }
  };
  const dispose = () => {
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach(shader => gl.deleteShader(shader));
    buffer = null; program = null; shaders.length = 0;
  };
  try {
    program = gl.createProgram();
    if (!program) throw new Error("Program allocation failed");
    for (const [type, source] of [[gl.VERTEX_SHADER, vertexShader], [gl.FRAGMENT_SHADER, fragmentShader]] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("Shader allocation failed");
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Shader compilation failed");
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Program link failed");
    gl.useProgram(program);
    buffer = gl.createBuffer();
    if (!buffer) throw new Error("Buffer allocation failed");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program, "a_position");
    if (attribute < 0) throw new Error("Position attribute unavailable");
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
  } catch (error) {dispose(); releaseContext(); throw error;}

  let locations: Record<string, WebGLUniformLocation | null>;
  try {locations = Object.fromEntries([
    "u_time", "u_resolution", "u_anchor", "u_extent", "u_pointer", "u_pointerStrength", "u_variant",
    "u_intensity", "u_spread", "u_grain", "u_light", "u_colors[0]", "u_colorCount",
  ].map(name => [name, gl.getUniformLocation(program!, name)]));}
  catch (error) {dispose(); releaseContext(); throw error;}
  const variants = {haze: 0, aurora: 1, ink: 2, silk: 3, bloom: 4};
  const channels = new Float32Array(18);
  const cached = {width: 0, height: 0, position: "", variant: "", intensity: NaN, spread: NaN, grain: NaN, theme: "", colors: [] as string[]};
  return {
    dispose,
    releaseContext,
    draw(options: ResolvedOptions, phase: number, pointer: PointerState, rect: DOMRect) {
      if (gl.isContextLost()) return false;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5, 1400 / rect.width, 1000 / rect.height);
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {canvas.width = width; canvas.height = height;}
      if (cached.width !== width || cached.height !== height) {
        gl.viewport(0, 0, width, height);
        gl.uniform2f(locations.u_resolution, width, height);
        cached.width = width; cached.height = height;
      }
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (cached.colors.length !== options.colors.length || options.colors.some((color, index) => color !== cached.colors[index])) {
        for (let index = 0; index < 6; index += 1) {
          const color = options.colors[index % options.colors.length].slice(1);
          for (let channel = 0; channel < 3; channel += 1) channels[index * 3 + channel] = parseInt(color.slice(channel * 2, channel * 2 + 2), 16) / 255;
        }
        gl.uniform1i(locations.u_colorCount, options.colors.length);
        gl.uniform3fv(locations["u_colors[0]"], channels);
        cached.colors = options.colors.slice();
      }
      gl.uniform1f(locations.u_time, phase);
      if (cached.position !== options.position) {
        gl.uniform2fv(locations.u_anchor, anchors[options.position]);
        gl.uniform2fv(locations.u_extent, extentFor(options.position));
        cached.position = options.position;
      }
      gl.uniform2f(locations.u_pointer, pointer.x, pointer.y);
      gl.uniform1f(locations.u_pointerStrength, pointer.strength);
      if (cached.variant !== options.variant) {gl.uniform1f(locations.u_variant, variants[options.variant]); cached.variant = options.variant;}
      if (cached.intensity !== options.intensity) {gl.uniform1f(locations.u_intensity, options.intensity); cached.intensity = options.intensity;}
      if (cached.spread !== options.spread) {gl.uniform1f(locations.u_spread, options.spread); cached.spread = options.spread;}
      if (cached.grain !== options.grain) {gl.uniform1f(locations.u_grain, options.grain); cached.grain = options.grain;}
      if (cached.theme !== options.theme) {gl.uniform1f(locations.u_light, options.theme === "light" ? 1 : 0); cached.theme = options.theme;}
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      return !gl.isContextLost();
    },
  };
};
