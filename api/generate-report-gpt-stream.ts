import { CONFIG } from '../src/core/config.ts';
import { isOpenAIAvailable } from '../src/adapters/openai/client.ts';
import type { StreamReportRequest } from '../src/server/gpt-draft-stream.ts';
import { generateDraftReportGptStream } from '../src/server/gpt-draft-stream.ts';

export const config = {
  maxDuration: 180,
};

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function parseBody(req: any): Promise<StreamReportRequest | null> {
  if (req.body && typeof req.body === 'object') {
    return req.body as StreamReportRequest;
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as StreamReportRequest;
    } catch {
      return null;
    }
  }

  const chunks: Buffer[] = [];
  try {
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
  } catch {
    return null;
  }

  if (chunks.length === 0) return null;

  try {
    const raw = Buffer.concat(chunks).toString('utf-8');
    return JSON.parse(raw) as StreamReportRequest;
  } catch {
    return null;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method && req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  if (!CONFIG.OPENAI_DRAFT_ENABLED) {
    res.status(403).json({ error: 'OpenAI draft generation is disabled.' });
    return;
  }

  if (!isOpenAIAvailable()) {
    res.status(500).json({ error: 'OPENAI_API_KEY not configured.' });
    return;
  }

  const body = await parseBody(req);
  if (!body) {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  if (!body.transcription?.trim()) {
    res.status(400).json({ error: 'Field "transcription" is required.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  let clientClosed = false;
  req.on?.('close', () => {
    clientClosed = true;
  });

  const writeEvent = (event: string, payload: unknown) => {
    if (clientClosed || res.writableEnded) return;
    res.write(sseEvent(event, payload));
  };

  try {
    const completePayload = await generateDraftReportGptStream(body, {
      onStatus: (message) => writeEvent('status', { message }),
      onThinking: (text) => writeEvent('thinking', { text }),
      onText: (text) => writeEvent('text', { text }),
      onUsage: (usage) => writeEvent('usage', usage),
    });

    writeEvent('complete', completePayload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    writeEvent('error', { message });
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
}
