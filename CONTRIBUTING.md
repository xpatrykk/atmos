# Contributing to Atmos

Use Node.js 22 and the package's pinned pnpm 11.19.0. Run `corepack enable`, `pnpm install --frozen-lockfile`, then `pnpm dev` for the studio at http://127.0.0.1:4317. Keep `pnpm-lock.yaml` as the sole dependency lockfile.

The root `src/` directory owns the reusable component, shaders, types, and option normalization. `studio/` owns the playground. The playground imports the canonical library source through a Vite alias; it does not keep a second renderer.

Before opening a pull request, run:

```sh
pnpm security:audit
pnpm verify
pnpm exec playwright install chromium firefox webkit
pnpm test:browser
pnpm pack --dry-run
```

Keep the motion subtle, the center quiet, and all public copy in English. Preserve reduced-motion behavior, server rendering, resource cleanup, and the static fallback. Add meaningful tests for changed behavior. Do not add mandatory runtime styling or studio dependencies to the library.

Run a fresh `pnpm security:audit` before each commit, push, or PR creation/update. Every severity blocks; registry errors are failures. CI runs the same audit on pushes, PRs, daily, and manually. Maintainers should require the **Dependency audit** status in branch protection; local workflow changes alone do not enforce GitHub branch settings.

Browser tests compare actual screenshots with a Canvas 2D reference and calculated alpha mixing. Read [Safari rendering and acceptance](./docs/safari-rendering.md) before changing alpha, masking, context lifecycle, or browser support claims. The lab extracts the original release from tag `v0.1.0` into ignored `.work/`; do not ship this duplicate implementation. Use `git fetch --tags` when needed. CI checks out full history.

## Releasing

1. Update the version in the root `package.json`, run `pnpm install --lockfile-only`, and add a changelog entry.
2. Run the audit, `pnpm verify`, browser regressions and real-device acceptance when rendering changes. Inspect `pnpm pack --dry-run`. The archive must contain only the intended library build, sources, README, license, and metadata.
3. Commit and push the verified release. Vercel builds the studio from the production branch.
4. Authenticate with `npm login` and publish using `npm publish --access public`. Complete npm's own authentication and 2FA prompts when required. Never commit tokens or put them in shell command arguments.
5. Verify the registry version and install it in a clean consumer. Create the corresponding Git tag and GitHub release.

The npm scope belongs to the publishing account. The display name remains Atmos. A registry version is immutable; corrections require a new version.
