# Atmos architecture

Atmos is a TypeScript React library for slow, decorative smoke backgrounds. The library has five motion variants, eight edge positions, configurable colors, light and dark rendering, optional pointer interaction, and reduced-motion support. It keeps the center quiet and renders underneath page content.

The root package contains the renderer, GLSL shaders, public TypeScript types, and a shared configuration normalizer. React is a peer dependency; the package does not require Tailwind, shadcn/ui, a CSS import, a server, or a third-party service. The public entry exports `Atmos`, the equivalent `AmbientSmoke` name, and their prop types. Builds preserve the `use client` directive for Next.js and remain safe to import during server rendering.

`studio/` is a separate Vite React application using the same library source. It uses Tailwind CSS and local shadcn/ui components. All interface copy, sample content, code examples, and documentation are English. The header uses plain text, without a logo or registered-trademark symbol.

The npm archive includes only compiled ESM, declarations, TypeScript sources, package metadata, the README, and the MIT license. Tests and the studio stay in GitHub. The public repository is `xpatrykk/atmos`; npm uses the authenticated account's scope because the unscoped `atmos` name is already owned by another project.

Vercel builds the studio from the repository root and serves `studio/dist`. No environment variables or database connections are needed. GitHub Actions validates pull requests and pushes; npm releases are performed explicitly after verification.
