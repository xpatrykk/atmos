# Contributing to Atmos

Use Node.js 22 and npm. Run `npm ci`, then `npm run dev` for the studio at http://127.0.0.1:4317.

The root `src/` directory owns the reusable component, shaders, types, and option normalization. `studio/` owns the playground. The playground imports the canonical library source through a Vite alias; it does not keep a second renderer.

Before opening a pull request, run:

```sh
npm run verify
npm pack --dry-run
```

Keep the motion subtle, the center quiet, and all public copy in English. Preserve reduced-motion behavior, server rendering, resource cleanup, and the static fallback. Add meaningful tests for changed behavior. Do not add mandatory runtime styling or studio dependencies to the library.

## Releasing

1. Update the version in the root `package.json`, run `npm install --package-lock-only`, and add a changelog entry.
2. Run `npm run verify` and inspect `npm pack --dry-run`. The archive must contain only the intended library build, sources, README, license, and metadata.
3. Commit and push the verified release. Vercel builds the studio from the production branch.
4. Authenticate with `npm login` and publish using `npm publish --access public`. Complete npm's own authentication and 2FA prompts when required. Never commit tokens or put them in shell command arguments.
5. Verify the registry version and install it in a clean consumer. Create the corresponding Git tag and GitHub release.

The npm scope belongs to the publishing account. The display name remains Atmos. A registry version is immutable; corrections require a new version.
