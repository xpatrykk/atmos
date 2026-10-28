import {expect, test} from "@playwright/test";
import {PNG} from "pngjs";

test("optimized frames retain identical pixels for every variant and placement", async ({page}, info) => {
  test.setTimeout(180000);
  // Fix only the simulation inputs, not fragment output or browser composition.
  await page.addInitScript(() => {
    const names = new WeakMap<WebGLUniformLocation, string>();
    const prototype = WebGLRenderingContext.prototype;
    const location = prototype.getUniformLocation;
    prototype.getUniformLocation = function (program, name) {
      const result = location.call(this, program, name); if (result) names.set(result, name); return result;
    };
    const scalar = prototype.uniform1f;
    prototype.uniform1f = function (location, value) {scalar.call(this, location, location && names.get(location) === "u_time" ? 3.75 : location && names.get(location) === "u_pointerStrength" ? 0.35 : value);};
    const vector = prototype.uniform2f;
    prototype.uniform2f = function (location, x, y) {
      if (location && names.get(location) === "u_pointer") vector.call(this, location, 0.23, 0.71);
      else vector.call(this, location, x, y);
    };
  });
  const variants = ["haze", "aurora", "ink", "silk", "bloom"];
  const positions = ["top-left", "top", "top-right", "left", "right", "bottom-left", "bottom", "bottom-right"];
  let maximumDelta = 0;
  for (const variant of variants) for (const position of positions) {
    const captures: Buffer[] = [];
    for (const mode of ["alpha-fixed", "webgl"]) {
      await page.goto(`/?case=single&mode=${mode}&variant=${variant}&position=${position}&grain=0.3`);
      await page.addStyleTag({content: ".header,.cookies {visibility:hidden;}"});
      const section = page.locator('[data-surface="sage"]');
      await expect(section.locator("canvas")).toHaveAttribute("data-renderer", "webgl");
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      captures.push(await section.screenshot({scale: "css"}));
    }
    const [baseline, optimized] = captures.map(buffer => PNG.sync.read(buffer));
    expect([baseline.width, baseline.height]).toEqual([optimized.width, optimized.height]);
    let delta = 0;
    for (let index = 0; index < baseline.data.length; index += 1) delta = Math.max(delta, Math.abs(baseline.data[index] - optimized.data[index]));
    maximumDelta = Math.max(maximumDelta, delta);
    expect(delta, `${variant}/${position}`).toBe(0);
  }
  await info.attach("visual-continuity", {body: JSON.stringify({combinations: 40, maximumChannelDelta: maximumDelta, phase: 3.75, pointer: [0.23, 0.71], pointerStrength: 0.35, grain: 0.3}), contentType: "application/json"});
});

test("zero intensity and unchanged paused props produce no GPU work", async ({page}) => {
  await page.addInitScript(() => {
    const draw = WebGLRenderingContext.prototype.drawArrays;
    WebGLRenderingContext.prototype.drawArrays = function (...args) {
      const canvas = this.canvas as HTMLCanvasElement;
      canvas.dataset.draws = String(Number(canvas.dataset.draws ?? 0) + 1);
      draw.apply(this, args);
    };
    const context = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
      if (kind === "webgl") this.dataset.contextRequests = String(Number(this.dataset.contextRequests ?? 0) + 1);
      return context.call(this, kind, ...args as []) as never;
    } as typeof context;
  });
  await page.goto("/?case=single&intensity=0");
  const canvas = page.locator('[data-surface="sage"] canvas');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await canvas.getAttribute("data-context-requests")).toBeNull();
  expect(await canvas.getAttribute("data-draws")).toBeNull();
  await page.getByRole("button", {name: "Toggle intensity", exact: true}).click();
  await expect(canvas).toHaveAttribute("data-renderer", "webgl");
  const count = await canvas.getAttribute("data-draws");
  await page.getByRole("button", {name: "Click through decoration: 0", exact: true}).click();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await canvas.getAttribute("data-draws")).toBe(count);
  await page.getByRole("button", {name: "Toggle intensity", exact: true}).click();
  await expect(canvas).toHaveCSS("visibility", "hidden");
  expect(await canvas.getAttribute("data-draws")).toBe(count);
});

test("pointer bursts are mapped once in the frame and respect the latest container bounds", async ({page}) => {
  await page.addInitScript(() => {
    const bounds = HTMLCanvasElement.prototype.getBoundingClientRect;
    HTMLCanvasElement.prototype.getBoundingClientRect = function () {this.dataset.rectReads = String(Number(this.dataset.rectReads ?? 0) + 1); return bounds.call(this);};
  });
  await page.goto("/?case=single&animate=1");
  const canvas = page.locator('[data-surface="sage"] canvas');
  await expect(canvas).toHaveAttribute("data-renderer", "webgl");
  const reads = await canvas.evaluate(element => {
    const canvas = element as HTMLCanvasElement; const rect = canvas.getBoundingClientRect();
    const before = Number(canvas.dataset.rectReads);
    for (let index = 0; index < 100; index += 1) document.dispatchEvent(new PointerEvent("pointermove", {clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2, pointerType: "mouse"}));
    return Number(canvas.dataset.rectReads) - before;
  });
  expect(reads).toBe(0);
  await page.setViewportSize({width: 740, height: 430});
  await expect(canvas).toHaveAttribute("data-renderer", "webgl");
});
