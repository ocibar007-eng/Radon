import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { canonicalizeMarkdown } from "../../src/core/reportGeneration/canonicalizer";

const args = process.argv.slice(2);
const getArg = (name: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};

const inputPath = getArg("--input");
const outputPath = getArg("--output");

if (!inputPath || !outputPath) {
  console.error("Usage: canonicalize --input <path> --output <path>");
  process.exit(1);
}

const content = fs.readFileSync(inputPath, "utf-8");
const canonical = canonicalizeMarkdown(content);
const finalContent = canonical.text;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, finalContent);
