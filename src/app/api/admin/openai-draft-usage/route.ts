import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIDraftUsageComparison } from '@/server/openai-draft-usage-log';

function clampLimit(value: string | null): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed)) return 20;
  return Math.max(2, Math.min(200, parsed));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = clampLimit(searchParams.get('limit'));
    const payload = await getOpenAIDraftUsageComparison(limit);
    return NextResponse.json(payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
