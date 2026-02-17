/**
 * POST /api/generate-report-gpt-stream
 *
 * SSE endpoint for draft generation using OpenAI GPT.
 */

import { NextRequest } from 'next/server';
import { CONFIG } from '@/core/config';
import { isOpenAIAvailable } from '@/adapters/openai/client';
import type { StreamReportRequest } from '@/server/gpt-draft-stream';
import { generateDraftReportGptStream } from '@/server/gpt-draft-stream';

export const maxDuration = 180;

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  if (!CONFIG.OPENAI_DRAFT_ENABLED) {
    return new Response(
      JSON.stringify({ error: 'OpenAI draft generation is disabled.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (!isOpenAIAvailable()) {
    return new Response(
      JSON.stringify({ error: 'OPENAI_API_KEY not configured.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: StreamReportRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (!body.transcription?.trim()) {
    return new Response(
      JSON.stringify({ error: 'Field "transcription" is required.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseEvent(event, data)));
      };

      try {
        const completePayload = await generateDraftReportGptStream(body, {
          onStatus: (message) => send('status', { message }),
          onThinking: (text) => send('thinking', { text }),
          onText: (text) => send('text', { text }),
          onUsage: (usage) => send('usage', usage),
        });

        send('complete', completePayload);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        send('error', { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
