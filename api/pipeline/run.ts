import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { caseBundleFromMarkdown, processCasePipeline, CaseBundleSchema } = require('./bundle.cjs');

function parseBody(req: any) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return null;
}

function requireToken(req: any, res: any): boolean {
  const required = process.env.PIPELINE_TOKEN;
  if (!required) return true;
  const provided = req.headers?.['x-radon-token'];
  if (!provided || provided !== required) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

export default async function handler(req: any, res: any) {
  if (req.method && req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  if (!requireToken(req, res)) return;

  const body = parseBody(req);
  if (!body) {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const { input_type, payload, case_id } = body;

  if (!input_type || payload == null) {
    res.status(400).json({ error: 'input_type and payload are required' });
    return;
  }

  try {
    let bundle: any;

    if (input_type === 'markdown') {
      if (typeof payload !== 'string') {
        res.status(400).json({ error: 'payload must be a string for markdown' });
        return;
      }
      const caseId = typeof case_id === 'string' && case_id.trim().length > 0
        ? case_id
        : `case_${crypto.randomUUID().slice(0, 8)}`;
      bundle = caseBundleFromMarkdown({
        caseId,
        markdown: payload,
        sourcePath: 'api:markdown',
      });
    } else if (input_type === 'casebundle') {
      const parsed = CaseBundleSchema.safeParse(payload);
      if (!parsed.success) {
        res.status(400).json({ error: 'payload is not a valid CaseBundle' });
        return;
      }
      bundle = parsed.data;
      if (!bundle.case_id) {
        bundle = { ...bundle, case_id: `case_${crypto.randomUUID().slice(0, 8)}` };
      }
    } else {
      res.status(400).json({ error: 'input_type must be markdown or casebundle' });
      return;
    }

    const result = await processCasePipeline(bundle);

    res.status(200).json({
      markdown: result.markdown,
      report: result.report,
      qa: result.qa,
      risk: result.risk,
    });
  } catch (error: any) {
    console.error('[PipelineAPI] Error:', error);
    res.status(500).json({ error: 'Pipeline failed', details: error?.message });
  }
}
