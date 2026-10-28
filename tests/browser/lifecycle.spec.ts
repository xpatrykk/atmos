import {expect, test} from "@playwright/test";

test("context loss hides its layer and restoration rebuilds a real GPU frame", async ({page}) => {
  await page.goto("/");
  const canvas = page.locator('[data-surface="white"] canvas');
  await expect(canvas).toHaveAttribute("data-renderer", "webgl");
  const available = await canvas.evaluate(element => {
    const extension = (element as HTMLCanvasElement).getContext("webgl")!.getExtension("WEBGL_lose_context");
    if (!extension) return false;
    extension.loseContext();
    element.addEventListener("webglcontextlost", () => setTimeout(() => extension.restoreContext(), 100), {once: true});
    return true;
  });
  test.skip(!available, "This driver does not expose WEBGL_lose_context; unit restoration coverage still runs.");
  await expect(canvas).toHaveCSS("visibility", "hidden");
  await expect(canvas).toHaveAttribute("data-renderer", "webgl");
  await expect(canvas).toHaveCSS("visibility", "visible");
});

test("optional APIs, zero size, props, remounts, dialogs and hydration degrade safely", async ({page}) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {if (message.type() === "error") errors.push(message.text());});
  await page.addInitScript(() => {
    Object.defineProperty(window, "IntersectionObserver", {value: undefined});
    Object.defineProperty(window, "ResizeObserver", {value: undefined});
    Object.defineProperty(window, "matchMedia", {value: undefined});
  });
  await page.goto("/?hydrate=1&zero=1");
  const section = page.locator('[data-surface="white"]');
  await expect(section.locator("canvas")).toHaveCSS("visibility", "hidden");
  await page.getByRole("button", {name: "Toggle size", exact: true}).click();
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await expect(section.locator("canvas")).toHaveAttribute("data-renderer", "webgl");
  await page.getByRole("button", {name: "Toggle intensity", exact: true}).click();
  await page.getByRole("button", {name: "Change palette and position", exact: true}).click();
  await page.getByRole("button", {name: "Click through decoration: 0", exact: true}).first().click();
  await expect(section.getByRole("button")).toHaveText("Click through decoration: 1");
  await page.getByRole("button", {name: "Open lightbox", exact: true}).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", {name: "Close lightbox", exact: true}).click();
  await page.getByRole("button", {name: "Toggle mount", exact: true}).click();
  await expect(section.locator("canvas")).toHaveCount(0);
  await page.getByRole("button", {name: "Toggle mount", exact: true}).click();
  await expect(section.locator("canvas")).toHaveAttribute("data-renderer", "fallback");
  await expect(section.locator("canvas")).toHaveCSS("visibility", "hidden");
  await page.getByRole("button", {name: "Toggle intensity", exact: true}).click();
  await expect(section.locator("canvas")).toHaveAttribute("data-renderer", "webgl");
  await page.getByLabel("Renderer", {exact: true}).selectOption("static");
  await expect(section.locator("canvas")).toHaveCSS("visibility", "hidden");
  expect(errors).toEqual([]);
});

test("runtime reduced motion and page suspension stop rendering, then resume", async ({page}) => {
  await page.addInitScript(() => {
    const original = WebGLRenderingContext.prototype.drawArrays;
    WebGLRenderingContext.prototype.drawArrays = function (...args) {
      original.apply(this, args);
      const canvas = this.canvas as HTMLCanvasElement;
      canvas.dataset.draws = String(Number(canvas.dataset.draws ?? 0) + 1);
    };
  });
  await page.goto("/?animate=1");
  const canvas = page.locator('[data-surface="white"] canvas');
  await expect.poll(async () => Number(await canvas.getAttribute("data-draws"))).toBeGreaterThan(2);
  await page.emulateMedia({reducedMotion: "reduce"});
  await expect.poll(async () => {
    const before = await canvas.getAttribute("data-draws");
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    return before === await canvas.getAttribute("data-draws");
  }).toBe(true);
  await page.emulateMedia({reducedMotion: "no-preference"});
  const count = Number(await canvas.getAttribute("data-draws"));
  await expect.poll(async () => Number(await canvas.getAttribute("data-draws"))).toBeGreaterThan(count);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  const hiddenCount = await canvas.getAttribute("data-draws");
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await canvas.getAttribute("data-draws")).toBe(hiddenCount);
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  await expect.poll(async () => Number(await canvas.getAttribute("data-draws"))).toBeGreaterThan(Number(hiddenCount));
  await page.locator('[data-surface="dark"]').scrollIntoViewIfNeeded();
  await expect.poll(async () => {
    const before = await canvas.getAttribute("data-draws");
    await page.evaluate(() => new Promise<void>(resolve => {
      let remaining = 8;
      const frame = () => {if (--remaining <= 0) resolve(); else requestAnimationFrame(frame);};
      requestAnimationFrame(frame);
    }));
    return before === await canvas.getAttribute("data-draws");
  }).toBe(true);
  const offscreenCount = await canvas.getAttribute("data-draws");
  await page.locator('[data-surface="white"]').scrollIntoViewIfNeeded();
  await expect.poll(async () => Number(await canvas.getAttribute("data-draws"))).toBeGreaterThan(Number(offscreenCount));
});

test("static mode can return to WebGL in the same mounted component", async ({page}) => {
  await page.goto("/");
  const canvas = page.locator('[data-surface="white"] canvas');
  await expect(canvas).toHaveAttribute("data-renderer", "webgl");
  await page.getByLabel("Renderer", {exact: true}).selectOption("static");
  await expect(canvas).toHaveCSS("visibility", "hidden");
  // A browser task gives deferred context release time to run.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  await page.getByLabel("Renderer", {exact: true}).selectOption("webgl");
  await expect(canvas).toHaveAttribute("data-renderer", "webgl");
  await expect(canvas).toHaveCSS("visibility", "visible");
});

test("real shader compilation failure leaves the fallback visible", async ({page}) => {
  await page.addInitScript(() => {
    const source = WebGLRenderingContext.prototype.shaderSource;
    WebGLRenderingContext.prototype.shaderSource = function (shader, text) {
      source.call(this, shader, text.includes("gl_FragColor") ? "not valid GLSL" : text);
    };
  });
  await page.goto("/");
  const canvas = page.locator('[data-surface="white"] canvas');
  await expect(canvas).toHaveCSS("visibility", "hidden");
  await expect(canvas).toHaveAttribute("data-renderer", "fallback");
  await expect(canvas.locator("..").locator(":scope > div")).toHaveCSS("display", "block");
});

test("a paused canvas follows resizing and orientation within its resolution budget", async ({page}) => {
  await page.goto("/");
  const canvas = page.locator('[data-surface="white"] canvas');
  await expect(canvas).toHaveAttribute("data-renderer", "webgl");
  const before = await canvas.evaluate(element => (element as HTMLCanvasElement).width);
  await page.setViewportSize({width: 740, height: 430});
  await page.evaluate(() => window.dispatchEvent(new Event("orientationchange")));
  await expect.poll(() => canvas.evaluate(element => (element as HTMLCanvasElement).width)).not.toBe(before);
  const size = await canvas.evaluate(element => {
    const node = element as HTMLCanvasElement; const rect = node.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio, 1.5, 1400 / rect.width, 1000 / rect.height);
    return {actual: [node.width, node.height], expected: [Math.round(rect.width * ratio), Math.round(rect.height * ratio)]};
  });
  expect(size.actual).toEqual(size.expected);
});
