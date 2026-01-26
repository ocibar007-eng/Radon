import fs from "node:fs";
import path from "node:path";

const CASE_DIRS = [
  path.join("tests", "golden-set", "golden_test"),
  path.join("tests", "golden-set", "cases"),
];

const SECTION_KEYS = {
  case_metadata: "CADASTRO DO ATENDIMENTO",
  clinical_context: "RESUMO CLINICO (DADOS ADMINISTRATIVOS E ASSISTENCIAIS)",
  clinical_context_alt: "RESUMO CLINICO",
  prior_reports: "LAUDOS PREVIOS NA INTEGRA (DOCUMENTO ORIGINAL)",
  prior_reports_alt: "LAUDOS PREVIOS NA INTEGRA",
  dictation: "TRANSCRICOES DE DITADO",
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

const splitSections = (markdown: string) => {
  const sections: Record<string, string[]> = {};
  let current = "__ROOT__";
  sections[current] = [];

  for (const line of markdown.split(/\n/)) {
    if (line.startsWith("# ")) {
      current = line.slice(2).trim();
      if (!sections[current]) {
        sections[current] = [];
      }
      continue;
    }
    sections[current].push(line);
  }

  return sections;
};

const getSection = (sections: Record<string, string[]>, key: string) => {
  return (sections[key] || []).join("\n").trim();
};

const parseMetadataFields = (raw: string) => {
  const fields: Record<string, string> = {};
  for (const line of raw.split(/\n/)) {
    const match = line.match(/^[\s\-•]*\*\*(.+?)\*\*\s*:?[\s]*(.*)$/);
    if (match) {
      const name = match[1].trim().replace(/:$/, "");
      const value = match[2].trim();
      if (name.length > 0) {
        fields[name] = value;
      }
    }
  }
  return fields;
};

const toCaseBundle = (caseId: string, inputPath: string, markdown: string) => {
  const sections = splitSections(markdown);

  const normalizedSections: Record<string, string[]> = {};
  for (const [title, lines] of Object.entries(sections)) {
    normalizedSections[normalize(title)] = lines;
  }

  const caseMetadataRaw =
    getSection(normalizedSections, normalize(SECTION_KEYS.case_metadata)) || "";
  const clinicalContextRaw =
    getSection(normalizedSections, normalize(SECTION_KEYS.clinical_context)) ||
    getSection(normalizedSections, normalize(SECTION_KEYS.clinical_context_alt)) ||
    "";
  const priorReportsRaw =
    getSection(normalizedSections, normalize(SECTION_KEYS.prior_reports)) ||
    getSection(normalizedSections, normalize(SECTION_KEYS.prior_reports_alt)) ||
    "";
  const dictationRaw =
    getSection(normalizedSections, normalize(SECTION_KEYS.dictation)) || "";

  return {
    case_id: caseId,
    case_metadata: {
      fields: parseMetadataFields(caseMetadataRaw),
      raw_markdown: caseMetadataRaw,
    },
    clinical_context: {
      raw_markdown: clinicalContextRaw,
    },
    dictation_raw: dictationRaw,
    exam_data: {
      raw_markdown: "",
      notes: "",
    },
    prior_reports: {
      raw_markdown: priorReportsRaw,
    },
    attachments_summary: null,
    source: {
      format: "markdown",
      path: inputPath,
    },
    raw_input_markdown: markdown,
  };
};

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
    const bundle = toCaseBundle(entry, inputPath, markdown);
    const outputPath = path.join(caseDir, "input.json");

    fs.writeFileSync(outputPath, JSON.stringify(bundle, null, 2) + "\n");
  }
}
