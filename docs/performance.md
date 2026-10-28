# Performance contract in 0.1.1

Atmos keeps the existing five motion fields, eight anchors, palette interpolation, masks, grain, high precision, premultiplied compositing, 30 fps budget and DPR/resolution limits. The performance changes do not modify GLSL. Existing props, aliases, TypeScript contracts and React peer requirements remain compatible.

## Work that is avoided

- `intensity=0` hides the canvas and skips context allocation and GPU drawing. The CPU simulation clock and pointer smoothing continue at the existing cadence while visible, so returning to positive intensity does not reset the motion. Off-screen, hidden-tab, paused and reduced-motion behavior still applies.
- Colors are converted and uploaded when their normalized values change. Resolution, anchors and other configuration uniforms update independently. A fresh renderer after context restoration has empty caches and uploads the complete state.
- Pointer events retain the latest coordinates; the next accepted frame maps them using the current container bounds. Event bursts and off-screen events do not repeatedly measure layout. A pointer leave preserves the last coordinates while setting the influence target to zero, retaining the original decay trajectory.
- Frames rejected by the existing FPS limiter do not read layout. Canvas/fallback visibility and diagnostic attributes change only on renderer-state transitions.
- Equivalent normalized props do not invalidate a paused frame. Real changes, including a palette with the same array identity but changed contents on a subsequent parent render, still update the renderer. Normalization remains value-based; there is no unbounded global cache.

## Observed operation counts

These are instrumented headless Chromium 156.0.8078.4 observations on the local compatibility lab, at 1100 × 850, recorded October 28, 2026. The samples are approximately one second, after initialization. They count operations rather than GPU duration or device battery consumption; differing draw totals are not an FPS improvement claim.

| Scenario | Before optimization | After optimization |
| --- | --- | --- |
| Two active instances, intensity zero | 44 draws, 572 uniform calls | 0 draws, 0 uniform calls, no contexts allocated |
| Unchanged active frame | 13 uniform calls per draw | 3 per draw: time, pointer, pointer strength |
| Two active instances, layout reads | 118 reads / 46 draws | 42 reads / 42 draws |
| Two active instances, canvas attribute writes | 46 | 0 after initialization |
| 100 pointer events across 40 mounted instances | 4000 layout reads inside handlers | 0 inside handlers; mapping occurs on the next rendered frame |
| Unrelated parent state change with two paused instances | 2 additional draws | 0 additional draws |

No phone performance percentage is inferred from these desktop counts. GPU cost of the visible smoke shader remains unchanged.

## Regressions and acceptance

The browser suite compares all 40 variant/position combinations against the original 0.1.0 renderer with its alpha representation corrected. It fixes simulation phase to 3.75, pointer to `[0.23, 0.71]`, influence to 0.35 and grain to 0.3, and requires **zero differing channel values** in final page screenshots within each browser. It does not replace lifecycle tests: unit regressions separately check phase continuation through zero intensity, pointer smoothing and leave trajectories, real prop changes, independent uniform updates and cache reset after context restoration.

Browser checks also verify zero-allocation rendering, no redundant paused redraws, pointer-burst layout behavior and the existing fallback, hydration, context-loss, reduced-motion, viewport and resize flows. The regression for retained zero intensity now requires a hidden fallback after remount and explicitly returns to positive intensity before requiring a GPU frame.

Run `pnpm verify`, `pnpm security:audit` and `pnpm test:browser`. The compatibility lab's `case=single`, `variant`, `position` and `grain` query parameters reproduce individual visual cases. See [Safari rendering and acceptance](./safari-rendering.md) for physical iOS acceptance and the original compositing diagnosis. Desktop screenshots cannot certify physical iOS behavior.
