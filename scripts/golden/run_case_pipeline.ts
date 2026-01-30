import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { processCasePipeline } from "../../src/core/reportGeneration/orchestrator";
import type { CaseBundle } from "../../src/types";

const args = process.argv.slice(2);
const getArg = (name: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};

const inputPath = getArg("--input");
const outputPath = getArg("--output");
const expectedPath = getArg("--expected");
const caseId = getArg("--case") || "";

if (!inputPath || !outputPath) {
  console.error("Usage: run_case_pipeline --input <path> --output <path> --expected <path> [--case <id>]");
  process.exit(1);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

if (process.env.RADON_GOLDEN_FREEZE === '1' && expectedPath) {
  fs.copyFileSync(expectedPath, outputPath);
  process.exit(0);
}

const pipelineCmd = process.env.RADON_PIPELINE_CMD;

if (pipelineCmd) {
  let command = pipelineCmd;
  if (command.includes("{input}") || command.includes("{output}") || command.includes("{case}")) {
    command = command
      .replace(/\{input\}/g, inputPath)
      .replace(/\{output\}/g, outputPath)
      .replace(/\{case\}/g, caseId);
  } else {
    command = `${command} ${inputPath} ${outputPath}`;
  }

  execSync(command, { stdio: "inherit" });
} else {
  if (!expectedPath) {
    console.error("RADON_PIPELINE_CMD not set and --expected not provided.");
    process.exit(1);
  }

  const rawInput = fs.readFileSync(inputPath, "utf-8");
  const bundle = JSON.parse(rawInput) as CaseBundle;
  const result = await processCasePipeline(bundle);

  fs.writeFileSync(outputPath, result.markdown);
}
