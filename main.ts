// main.ts — copies the finished artwork (art.png) byte-for-byte to the
// output directory as entry.png. Deterministic: the same bytes every run.
// No network access, no deletion of any directory.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const outDir: string = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const here: string = dirname(fileURLToPath(import.meta.url));
const source: string = resolve(join(here, "art.png"));
const target: string = resolve(join(outDir, "entry.png"));

mkdirSync(outDir, { recursive: true });
copyFileSync(source, target);
console.log("wrote " + target);
