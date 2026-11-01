// The production build for the end-to-end tests, into .next-e2e. Next.js points next-env.d.ts at the build it makes:
// put it back, so the dev server's .next stays the reference and the file doesn't change in git.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const nextEnv = readFileSync("next-env.d.ts", "utf8");
try {
  // The build never connects to MongoDB, but lib/mongodb.ts needs an address
  execFileSync("npx", ["next", "build"], { stdio: "inherit", env: { ...process.env, NEXT_DIST_DIR: ".next-e2e", MONGODB_URI: "mongodb://127.0.0.1:1/build" } });
} finally {
  writeFileSync("next-env.d.ts", nextEnv);
}
