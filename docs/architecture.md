# Atmos architecture

Atmos is a TypeScript React library for slow, decorative smoke backgrounds. The library has five motion variants, eight edge positions, configurable colors, light and dark rendering, optional pointer interaction, and reduced-motion support. It keeps the center quiet and renders underneath page content.

The root package contains the renderer, GLSL shaders, public TypeScript types, and a shared configuration normalizer. React is a peer dependency; the package does not require Tailwind, shadcn/ui, a CSS import, a server, or a third-party service. The public entry exports `Atmos`, the equivalent `AmbientSmoke` name, and their prop types. Builds preserve the `use client` directive for Next.js and remain safe to import during server rendering.

`studio/` is a separate Vite React application using the same library source. It uses Tailwind CSS and local shadcn/ui components. All interface copy, sample content, code examples, and documentation are English. The header uses plain text, without a logo or registered-trademark symbol.

The npm archive includes only compiled ESM, declarations, TypeScript sources, package metadata, the README, and the MIT license. Tests and the studio stay in GitHub. The public repository is `xpatrykk/atmos`; npm uses the authenticated account's scope because the unscoped `atmos` name is already owned by another project.

Vercel builds the studio from the repository root and serves `studio/dist`. No environment variables or database connections are needed. GitHub Actions validates pull requests and pushes; npm releases are performed explicitly after verification.

The component delegates GPU allocation/drawing to `create-renderer.ts` and browser lifecycle to `mount-renderer.ts`. Both the WebGL context and fragment output use premultiplied alpha. This is a single full-buffer pass with GL blending disabled; the browser composites the transparent canvas over HTML. Clearing uses transparent black. Preserve this paired representation in every rendering path.

The static decoration stays server-renderable and visible until a successful frame. It uses two nested masked elements with standard and WebKit-prefixed mask images, avoiding incompatible mask-composite operators. `renderMode="static"` never requests a context. Context loss reveals the same fallback and restoration rebuilds invalid resources. A component owns its context; allocation is deferred off-screen and at zero size, with no global context pool. GPU objects are released on effect cleanup, while deliberate context loss is limited to detached canvases so a retained DOM node can reconnect.

`tests/browser/` owns a standalone compatibility lab with actual page screenshot comparisons, glass overlays, scrolling sections, and a 40-combination variant/position matrix. Baseline release and alpha-only comparison modules are generated into ignored `.work/` from Git; they are not runtime dependencies or published files. See [Safari rendering and acceptance](./safari-rendering.md) for evidence and limits.

A non-continuous GPU frame is replayed once in the next RAF with an immutable snapshot of phase, pointer, options and geometry. This deliberately handles compositors that present the previous buffer; it does not advance the simulation or create an idle animation loop. Both RAF handles belong to the instance and are cancelled together on loss, suspension and disposal. Preserve the no-readback screenshot regression when changing this presentation boundary.
