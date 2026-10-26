// Bundles scripts/nightly.ts (and everything it imports from src/lib) into a single
// CommonJS file for the Nebius Serverless Job Docker image. Run with `npm run build:job`.
import { build } from "esbuild";

await build({
  entryPoints: ["scripts/nightly.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile: "dist-job/nightly.cjs",
  tsconfig: "tsconfig.json",
  logLevel: "info",
  external: ["bufferutil", "utf-8-validate"], // optional ws deps some transitive libs probe for
});
