import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {test} from "node:test";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";

test("the built public entry imports on the server and exposes both component names", async () => {
  const {Atmos, AmbientSmoke} = await import("../dist/index.js");
  assert.equal(typeof Atmos, "function");
  assert.equal(Atmos, AmbientSmoke);
  for (const variant of ["haze", "aurora", "ink", "silk", "bloom"]) {
    const html = renderToStaticMarkup(createElement(Atmos, {variant, className: "background"}));
    assert.match(html, /aria-hidden="true"/);
    assert.match(html, /pointer-events:none/);
    assert.match(html, /class="background"/);
    assert.match(html, /<canvas/);
  }
});

test("the distributed entry preserves the client directive and keeps React external", async () => {
  const bundle = await readFile(new URL("../dist/index.js", import.meta.url), "utf8");
  assert.ok(bundle.startsWith('"use client";'));
  assert.match(bundle, /from "react"/);
  assert.doesNotMatch(bundle, /react\.production|react\.development/);
  const declaration = await readFile(new URL("../dist/index.d.ts", import.meta.url), "utf8");
  assert.match(declaration, /Atmos/);
  assert.match(declaration, /AtmosProps/);
});
