# Safari rendering: diagnosis, repair and acceptance

Rendering repair introduced in **0.1.1**, based on `v0.1.0` (`ce8b3819a412197fad2d8997de3d101e2528d8e6`). This records the pre-release diagnosis. The subsequent release also includes the [behavior-preserving performance changes](./performance.md). No change to the consuming Alma Lunar application is part of this library release.

## Confirmed cause and its limits

The released renderer requests `alpha: true, premultipliedAlpha: false` and writes straight RGB plus alpha. That pairing is valid in principle, but exposes a known WebKit compositor defect. [WebKit bug 200026](https://bugs.webkit.org/show_bug.cgi?id=200026) describes incorrect straight-alpha compositing; [upstream commit 3e12766](https://github.com/WebKit/WebKit/commit/3e12766ced21f82a68008cfaf3114e0dd57c8e2c), landed September 8, 2026, tags the IOSurface as unpremultiplied. Landing upstream does not establish which Safari/iOS release or device includes the repair.

On October 28, 2026, native **macOS Safari 27.0.1** reproduced severe white patches on the lab's cream and sage surfaces with the original 0.1.0 renderer. The same scene, scroll offset, palette, paused phase and glass CSS rendered correctly when only these two source expressions were changed:

```diff
- premultipliedAlpha: false
+ premultipliedAlpha: true
- gl_FragColor = vec4(color, alpha);
+ gl_FragColor = vec4(color * alpha, alpha);
```

These are the entire differences in the generated `alpha-fixed` comparison module. The full repair also preserves the HTML surface. Evidence is captured from the actual Safari window, not from computed styles or a GPU buffer:

| Original 0.1.0 | Only the paired alpha repair | Full repair |
| --- | --- | --- |
| [Native Safari screenshot](./evidence/safari-legacy.jpg) | [Native Safari screenshot](./evidence/safari-alpha-only.jpg) | [Native Safari screenshot](./evidence/safari-fixed.jpg) |

This controlled reproduction confirms the straight-alpha path as the cause of **the reproduced native Safari bleaching**. It supports, but does not prove, the same diagnosis for the reported physical iPhone 17 Pro Max. No physical iPhone was available. Playwright's desktop WebKit did not reproduce the dramatic native Safari white patches, even at a mobile viewport. Neither mobile emulation nor `readPixels` establishes final iOS composition.

The glass panels' CSS was unchanged in the controlled comparison. This demonstrates that backdrop-filter can sample an incorrectly composed WebGL layer; it does not establish an independent backdrop-filter defect or explain every reported application symptom.

## Renderer and fallback contract

- Context and shader both use premultiplied alpha. GL blending is explicitly disabled: one full-buffer pass writes the image and the browser composites it over HTML. The clear color is transparent black and every frame clears its buffer. Alpha zero therefore writes zero RGB; `intensity=0` has no decorative influence.
- The CSS decoration remains visible until a successful GPU frame. Context creation exceptions, denial/null, shader compilation/link failure, allocation failure and draw errors leave a hidden canvas over a visible fallback.
- Context loss cancels animation and reveals the fallback. Restoration creates new programs, buffers, shaders and uniform locations before showing the canvas.
- Fallback gradients use all normalized palette entries. Nested masks apply the edge and quiet-center fades with both `mask-image` and `-webkit-mask-image`, avoiding the incompatible `intersect`/WebKit composite operator mapping. Unsupported masking may simplify the appearance; the radial gradient still fades to transparent.
- Optional `renderMode="static"` is a safe, explicit CSS path that never requests WebGL. Existing exports, defaults and required props remain unchanged. A mode change replaces the canvas so intentional context release cannot poison a later `auto` render.
- No phone-wide animation ban or user-agent sniffing was introduced. A browser that produces incorrect final composition cannot be detected reliably with a GL readback; select static mode in the integration when device acceptance requires it.

## Lifecycle and resource behavior

Allocation waits for a visible, nonzero container. Intersection/visibility observers stop off-screen and hidden-tab work; page hide/show handles suspension and resume. Resize, orientation and DPR changes invalidate still frames. Drawing remains capped at 30 fps, DPR 1.5 and 1400 × 1000 pixels. The original motion fields are unchanged.

Live reduced-motion changes produce a still frame and disable pointer distortion. Missing or denied observers/motion detection use a still frame; missing RAF leaves CSS. Window resize remains a recovery path when ResizeObserver is unavailable.

Cleanup cancels RAF and removes listeners/observers, deletes GPU objects and releases detached contexts through `WEBGL_lose_context` when available. A retained connected canvas is not deliberately lost, so synchronous Strict Mode replay and later effect reconnection remain possible. The retained-node lifecycle is covered directly; this is not a claim to have tested every React Activity or Next.js caching implementation.

Several visible components still mean several contexts. The browser can evict contexts at its own limit; the 40-instance matrix must retain a visible decoration through WebGL or fallback. There is no global pool or promise of unlimited simultaneous GPU instances. Prefer explicit static instances in long repeated lists.

## Local lab

Use Node.js 22 and pinned pnpm 11.19.0:

```sh
corepack enable
pnpm install --frozen-lockfile
git fetch --tags
pnpm dev:compat
```

Open [the compatibility lab](http://127.0.0.1:4320). Renderer choices are repaired WebGL, CSS static, no decoration, original 0.1.0, and 0.1.0 with only the alpha repair. The original sources are extracted from tag `v0.1.0` into ignored `.work/`; none are shipped with the package.

The five full-width surfaces are white, cream, sage, peach and dark, each with a different smoke variant. A sticky header, rounded glass card, fixed cookie panel and lightbox exercise stacking and interaction. Scroll through several sections; toggle mount, zero size, motion, intensity, palette and position. Query parameters also support `case=matrix`, `mode=static`, `intensity=0`, `spread=0.2`, `palette=solid`, `animate=1`, `hydrate=1`, `zero=1` and `position=top-right`.

## Automated checks and recorded environment

The browser suite compares **final page screenshots**, including rounded glass content. At zero intensity the decorated/plain captures differ by at most one channel value. A constant palette exercises partial alpha over all five surfaces, checking calculated source-over mixing (tolerance four channel values) and a Canvas 2D reference (mean difference below 0.6; fewer than 1.5% of pixels differ by more than three). Buffer capture is supplementary reference data, not the compositor verdict. The 40-combination matrices require preserved center pixels and nonempty decoration at the edges in WebGL and static modes.

Lifecycle regressions include real context loss/restoration, shader failure, optional APIs, zero-size recovery, SSR/hydration under Strict Mode, dynamic props, static/auto roundtrip, click-through, dialog use, resize/orientation, live reduced motion, off-screen pause and page suspension. Unit tests additionally cover null/throwing context creation, compile/link/buffer failures, GPU cleanup and retained-canvas effect reconnection.

Commands:

```sh
pnpm security:audit
pnpm verify
pnpm exec playwright install chromium firefox webkit
pnpm test:browser
pnpm pack --dry-run
```

Playwright **1.64.1**, Node **22.23.2**, pnpm **11.19.0**. Desktop viewport: **1100 × 850, DPR 1**. Mobile-size viewport: **430 × 932, DPR 2 with touch** (desktop engine, not an iPhone).

| Environment | Result / limitation |
| --- | --- |
| Chromium 156.0.8078.4, Playwright revision 1248 | 24/24 checks pass across desktop and mobile-size projects. |
| Playwright WebKit 27.2, revision 2370, framework 627.1.2+ | 24/24 checks pass across desktop and mobile-size projects. Native bleaching not reproduced. |
| Older WebKit revision 2336, framework 626.1.1+ | 12/12 checks pass at mobile size using the cached executable. Framework build is recorded because the newer driver's reported browser version is not reliable for substituted binaries. |
| Native macOS Safari 27.0.1 | Manual controlled reproduction: legacy bleaches; alpha-only and full repair preserve the surface. |
| Firefox 157.0, revision 1555 | Local launch blocked before page tests: `Could not find profile folder`. No Firefox pass is claimed. Linux CI is configured to run it. |
| Older Firefox 142.0.1, revision 1495 | Launch also failed; framebuffer/sandbox diagnostics followed by timeout. No security settings were weakened. |
| Cached older WebKit revision 2215, framework 623.1.10+ | Current driver cannot create a page (`Unknown setting: PushAPIEnabled`); not a valid before/after compositor comparison. |
| Physical iOS Safari, including reported iPhone | Pending real-device acceptance below. |

The initial Safari-repair local run passed **48/48** primary browser checks (zero skipped or flaky), plus **12/12** with WebKit revision 2336. **32/32** unit/package tests, typecheck, lint, library build, studio production build, frozen-lockfile installation, all-severity dependency audit and archive inspection passed. The studio build emits existing Vite warnings about ignored client directives in its SPA bundle; the published library's client directive is preserved and tested.

The paused sage legacy/full-repair screenshots in working desktop engines differed by a mean of 0.16–0.18 channel values, with a maximum of 1 in Chromium and 3 in WebKit (0–255 range). This supports preserving the existing appearance where the straight-alpha path already works; it does not contradict the separate native Safari reproduction.

Browser screenshots, JSON deltas and traces are generated under ignored `.work/browser-results/`; the JSON report is `.work/browser-results.json`. The primary run report was preserved as `.work/browser-results-final-modern.json`, and the revision-2336 screenshots are in `.work/browser-results-webkit2336/`. CI fetches the legacy tag and runs all six projects. The table above records the original local investigation; release verification, including the Linux Firefox run, is tracked by the release PR. Local Firefox/older-engine infrastructure failures must not be reclassified as passing tests. Historical application investigations with desktop WebKit 26.0/26.5 are contextual evidence, not newly executed device coverage. No controlled physical Safari build comparison before/after the upstream fix was possible.

To use a compatible cached WebKit binary for the optional comparison project:

```sh
ATMOS_WEBKIT_EXECUTABLE=/absolute/path/to/pw_run.sh pnpm test:browser --project=webkit-comparison --output=.work/browser-results-comparison
```

## Separating integration defects

The minimal lab removes application CSS, parent masks, theme cascades, navigation and application hydration. Fixing only the paired alpha representation corrects the native lab's bleaching, which establishes a library/browser interaction independently of the shop.

Read-only inspection of Alma Lunar found an application-owned static decoration and a desktop/fine-pointer visibility guard. Its static decoration has its own gradient/mask implementation; updating the npm package will not change that local CSS. Preserve the guard until physical acceptance succeeds. Check parent opacity, mask/clip, isolation, overflow, transforms and stacking contexts separately if only the application still fails. Keep page backgrounds explicit and content above the decoration; do not change glass colors to compensate for a broken underlying composition.

The lab's SSR/hydration passes do not prove that unrelated application hydration warnings originate in Atmos. Investigate locale/date formatting and other mismatches independently. No shop source was edited.

## Physical iOS Safari acceptance

1. Record the exact iPhone model, iOS build, Safari version, display mode, orientation and Reduce Motion setting. Include the affected iPhone 17 Pro Max. If possible, repeat on OS/Safari builds before and after the upstream repair; record observed behavior rather than assuming release mapping from the WebKit commit.
2. Run `pnpm dev:compat` on the Mac. It binds port 4320 to all interfaces; on the same trusted LAN open `http://<Mac-LAN-IP>:4320` on the phone. Keep the test local. If the OS asks for local network/firewall access, the owner must allow it for the test. No deployment is necessary.
3. With motion paused, compare `?mode=none`, `?mode=legacy`, `?mode=alpha-fixed`, `?mode=webgl`, and `?mode=static`. Capture actual device screenshots at matching scroll positions on all five surfaces. Repeat WebGL with `intensity=0`, which must match no decoration, including glass panels. Check partial intensity, 1, and minimum/maximum spread. Reject white rectangles, dark fringes, disappearing palette colors or excessive bleaching.
4. Inspect the sticky header, rounded panel and fixed cookie banner while scrolling across each color. Keep their CSS unchanged between renderer modes. Distinguish a changed underlying image from a glass-style problem. Repeat with real application parent masks/stacking only after the isolated lab is correct.
5. Run `?case=matrix` and `?case=matrix&mode=static&spread=0.2`. Check every variant and edge/corner; centers remain quiet and edges remain visible. Scroll sections off-screen and back. There must be no blank decoration after context pressure.
6. Start motion (`?animate=1`), rotate portrait/landscape, resize via browser chrome, background Safari, switch tabs, lock/unlock and return. Toggle Reduce Motion in iOS while the page remains open. Motion must stop/resume appropriately without flashes or duplicate loops. Use Safari Web Inspector's context-loss extension when available; loss should show fallback and restoration redraw.
7. Exercise mount/unmount, zero-size recovery, palette/position changes, `auto → static → auto`, click-through buttons and the modal lightbox. Verify keyboard/external-keyboard focus and modal focus trapping remain normal. Look for console/hydration errors with remote Web Inspector.
8. In a local application branch, install the candidate tarball, rebuild Next.js, and inspect all affected routes including Instagram, peach panels, header, cookies, galleries/lightboxes and navigation back/forward. Keep device guards until this step passes. Store screenshots and precise failures; static mode is available if the repaired renderer still fails on a device.

## Updating a consumer

Update the package and rebuild the consuming application:

```sh
pnpm add @patrykparcheta/atmos@0.1.1
```

Commit the consumer lockfile and restart/rebuild Next.js. Existing component usage continues to work; `renderMode="static"` is optional. Repeat the physical-device acceptance above before removing application-specific workarounds. Desktop emulation alone does not justify removing them.

For testing a local candidate without publishing, run `pnpm pack --out .work/atmos-safari-candidate.tgz` in the library and install that absolute tarball path in an isolated consumer branch.
