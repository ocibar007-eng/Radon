import fs from "node:fs";
import path from "node:path";
import { caseBundleFromMarkdown } from "../src/core/reportGeneration/markdown-to-casebundle";

const CASE_DIRS = [
  path.join("tests", "golden-set", "golden_test"),
  path.join("tests", "golden-set", "cases"),
];

const findInputMarkdown = (caseDir: string) => {
  const preferred = path.join(caseDir, "input.md");
  if (fs.existsSync(preferred)) {
    return preferred;
  }
  const entries = fs.readdirSync(caseDir);
  const laudo = entries.find((name) => name.toLowerCase().startsWith("laudo_"));
  if (laudo) {
    return path.join(caseDir, laudo);
  }
  const mdFallback = entries.find((name) => name.toLowerCase().endsWith(".md"));
  return mdFallback ? path.join(caseDir, mdFallback) : null;
};

for (const baseDir of CASE_DIRS) {
  if (!fs.existsSync(baseDir)) {
    continue;
  }

  for (const entry of fs.readdirSync(baseDir)) {
    const caseDir = path.join(baseDir, entry);
    if (!fs.statSync(caseDir).isDirectory()) {
      continue;
    }

    const inputPath = findInputMarkdown(caseDir);
    if (!inputPath) {
      continue;
    }

    const markdown = fs.readFileSync(inputPath, "utf-8");
    const bundle = caseBundleFromMarkdown({
      caseId: entry,
      markdown,
      sourcePath: inputPath,
    });
    const outputPath = path.join(caseDir, "input.json");

    fs.writeFileSync(outputPath, JSON.stringify(bundle, null, 2) + "\n");
  }
}
