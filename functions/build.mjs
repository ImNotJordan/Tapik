// Bundles src/ into lib/index.js. Bundling lets Functions import the app's shared
// modules (lib/schemas, lib/firebase/model) through the "@/..." alias, so the
// same zod schemas validate in the browser and on the server.
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

await build({
  entryPoints: [path.join(here, "src/index.ts")],
  outfile: path.join(here, "lib/index.js"),
  bundle: true,
  platform: "node",
  target: "node24",
  format: "cjs",
  sourcemap: true,
  // Provided by functions/node_modules at runtime.
  external: ["firebase-admin", "firebase-admin/*", "firebase-functions", "firebase-functions/*", "sharp"],
  alias: { "@": root },
  // zod and nanoid resolve from the app's node_modules and are bundled in.
  nodePaths: [path.join(root, "node_modules")],
  logLevel: "warning",
});
console.log("functions: built lib/index.js");
