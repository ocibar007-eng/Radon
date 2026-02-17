import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import anthropicUsageHandler from '../../api/admin/anthropic-usage.ts';
import openaiDraftUsageHandler from '../../api/admin/openai-draft-usage.ts';
import generateReportClaudeStreamHandler from '../../api/generate-report-claude-stream.ts';
import generateReportGptStreamHandler from '../../api/generate-report-gpt-stream.ts';
import {
  getAvailableDomains,
  getRecommendationById,
  getStats,
  getTopicsByDomain,
  searchRecommendations,
} from '../../api/recommendations/search.ts';

type VercelStyleHandler = (req: any, res: any) => Promise<void> | void;

const firstString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
};

const toInteger = (value: unknown): number | undefined => {
  const raw = firstString(value);
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toFloat = (value: unknown): number | undefined => {
  const raw = firstString(value);
  if (!raw) return undefined;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const apiPort = Number(process.env.LOCAL_API_PORT || process.env.API_PORT || process.env.PORT || 3100);

if (!process.env.CALCULATOR_URL && !process.env.VITE_CALC_URL) {
  const localCalculatorUrl = `http://127.0.0.1:${apiPort}/api/calculator`;
  process.env.CALCULATOR_URL = localCalculatorUrl;
  process.env.VITE_CALC_URL = localCalculatorUrl;
}

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-radon-token');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true }));

const runVercelStyleHandler = (handler: VercelStyleHandler) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };
};

let pipelineRunHandlerPromise: Promise<VercelStyleHandler> | null = null;
let pipelineHealthHandlerPromise: Promise<VercelStyleHandler> | null = null;

const loadPipelineRunHandler = async (): Promise<VercelStyleHandler> => {
  if (!pipelineRunHandlerPromise) {
    pipelineRunHandlerPromise = import('../../api/pipeline/run.ts').then((mod) => mod.default);
  }
  return pipelineRunHandlerPromise;
};

const loadPipelineHealthHandler = async (): Promise<VercelStyleHandler> => {
  if (!pipelineHealthHandlerPromise) {
    pipelineHealthHandlerPromise = import('../../api/pipeline/health.ts').then((mod) => mod.default);
  }
  return pipelineHealthHandlerPromise;
};

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    mode: 'local-express',
    calculator_url: process.env.CALCULATOR_URL || null,
  });
});

app.post('/api/generate-report-claude-stream', runVercelStyleHandler(generateReportClaudeStreamHandler));
app.post('/api/generate-report-gpt-stream', runVercelStyleHandler(generateReportGptStreamHandler));
app.get('/api/admin/anthropic-usage', runVercelStyleHandler(anthropicUsageHandler));
app.get('/api/admin/openai-draft-usage', runVercelStyleHandler(openaiDraftUsageHandler));

app.get('/api/pipeline/health', async (req, res, next) => {
  try {
    const handler = await loadPipelineHealthHandler();
    await handler(req, res);
  } catch (error) {
    next(error);
  }
});

app.post('/api/pipeline/run', async (req, res, next) => {
  try {
    const handler = await loadPipelineRunHandler();
    await handler(req, res);
  } catch (error) {
    next(error);
  }
});

app.get('/api/recommendations/search', (req, res, next) => {
  try {
    const domain = firstString(req.query.domain);
    const topic = firstString(req.query.topic);
    const finding = firstString(req.query.finding);
    const recType = firstString(req.query.rec_type);
    const sourceId = firstString(req.query.source_id);
    const query = firstString(req.query.query);

    const minConfidenceRaw = toFloat(req.query.min_confidence);
    const limitRaw = toInteger(req.query.limit);
    const offsetRaw = toInteger(req.query.offset);

    const filters: Record<string, unknown> = {};
    if (domain) filters.domain = domain;
    if (topic) filters.topic = topic;
    if (finding) filters.finding = finding;
    if (recType) filters.rec_type = recType;
    if (sourceId) filters.source_id = sourceId;
    if (query) filters.query = query;

    if (minConfidenceRaw !== undefined) {
      const clamped = Math.max(0, Math.min(minConfidenceRaw, 1));
      filters.min_confidence = clamped;
    }

    if (limitRaw !== undefined && limitRaw > 0) {
      filters.limit = Math.min(limitRaw, 500);
    }

    if (offsetRaw !== undefined && offsetRaw >= 0) {
      filters.offset = offsetRaw;
    }

    res.status(200).json(searchRecommendations(filters));
  } catch (error) {
    next(error);
  }
});

app.get('/api/recommendations/domains', (_req, res, next) => {
  try {
    res.status(200).json({ domains: getAvailableDomains() });
  } catch (error) {
    next(error);
  }
});

app.get('/api/recommendations/domains/:domain/topics', (req, res, next) => {
  try {
    const domain = req.params.domain;
    res.status(200).json({
      domain,
      topics: getTopicsByDomain(domain),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/recommendations/stats', (_req, res, next) => {
  try {
    res.status(200).json(getStats());
  } catch (error) {
    next(error);
  }
});

app.get('/api/recommendations/:recId', (req, res, next) => {
  try {
    const rec = getRecommendationById(req.params.recId);
    if (!rec) {
      res.status(404).json({ error: 'Recommendation not found' });
      return;
    }
    res.status(200).json(rec);
  } catch (error) {
    next(error);
  }
});

const calculatorUnavailableMessage =
  'Local calculator runtime is not configured. Start the Python calculator service and set CALCULATOR_URL to use real compute results.';

app.get('/api/calculator/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    mode: 'stub',
    warning: calculatorUnavailableMessage,
  });
});

app.post('/api/calculator/compute', (req, res) => {
  const requests = Array.isArray(req.body?.requests) ? req.body.requests : null;
  if (!requests) {
    res.status(400).json({ error: 'Invalid body: expected { requests: [] }' });
    return;
  }

  const results = requests.map((request: any) => {
    const refId = typeof request?.ref_id === 'string' ? request.ref_id : '';
    const formula = typeof request?.formula === 'string' ? request.formula : '';
    return {
      ref_id: refId,
      formula,
      result: null,
      error: calculatorUnavailableMessage,
    };
  });

  res.status(200).json(results);
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[local-api] Unhandled error:', error);
  if (res.headersSent) return;

  const message = error instanceof Error ? error.message : 'Internal Server Error';
  res.status(500).json({ error: message });
});

app.listen(apiPort, '0.0.0.0', () => {
  console.log(`[local-api] listening on http://127.0.0.1:${apiPort}`);
  console.log('[local-api] routes: /api/generate-report-claude-stream, /api/generate-report-gpt-stream, /api/admin/anthropic-usage, /api/admin/openai-draft-usage, /api/pipeline/*, /api/recommendations/*, /api/calculator/*');
});
