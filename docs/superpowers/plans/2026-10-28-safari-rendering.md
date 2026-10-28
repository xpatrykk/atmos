# Safari rendering repair plan

Scope: repair the existing renderer and fallback, preserve the public API, add a local compatibility lab and regressions. Do not publish, deploy, push, or modify the integrating shop.

1. Characterize v0.1.0 and upstream WebKit evidence. Create a local lab with five surfaces, glass overlays, WebGL/static/none modes and scrolling instances. Compare actual screenshots with a Canvas 2D composition reference; keep legacy code in ignored test artifacts only.
2. Write failing lifecycle regressions for context restoration, missing APIs, initialization failure and Strict Mode. Add compositor pixel tests for transparent/partial alpha, intensity zero, fallback visibility and a five-variant/eight-position matrix.
3. Pair premultiplied WebGL with premultiplied shader output; explicitly clear transparent buffers and disable internal blending. Keep fallback until the first successful draw. Hide failed canvases; rebuild GPU resources on restoration; guard optional browser APIs and resume/resize events. Keep static behavior available without UA detection.
4. Verify with unit tests, types, lint, library/studio builds and Chromium/Firefox/WebKit screenshots in desktop/mobile-sized viewports. Record versions and limitations, and provide physical iOS acceptance steps. Update README/changelog and propose 0.1.1 without publishing it.

Evidence boundary: desktop WebKit does not establish physical iPhone compatibility. The upstream commit is evidence about WebKit's straight-alpha path, not proof of the Alma Lunar incident. CSS masks, stacking and backdrop-filter integration must be inspected independently.
