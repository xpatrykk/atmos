# Atmos performance and 0.1.1 release plan

> **For agentic workers:** Use superpowers:executing-plans to implement task by task, followed by one fresh whole-branch review.

**Goal:** Ship the authorized Safari repair and invisible-work optimizations without changing the smoke's appearance, timing, pointer response, props or exports.

**Architecture:** Keep the existing component, lifecycle and WebGL boundaries. Cache unchanged GPU inputs; coalesce pending pointer coordinates into the existing frame loop; compare normalized React options by value; skip GPU drawing at zero intensity while retaining the existing simulation clock. Leave GLSL motion, masks, precision, resolution and frame budget unchanged.

**Tech stack:** TypeScript, React 18.2/19, WebGL 1, pnpm 11.19.0, node:test, Playwright, GitHub and Vercel.

**Spec:** User-approved optimization proposal in this conversation: points 1–4, preserve quality and contracts, then publish changes and a new npm version.

## Global constraints

- Preserve five variants, eight positions, color handling, premultiplied alpha and SSR/fallback behavior.
- No new runtime dependencies, no adaptive resolution/FPS, no shader visual changes.
- Continue in the existing feature branch containing the reviewed Safari repair; do not move or lose its uncommitted work.
- Fresh all-severity dependency audit before every commit, push and PR mutation; use only the pnpm lockfile.
- Verify repository, main branch, npm identity/scope and existing Vercel project/domain before release.

## Review focus

- Zero intensity must hide stale pixels and retain the simulation phase across `0 → positive`.
- Cached uniforms must update independently for changed colors, position, theme and size, and reset after context restoration.
- Pointer batching must use the latest event, clear pending input on leave and correctly remap after scrolling/resize.
- Equal normalized props must not redraw paused frames; real prop changes must redraw them.
- Existing loss/restoration, Strict Mode, reduced motion and multiple-instance cleanup remain valid.

### Task 1: GPU and React work

**Files:** `src/create-renderer.ts`, `src/ambient-smoke.tsx`, `tests/component.test.tsx`.

- [x] Add failing tests for unchanged uniform uploads and paused equivalent-prop rerenders; observe failure.
- [x] Cache only unchanged GPU inputs and compare normalized options by value before invalidation.
- [x] Verify changes, palette updates and context-restoration cache reset with units and real-browser probes.

### Task 2: Lifecycle work

**Files:** `src/mount-renderer.ts`, `tests/component.test.tsx`, `tests/browser/compositing.spec.ts`, `tests/browser/lifecycle.spec.ts`.

- [x] Add failing tests for zero-intensity allocation/draws, phase continuation, throttled layout reads and batched pointer coordinates.
- [x] Implement zero-intensity GPU suspension, deferred pointer mapping and transition-only DOM writes, retaining clock/smoothing math.
- [x] Verify baseline/final pixels with fixed time/pointer across all 40 combinations; run browser lifecycle and contract regressions.

### Task 3: Release

**Files:** package manifests/lockfile, README, changelog, compatibility/performance documentation and CI as required by observed failures.

- [ ] Set version 0.1.1, document measurements and remaining physical-iOS coverage limit.
- [ ] Run audit, typecheck, lint, units, production builds, browser suite and archive/consumer smoke checks.
- [ ] Obtain one fresh independent whole-branch review and resolve material findings.
- [ ] Commit, push, open/attach a PR, wait for checks, merge into verified `main`, and tag the release.
- [ ] Publish the exact verified archive to npm; complete authentication through npm's own flow if needed.
- [ ] Verify Vercel production commit/domain and npm installation; report live URLs and exact version.
