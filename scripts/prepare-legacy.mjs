// Local comparison artifact only. Never part of the npm archive.
import {execFileSync} from "node:child_process";
import {mkdir, writeFile} from "node:fs/promises";
import {build} from "esbuild";

for (const directory of ["legacy", "alpha-fixed"]) {
  await mkdir(`.work/${directory}`, {recursive: true});
  for (const file of ["index.ts", "ambient-smoke.tsx", "resolve-options.ts", "shaders.ts", "types.ts"]) {
    let source = execFileSync("git", ["show", `v0.1.0:src/${file}`], {encoding: "utf8"});
    if (directory === "alpha-fixed") {
      source = source.replace("premultipliedAlpha: false", "premultipliedAlpha: true").replace("vec4(color, alpha)", "vec4(color * alpha, alpha)");
    }
    await writeFile(`.work/${directory}/${file}`, source);
  }
  await build({entryPoints: [`.work/${directory}/index.ts`], outfile: `.work/${directory}/index.js`, bundle: true, format: "esm", jsx: "automatic", external: ["react", "react/jsx-runtime"]});
}
