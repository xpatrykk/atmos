# Atmos Public Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Publish Atmos as an open-source TypeScript React library with an English studio on Vercel.

**Architecture:** A standalone repository contains the npm library at its root and the Vite studio in `studio/`. The studio consumes the canonical library source. Builds generate ESM and TypeScript declarations, with React kept external.

**Tech Stack:** TypeScript, React, esbuild, Vite, Tailwind CSS, shadcn/ui, Node.js tests, GitHub Actions, npm, Vercel.

**Spec:** `docs/architecture.md` and the user's request for a public Atmos library, English content, npm distribution, GitHub source, and a Vercel studio without a logo.

## Global Constraints

- The project is named Atmos. The npm package uses the authenticated npm account's scope if `atmos` is unavailable.
- All public copy and documentation are English. Use a plain-text header without a logo.
- Do not copy unrelated application code, history, credentials, or configuration into this repository.
- Keep React external and preserve the Next.js client boundary.
- Preserve all five animations, eight edge positions, theme controls, and accessibility behavior.
- Publish only the intended library files and use the MIT license.

## Review Focus

- A server rendering the component must not need browser globals or WebGL.
- Invalid, short, long, or immutable color palettes must be normalized without mutation.
- Paused, reduced-motion, off-screen, and unmounted components must not leak render loops or listeners.
- A consumer installing the npm archive must receive working exports and declarations without studio dependencies.
- The Vercel production URL must be accessible without authentication and show the English studio.

### Task 1: Reusable package

**Files:** `package.json`, `src/`, `scripts/build.mjs`, `tsconfig.json`, `tsconfig.build.json`, `tests/`.

**Interfaces:** Export `Atmos`, `AmbientSmoke`, `AtmosProps`, `AmbientSmokeProps`, `SmokePosition`, and `SmokeVariant`. The studio uses these types and components.

- [ ] Write configuration tests for defaults, HEX normalization, palette limits, immutability, and finite numeric bounds; verify the new normalizer is initially missing.
- [ ] Extract the prototype into the standalone repository and implement normalization without changing the five motion fields.
- [ ] Build ESM and declarations with a preserved `use client` boundary and React peer dependency.
- [ ] Verify server rendering, public imports, package file selection, and the installed tarball in a consumer.

### Task 2: English studio and documentation

**Files:** `studio/`, `README.md`, `LICENSE`, `CONTRIBUTING.md`, `CHANGELOG.md`, `.github/workflows/ci.yml`.

**Interfaces:** The studio imports the package entry and generates installation and JSX examples matching the actual npm name.

- [ ] Move the existing studio UI to the standalone repository and point it at the canonical package source.
- [ ] Translate all interface copy, accessibility labels, sample content, and examples; remove the logo, favicon artwork, and trademark marks.
- [ ] Write English installation, configuration, accessibility, performance, fallback, contribution, and release documentation.
- [ ] Verify studio types, lint, build, five variants, eight positions, themes, configuration export, and browser logs.

### Task 3: Public release

**Files:** `vercel.json`, Git repository metadata, release artifacts.

**Interfaces:** Public GitHub repository, npm package/version, and Vercel production URL.

- [ ] Review the finished package and repository contents before publication.
- [ ] Create `xpatrykk/atmos` as a public MIT-licensed repository and push the verified source.
- [ ] Create the Vercel project in the existing user's team, link the exact repository and build settings, deploy, and verify public access.
- [ ] Publish the inspected archive through the authenticated npm account; resolve any user-controlled login or 2FA step without handling credentials.
- [ ] Verify registry metadata and a clean registry installation, create the version tag and GitHub release, and return the three public links.
