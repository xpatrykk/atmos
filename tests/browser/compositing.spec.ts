import {expect, test, type Page} from "@playwright/test";
import {PNG} from "pngjs";

const screenshot = (buffer: Buffer) => PNG.sync.read(buffer);
const difference = (left: Buffer, right: Buffer) => {
  const a = screenshot(left); const b = screenshot(right);
  expect([a.width, a.height]).toEqual([b.width, b.height]);
  let sum = 0; let maximum = 0; let changed = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    let delta = 0;
    for (let channel = 0; channel < 3; channel += 1) delta = Math.max(delta, Math.abs(a.data[i + channel] - b.data[i + channel]));
    sum += delta; maximum = Math.max(maximum, delta); if (delta > 3) changed += 1;
  }
  return {mean: sum / (a.width * a.height), maximum, changedFraction: changed / (a.width * a.height)};
};

// Capture synchronously after drawArrays, before the non-preserved drawing buffer
// is presented/cleared. Screenshots still test the final page compositor separately.
const captureDraws = async (page: Page) => page.addInitScript(() => {
  const original = WebGLRenderingContext.prototype.drawArrays;
  WebGLRenderingContext.prototype.drawArrays = function (...args) {
    original.apply(this, args);
    const target = document.createElement("canvas");
    const source = this.canvas as HTMLCanvasElement;
    target.width = source.width; target.height = source.height;
    target.getContext("2d")!.drawImage(source, 0, 0);
    source.dataset.reference = target.toDataURL();
    source.dataset.draws = String(Number(source.dataset.draws ?? 0) + 1);
  };
});
const ready = async (page: Page, name: string) => {
  const section = page.locator(`[data-surface="${name}"]`);
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator("canvas")).toHaveAttribute("data-renderer", "webgl");
  await expect(section.locator("canvas")).toHaveAttribute("data-reference", /^data:/);
  return section;
};

test("intensity zero leaves every HTML surface and glass panel pixel-identical", async ({page}, info) => {
  await captureDraws(page);
  await page.goto("/?intensity=0");
  for (const name of ["white", "cream", "sage", "peach", "dark"]) {
    const section = page.locator(`[data-surface="${name}"]`);
    await section.scrollIntoViewIfNeeded();
    await expect(section.locator("canvas")).toHaveAttribute("data-renderer", "fallback");
    const decorated = await section.screenshot({scale: "css"});
    await section.locator("canvas").evaluate(canvas => {canvas.style.visibility = "hidden";});
    const plain = await section.screenshot({scale: "css"});
    const delta = difference(decorated, plain);
    expect(delta.maximum).toBeLessThanOrEqual(1);
    await info.attach(`${name}-zero`, {body: decorated, contentType: "image/png"});
  }
});

test("partial-alpha WebGL matches both Canvas 2D composition and hand-calculated surface pixels", async ({page}, info) => {
  await captureDraws(page);
  await page.goto("/?palette=solid&intensity=0.8");
  await page.addStyleTag({content: ".cookies,.header {visibility:hidden;}"});
  const backgrounds: Record<string, number[]> = {white: [255,255,255], cream: [250,244,232], sage: [169,189,172], peach: [237,186,162], dark: [23,26,33]};
  for (const [name, background] of Object.entries(backgrounds)) {
    const section = await ready(page, name);
    const actual = await section.screenshot({scale: "css"});
    const alpha = await section.locator("canvas").evaluate(async canvas => {
      const image = new Image(); image.src = canvas.dataset.reference!; await image.decode();
      const copy = document.createElement("canvas"); copy.width = image.width; copy.height = image.height;
      copy.getContext("2d")!.drawImage(image, 0, 0);
      const rect = canvas.getBoundingClientRect();
      return copy.getContext("2d")!.getImageData(Math.floor(rect.width / 2) * image.width / rect.width, (Math.floor(rect.height) - 15) * image.height / rect.height, 1, 1).data[3] / 255;
    });
    expect(alpha).toBeGreaterThan(0.01);
    const png = screenshot(actual); const offset = ((png.height - 15) * png.width + Math.floor(png.width / 2)) * 4;
    for (let channel = 0; channel < 3; channel += 1) {
      const expected = Math.round([128,64,32][channel] * alpha + background[channel] * (1 - alpha));
      expect(Math.abs(png.data[offset + channel] - expected), `${name}: channel=${channel}, actual=${png.data[offset + channel]}, expected=${expected}, alpha=${alpha}`).toBeLessThanOrEqual(4);
    }
    await section.locator("canvas").evaluate(async canvas => {
      const image = new Image(); image.src = canvas.dataset.reference!; await image.decode();
      Object.assign(image.style, {position: "absolute", inset: "0", width: "100%", height: "100%"});
      image.dataset.referenceCopy = "true"; canvas.parentElement!.append(image); canvas.style.visibility = "hidden";
    });
    const reference = await section.screenshot({scale: "css"});
    const delta = difference(actual, reference);
    expect(delta.mean).toBeLessThan(0.6);
    expect(delta.changedFraction).toBeLessThan(0.015);
    await info.attach(`${name}-webgl`, {body: actual, contentType: "image/png"});
    await info.attach(`${name}-2d-reference`, {body: reference, contentType: "image/png"});
    await info.attach(`${name}-delta`, {body: JSON.stringify(delta), contentType: "application/json"});
  }
});

test("legacy comparison records compositor evidence without claiming a physical-device reproduction", async ({page}, info) => {
  await page.goto("/?mode=legacy");
  const legacy = await page.locator('[data-surface="sage"]').screenshot({scale: "css"});
  await page.goto("/?mode=webgl");
  const section = page.locator('[data-surface="sage"]');
  await section.scrollIntoViewIfNeeded(); await expect(section.locator("canvas")).toHaveAttribute("data-renderer", "webgl");
  const fixed = await section.screenshot({scale: "css"});
  await info.attach("legacy-sage", {body: legacy, contentType: "image/png"});
  await info.attach("fixed-sage", {body: fixed, contentType: "image/png"});
  await info.attach("legacy-comparison", {body: JSON.stringify(difference(legacy, fixed)), contentType: "application/json"});
});

for (const {mode, spread} of [{mode: "webgl", spread: 1}, {mode: "static", spread: 0.2}]) test(`${mode}: all five variants and eight placements render at extreme props without white or missing surfaces`, async ({page}, info) => {
  await page.goto(`/?case=matrix&mode=${mode}&intensity=1&spread=${spread}`);
  await page.addStyleTag({content: ".matrix .content {visibility:hidden;} .cookies,.header {visibility:hidden;}"});
  const sections = page.locator("[data-surface]");
  await expect(sections).toHaveCount(40);
  for (let index = 0; index < 40; index += 1) {
    const section = sections.nth(index); await section.scrollIntoViewIfNeeded();
    await expect.poll(() => section.locator("canvas").getAttribute("data-renderer")).toMatch(/webgl|fallback/);
    const decorated = await section.screenshot({scale: "css"});
    const center = screenshot(decorated);
    // The quiet center must retain the HTML surface even when 40 contexts exceed GPU limits.
    const background = await section.evaluate(element => getComputedStyle(element).backgroundColor.match(/\d+/g)!.slice(0,3).map(Number));
    const offset = (Math.floor(center.height / 2) * center.width + Math.floor(center.width / 2)) * 4;
    for (let channel = 0; channel < 3; channel += 1) expect(Math.abs(center.data[offset + channel] - background[channel])).toBeLessThanOrEqual(1);
    await section.locator("canvas").evaluate(canvas => {canvas.parentElement!.style.opacity = "0";});
    const plain = await section.screenshot({scale: "css"});
    expect(difference(decorated, plain).mean, `nonempty edges for tile ${index}`).toBeGreaterThan(0.2);
    await section.locator("canvas").evaluate(canvas => {canvas.parentElement!.style.opacity = "1";});
  }
  await info.attach("matrix", {body: await page.screenshot({fullPage: true, scale: "css"}), contentType: "image/png"});
});

test("a denied or throwing context leaves palette-colored fallback pixels, while zero opacity removes them", async ({page}, info) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
      if (kind === "webgl") throw new Error("Denied context");
      return original.call(this, kind, ...args as []) as never;
    } as typeof original;
  });
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/?palette=solid");
  const section = page.locator('[data-surface="sage"]'); await section.scrollIntoViewIfNeeded();
  await expect(section.locator("canvas")).toHaveCSS("visibility", "hidden");
  const fallback = await section.screenshot({scale: "css"});
  await section.locator("canvas").evaluate(canvas => {(canvas.previousElementSibling as HTMLElement).style.opacity = "0";});
  const plain = await section.screenshot({scale: "css"});
  expect(difference(fallback, plain).mean).toBeGreaterThan(0.3);
  expect(errors).toEqual([]);
  await info.attach("static-sage", {body: fallback, contentType: "image/png"});
});
