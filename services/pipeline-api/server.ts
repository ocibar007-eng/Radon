import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { caseBundleFromMarkdown } from '../../src/core/reportGeneration/markdown-to-casebundle';
import { processCasePipeline } from '../../src/core/reportGeneration/orchestrator';
import { CaseBundleSchema, type CaseBundle } from '../../src/types/case-bundle';

const app = express();

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((value) => value.trim())
  : true;

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '8mb' }));

const requireToken = (req: express.Request, res: express.Response): boolean => {
  const required = process.env.PIPELINE_TOKEN;
  if (!required) return true;
  const provided = req.header('x-radon-token');
  if (!provided || provided !== required) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
};

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/run', async (req, res) => {
  if (!requireToken(req, res)) return;

  const { input_type, payload, case_id } = req.body || {};

  try {
    if (!input_type || payload == null) {
      res.status(400).json({ error: 'input_type and payload are required' });
      return;
    }

    let bundle: CaseBundle;

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

    res.json({
      markdown: result.markdown,
      report: result.report,
      qa: result.qa,
      risk: result.risk,
    });
  } catch (error: any) {
    console.error('[PipelineAPI] Error:', error);
    res.status(500).json({ error: 'Pipeline failed', details: error?.message });
  }
});

const port = Number(process.env.PORT || 7070);
app.listen(port, () => {
  console.log(`[PipelineAPI] listening on ${port}`);
});
