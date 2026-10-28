// CI diagnostics: distinguish unavailable graphics backends from renderer failures.
import {chromium, firefox, webkit} from "@playwright/test";
import {fragmentShader, vertexShader} from "../src/shaders.ts";

for (const [name, engine] of Object.entries({chromium, firefox, webkit})) {
  for (const headless of [true, false]) {
    const browser = await engine.launch({headless, timeout: 30000});
    try {
      const page = await browser.newPage();
      const warnings = [];
      page.on("console", message => {if (/webgl|graphics|shader/i.test(message.text())) warnings.push(message.text());});
      const result = await page.evaluate(({vertexShader, fragmentShader}) => {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl", {alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power"});
        if (!gl) return {webgl: false};
        const shaders = [[gl.VERTEX_SHADER, vertexShader], [gl.FRAGMENT_SHADER, fragmentShader]].map(([type, source]) => {
          const shader = gl.createShader(type);
          gl.shaderSource(shader, source); gl.compileShader(shader);
          return {compiled: gl.getShaderParameter(shader, gl.COMPILE_STATUS), log: gl.getShaderInfoLog(shader)};
        });
        return {webgl: true, renderer: gl.getParameter(gl.RENDERER), version: gl.getParameter(gl.VERSION), shaders};
      }, {vertexShader, fragmentShader});
      console.log(JSON.stringify({name, browserVersion: browser.version(), headless, ...result, warnings}));
      if (!headless && (!result.webgl || result.shaders.some(shader => !shader.compiled))) process.exitCode = 1;
    } finally {await browser.close();}
  }
}
