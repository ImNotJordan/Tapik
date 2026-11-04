// Starts the Firebase Emulator Suite (project demo-tapik) with Java from JAVA_HOME first on PATH.
// firebase-tools needs Java 21+; on Windows a system-wide older Java can shadow the user's JDK.
//   node scripts/emulators.mjs            fresh emulators
//   node scripts/emulators.mjs --persist  import/export .emulator-data
import { spawn, spawnSync, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const persist = process.argv.includes("--persist");
const env = { ...process.env };
if (env.JAVA_HOME) env.PATH = `${path.join(env.JAVA_HOME, "bin")}${path.delimiter}${env.PATH ?? env.Path ?? ""}`;
if (process.platform === "win32") delete env.Path; // avoid two PATH keys on Windows

// `java -version` prints to stderr.
const ver = spawnSync("java", ["-version"], { env, encoding: "utf8" }).stderr ?? "";
const major = Number((/version "(\d+)/.exec(ver) ?? [])[1] ?? 0);
if (major && major < 21) {
  console.error(`The emulators need Java 21+, found Java ${major}. Set JAVA_HOME to a JDK 21 (see DEPLOY.md).`);
  process.exit(1);
}

execFileSync("npm", ["--prefix", "functions", "run", "build"], { stdio: "inherit", shell: true, env });

const args = ["emulators:start", "--project", "demo-tapik", "--only", "auth,firestore,storage,functions"];
if (persist) {
  fs.mkdirSync(".emulator-data", { recursive: true });
  args.push("--import", ".emulator-data", "--export-on-exit", ".emulator-data");
}
const child = spawn("npx", ["firebase", ...args], { stdio: "inherit", shell: true, env });
child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
