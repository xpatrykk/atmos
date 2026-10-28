# Changelog

## 0.1.1 — 2026-10-28

- Avoid Safari straight-alpha compositing artifacts by pairing `premultipliedAlpha: true` with premultiplied RGB shader output, transparent clearing, and explicit disabled GL blending.
- Keep the CSS fallback visible until the first successful GPU frame. Recover from lost/restored contexts and hide failed canvases after context, shader, link, buffer, or draw failures.
- Use nested standard and WebKit-prefixed masks instead of `mask-composite: intersect`; retain every configured fallback palette color.
- Add optional `renderMode="static"` without changing existing defaults or exports. Switching back to `auto` creates a usable canvas.
- Defer contexts until a visible, nonzero container needs one; handle missing browser APIs, live reduced-motion changes, page resume, resize/orientation/DPR changes, Strict Mode, and retained-canvas effect reconnection.
- Clean up listeners, observers, frames and GPU resources; release contexts of detached canvases when supported.
- Add a compositor comparison lab, pixel and lifecycle browser regressions, native Safari evidence, and physical iOS acceptance instructions.
- Skip invisible GPU allocation/drawing at zero intensity while retaining the animation clock and pointer smoothing for a continuous return.
- Cache unchanged palette conversion, uniforms and viewport configuration; reinitialize caches after context restoration.
- Batch pointer input into the existing frame loop and avoid layout reads on skipped frames and off-screen pointer events.
- Avoid redundant paused redraws for equivalent normalized props and repeated DOM writes for unchanged renderer state.
- Replay still frames once without advancing simulation state so first/updated frames reach delayed WebKit GTK compositors; cancel the bounded replay on loss, suspension and cleanup.
- Preserve the shader, noise, masks, precision, resolution, frame budget and public defaults during the performance changes. Add a 40-combination pixel equality regression against the alpha-corrected original renderer.
- Standardize repository tooling and CI on pinned pnpm with a frozen lockfile and all-severity dependency audit.

## 0.1.0 — 2026-10-27

- Initial TypeScript React package with `Atmos` and `AmbientSmoke` exports.
- Five procedural WebGL motion variants and eight edge positions.
- Custom palettes, theme adaptation, pointer distortion, and motion controls.
- Reduced-motion support, viewport and tab visibility handling, and a static fallback.
- An English studio built with Tailwind CSS and shadcn/ui.
