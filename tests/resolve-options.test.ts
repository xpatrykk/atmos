import assert from "node:assert/strict";
import {test} from "node:test";

import {resolveOptions} from "../src/resolve-options.js";

test("uses the documented defaults when no options are supplied", () => {
  const options = resolveOptions({});
  assert.deepEqual(options.colors, ["#D0804F", "#B45E72", "#7A70C5"]);
  assert.equal(options.position, "bottom");
  assert.equal(options.variant, "haze");
  assert.equal(options.intensity, 0.65);
  assert.equal(options.speed, 0.6);
  assert.equal(options.spread, 0.8);
  assert.equal(options.interactive, true);
});

test("expands shorthand HEX and ignores malformed colors", () => {
  assert.deepEqual(resolveOptions({colors: ["#abc", "invalid", "#123456"]}).colors, ["#aabbcc", "#123456"]);
});

test("falls back when fewer than two valid colors remain", () => {
  assert.deepEqual(resolveOptions({colors: ["bad", "#abc"]}).colors, resolveOptions({}).colors);
  assert.deepEqual(resolveOptions({colors: []}).colors, resolveOptions({}).colors);
});

test("accepts an immutable palette without modifying it and keeps at most six colors", () => {
  const colors = Object.freeze(["#111", "#222", "#333", "#444", "#555", "#666", "#777"]);
  const result = resolveOptions({colors});
  assert.equal(colors.length, 7);
  assert.equal(result.colors.length, 6);
  assert.deepEqual(result.colors.slice(0, 2), ["#111111", "#222222"]);
});

test("clamps finite controls and replaces non-finite values with defaults", () => {
  const options = resolveOptions({intensity: 4, speed: -1, spread: 0, grain: Number.NaN});
  assert.equal(options.intensity, 1);
  assert.equal(options.speed, 0);
  assert.equal(options.spread, 0.2);
  assert.equal(options.grain, 0.3);
  assert.equal(resolveOptions({speed: Infinity}).speed, 0.6);
});

test("preserves all five variants and eight positions", () => {
  for (const variant of ["haze", "aurora", "ink", "silk", "bloom"] as const) assert.equal(resolveOptions({variant}).variant, variant);
  for (const position of ["top-left", "top", "top-right", "left", "right", "bottom-left", "bottom", "bottom-right"] as const) assert.equal(resolveOptions({position}).position, position);
});
