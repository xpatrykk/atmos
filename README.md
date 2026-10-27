# Atmos

Subtle, interactive smoke backgrounds for React. Organic motion, your colors, and room for what matters.

[Source](https://github.com/xpatrykk/atmos) · [npm](https://www.npmjs.com/package/@xpatrykk/atmos) · [MIT license](./LICENSE)

## Install

```sh
npm install @xpatrykk/atmos
```

Requires React 18.2 or 19. Written in TypeScript, with declarations and an ESM build. React is the only runtime peer dependency. The component does not require Tailwind, shadcn/ui, a stylesheet, an API key, or a server.

## Quick start

```tsx
import {Atmos} from "@xpatrykk/atmos";

export default function Home() {
  return (
    <main
      style={{
        position: "relative",
        isolation: "isolate",
        overflow: "hidden",
        minHeight: "100vh",
        background: "#101012",
        color: "#eeece6",
      }}
    >
      <Atmos
        colors={["#D0804F", "#B45E72", "#7A70C5"]}
        variant="haze"
        position="bottom"
        intensity={0.7}
        speed={0.6}
      />
      <div style={{position: "relative", zIndex: 1}}>
        <h1>Leave room for imagination.</h1>
      </div>
    </main>
  );
}
```

With Tailwind, the container can use `relative isolate min-h-screen overflow-hidden bg-[#101012]`, and the content can use `relative z-10`.

`AmbientSmoke` is an equivalent component export. `AtmosProps`, `AmbientSmokeProps`, `SmokeVariant`, and `SmokePosition` are exported as TypeScript types.

## Five variations

| Variant | Character |
| --- | --- |
| `haze` | Soft, interweaving clouds |
| `aurora` | Flowing curtains of light |
| `ink` | Deep, slow-moving swirls |
| `silk` | Light ribbons and gentle folds |
| `bloom` | Diffused, breathing light |

Each variation uses a different motion field. Changing the variation preserves your palette.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `colors` | `readonly string[]` | Terracotta, rose, lavender | Two to six HEX colors, including shorthand such as `#abc` |
| `variant` | `SmokeVariant` | `"haze"` | One of the five variations above |
| `position` | `SmokePosition` | `"bottom"` | The edge or corner where the effect appears |
| `theme` | `"light" \| "dark"` | `"dark"` | Adjusts the rendering for your surface |
| `intensity` | `number` | `0.65` | Overall opacity, clamped to 0–1 |
| `speed` | `number` | `0.6` | Motion multiplier, clamped to 0–2; 0 stops time |
| `spread` | `number` | `0.8` | Reach from the edge, clamped to 0.2–1 |
| `grain` | `number` | `0.3` | Fine film grain, clamped to 0–1 |
| `interactive` | `boolean` | `true` | Gently distort the smoke near a mouse or pen pointer |
| `paused` | `boolean` | `false` | Freeze the current animation frame |
| `className` | `string` | — | Optional class on the decorative wrapper |

Available positions: `top-left`, `top`, `top-right`, `left`, `right`, `bottom-left`, `bottom`, `bottom-right`.

Invalid HEX values are ignored. If fewer than two valid colors remain, Atmos uses its default palette. At most six colors are used. Non-finite numeric controls use their defaults. Input palettes are never modified.

## Light and dark mode

Atmos is transparent. Set your page's background and text colors yourself, then pass the matching theme:

```tsx
<Atmos theme={isDark ? "dark" : "light"} position="bottom-right" />
```

The component does not read or change your application's theme. Multiple instances can decorate separate sections. Each instance fills its positioned parent and clips the effect to that parent's bounds.

## Next.js

The published entry preserves `"use client"`. You can import `Atmos` into an App Router page or layout, including a Server Component. Pass serializable props and place your content above the decorative layer. Browser APIs are used only in effects, so server rendering does not require WebGL.

## Accessibility and performance

- The effect is decorative (`aria-hidden`) and does not intercept clicks (`pointer-events: none`).
- `prefers-reduced-motion: reduce` produces a still frame and disables pointer distortion.
- Rendering pauses outside the viewport and in hidden tabs. Unmounting releases the animation frame, observers, event listeners, and GPU resources.
- Resolution is capped at 1400 × 1000 and device pixel ratio at 1.5. Motion renders at up to 30 fps.
- If WebGL is unavailable, shader initialization fails, or the context is lost, a static CSS gradient remains visible. The fallback is simpler than the animated renderer.

The edge mask stays independent of turbulence, and the center fades out. Content should have its own higher layer. If you put text directly at a colorful edge, give it an opaque surface when necessary; Atmos cannot automatically detect or protect arbitrary content rectangles. It is a decorative procedural shader, not a physical fluid simulation.

## Run the studio

```sh
git clone https://github.com/xpatrykk/atmos.git
cd atmos
npm ci
npm run dev
```

Open [localhost:4317](http://127.0.0.1:4317). The studio uses React, Tailwind CSS 4, and local shadcn/ui components built on Radix. Pick a variation, adjust its palette and placement, and use **Use in your project** to copy or download an example with your current settings. The studio and documentation are entirely in English.

```sh
npm run check         # TypeScript, ESLint, and tests
npm run build         # Library ESM and declarations in dist/
npm run build:studio  # Production studio in studio/dist/
npm pack --dry-run    # Inspect the npm archive
```

Vercel uses the root `vercel.json` to build and serve the studio. It requires no environment variables. See [CONTRIBUTING.md](./CONTRIBUTING.md) for development and release instructions.

## License

[MIT](./LICENSE) © 2026 xpatrykk.
