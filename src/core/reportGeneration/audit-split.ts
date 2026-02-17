const INTERNAL_AUDIT_START =
    /(?:^|\n)(?:---\n\n)?AUDITORIA INTERNA \(N(?:A|Ã)O COPIAR PARA O LAUDO\)/i;

export type SplitReportAudit = {
    report: string;
    audit: string;
};

export function splitReportAndAudit(markdown: string): SplitReportAudit {
    if (!markdown) return { report: '', audit: '' };

    const startIndex = markdown.search(INTERNAL_AUDIT_START);
    if (startIndex === -1) {
        return { report: markdown.trimEnd(), audit: '' };
    }

    const report = markdown.slice(0, startIndex).trimEnd();
    const audit = markdown.slice(startIndex).trim();
    return { report, audit };
}

export function mergeReportAndAudit(report: string, audit: string): string {
    const cleanReport = report.trimEnd();
    const cleanAudit = audit.trim();
    if (!cleanAudit) return cleanReport;
    if (!cleanReport) return cleanAudit;
    return `${cleanReport}\n\n${cleanAudit}`;
}

