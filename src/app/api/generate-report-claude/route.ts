/**
 * POST /api/generate-report-claude
 *
 * API endpoint for generating radiology reports using Claude API.
 * Feature-flagged via CLAUDE_REPORT_ENABLED.
 *
 * Pipeline: Claude API → Terminology Fixlist → Canonicalizer → Response
 *
 * @example
 * POST /api/generate-report-claude
 * Body: {
 *   transcription: "Fígado com dimensões normais...",
 *   clinicalData: "Adulto jovem, dor abdominal...",
 *   modality: "TC",
 *   region: "abdome",
 *   patientName: "PACIENTE TESTE",
 *   patientOS: "123456"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { CONFIG } from '@/core/config';
import {
    generateClaudeResponse,
    isClaudeAvailable,
    CLAUDE_SYSTEM_PROMPT,
    buildCaseMessage,
    selectRelevantReferences,
    loadReferenceFiles,
} from '@/adapters/anthropic';
import type { CaseMessageInput } from '@/adapters/anthropic';
import { applyTerminologyFixlistToReport } from '@/core/reportGeneration/terminology-fixlist';
import { canonicalizeMarkdown } from '@/core/reportGeneration/canonicalizer';

// Max duration for Vercel — laudos podem demorar 60-120s
export const maxDuration = 120;

// ============================================================================
// TYPES
// ============================================================================

type ClaudeReportRequest = {
    transcription: string;
    clinicalData?: string;
    technicalData?: string;
    priorReports?: string;
    preComputedCalculations?: string;
    modality?: 'TC' | 'RM' | 'USG';
    region?: string;
    patientName?: string;
    patientOS?: string;
};

type GuardResult = {
    name: string;
    applied: boolean;
    fixes?: number;
    details?: unknown;
};

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
    // 1) Feature flag check
    if (!CONFIG.CLAUDE_REPORT_ENABLED) {
        return NextResponse.json(
            { error: 'Claude report generation is disabled. Set CLAUDE_REPORT_ENABLED=1 to enable.' },
            { status: 403 }
        );
    }

    // 2) API key check
    if (!isClaudeAvailable()) {
        return NextResponse.json(
            { error: 'ANTHROPIC_API_KEY not configured.' },
            { status: 500 }
        );
    }

    // 3) Parse request
    let body: ClaudeReportRequest;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: 'Invalid JSON body.' },
            { status: 400 }
        );
    }

    if (!body.transcription || body.transcription.trim().length === 0) {
        return NextResponse.json(
            { error: 'Field "transcription" is required.' },
            { status: 400 }
        );
    }

    const startTime = Date.now();
    const guards: GuardResult[] = [];

    try {
        // 4) RAG — select relevant references
        const caseText = [body.transcription, body.clinicalData, body.priorReports]
            .filter(Boolean)
            .join(' ');
        const refIndices = selectRelevantReferences(caseText);
        const referencesContent = refIndices.length > 0
            ? loadReferenceFiles(refIndices)
            : undefined;

        // 5) Build user message
        const caseInput: CaseMessageInput = {
            transcription: body.transcription,
            clinicalData: body.clinicalData,
            technicalData: body.technicalData,
            priorReports: body.priorReports,
            preComputedCalculations: body.preComputedCalculations,
            modality: body.modality,
            region: body.region,
            patientName: body.patientName,
            patientOS: body.patientOS,
            selectedReferences: referencesContent,
        };
        const userMessage = buildCaseMessage(caseInput);

        // 6) Call Claude API
        const claudeResponse = await generateClaudeResponse({
            systemPrompt: CLAUDE_SYSTEM_PROMPT,
            userMessage,
            model: CONFIG.CLAUDE_MODEL,
            maxTokens: CONFIG.CLAUDE_MAX_TOKENS,
        });

        let reportText = claudeResponse.text;

        // 7) Guard: Terminology Fixlist
        const fixlistResult = applyTerminologyFixlistToReport(reportText);
        reportText = fixlistResult.text;
        guards.push({
            name: 'terminology_fixlist',
            applied: fixlistResult.totalFixes > 0,
            fixes: fixlistResult.totalFixes,
            details: fixlistResult.fixes,
        });

        // 8) Guard: Canonicalizer
        const canonResult = canonicalizeMarkdown(reportText);
        reportText = canonResult.text;
        guards.push({
            name: 'canonicalizer',
            applied: canonResult.corrections.length > 0,
            fixes: canonResult.corrections.length,
            details: canonResult.corrections,
        });

        const durationMs = Date.now() - startTime;

        // 9) Response
        return NextResponse.json({
            success: true,
            report: reportText,
            metadata: {
                model: CONFIG.CLAUDE_MODEL,
                durationMs,
                usage: claudeResponse.usage,
                guards,
                referencesUsed: refIndices,
            },
        });
    } catch (error: unknown) {
        const durationMs = Date.now() - startTime;
        const message = error instanceof Error ? error.message : 'Unknown error';
        const status = (error as { status?: number })?.status;

        console.error('[generate-report-claude] Error:', message);

        return NextResponse.json(
            {
                error: message,
                durationMs,
                guards,
                httpStatus: status,
            },
            { status: status && status >= 400 && status < 600 ? status : 500 }
        );
    }
}
