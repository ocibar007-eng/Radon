
import { useReducer, useEffect, useRef } from 'react';
import { useSession } from '../context/SessionContext';
import { pipelineReducer, createInitialState } from './pipeline.reducer';
import { getItemId, DEFAULT_PIPELINE_CONFIG, ProcessingQueueItem } from './pipeline.types';
import * as PipelineActions from '../core/pipeline-actions';
import { groupDocsVisuals } from '../utils/grouping';
import { buildChecklistInput } from '../utils/checklist';

const DEBUG_LOGS = true;

/**
 * usePipeline - Robust State Machine-based Pipeline
 * 
 * State Machine Architecture:
 * - Atomic state transitions via useReducer
 * - Explicit job status tracking
 * - Built-in retry mechanism (3 attempts)
 * - Single processing loop (no race conditions)
 * - Fully testable (pure reducer)
 */
export function usePipeline() {
    const { session, dispatch: sessionDispatch } = useSession();
    const [state, dispatch] = useReducer(pipelineReducer, undefined, createInitialState);

    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // Ref to access latest session data in async callbacks
    const docsRef = useRef(session.docs);
    useEffect(() => {
        docsRef.current = session.docs;
    }, [session.docs]);

    // --- PUBLIC API ---

    /**
     * Add items to processing queue
     */
    const enqueue = (items: ProcessingQueueItem | ProcessingQueueItem[]) => {
        const itemsArray = Array.isArray(items) ? items : [items];
        dispatch({ type: 'ENQUEUE', items: itemsArray });
    };

    /**
     * Pause pipeline processing
     */
    const pause = () => dispatch({ type: 'PAUSE' });

    /**
     * Resume pipeline processing
     */
    const resume = () => dispatch({ type: 'RESUME' });

    /**
     * Retry a failed job
     */
    const retry = (itemId: string) => dispatch({ type: 'RETRY_JOB', itemId });

    // --- PROCESSING LOOP (THE HEART OF V2) ---

    useEffect(() => {
        // Don't process if paused or nothing to do
        if (state.status === 'paused') return;
        if (state.queue.length === 0) return;

        const { maxConcurrency } = DEFAULT_PIPELINE_CONFIG;
        const activeJobs = Array.from(state.processing.values()).filter(
            job => job.status === 'processing'
        ).length;

        // Check concurrency limit
        if (activeJobs >= maxConcurrency) return;

        // Get next item from queue
        const nextItem = state.queue[0];
        if (!nextItem) return;

        const itemId = getItemId(nextItem);

        // Check if already processing (safety check, should never happen with reducer)
        if (state.processing.has(itemId) && state.processing.get(itemId)?.status === 'processing') {
            console.warn(`[PipelineV2] Item ${itemId} already processing, skipping`);
            return;
        }

        // Start processing
        if (DEBUG_LOGS) {
            console.log('[PipelineV2] Starting job:', { type: nextItem.type, id: itemId });
        }

        dispatch({ type: 'START_JOB', itemId });

        // Execute the actual processing (async)
        processItem(nextItem, sessionDispatch, session, docsRef.current)
            .then(result => {
                if (isMounted.current) {
                    dispatch({ type: 'JOB_SUCCESS', itemId, result });
                    if (DEBUG_LOGS) {
                        console.log('[PipelineV2] Job succeeded:', itemId);
                    }
                }
            })
            .catch(error => {
                if (isMounted.current) {
                    dispatch({ type: 'JOB_ERROR', itemId, error });
                    console.error('[PipelineV2] Job failed:', itemId, error);
                }
            });

    }, [state.queue, state.processing, state.status, session, sessionDispatch]);

    // --- AUTO GROUP ANALYSIS (Restored from Legacy) ---
    const analyzingGroupsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const groups = groupDocsVisuals(session.docs);

        const isLaudoKeyword = (raw?: string) => {
            if (!raw) return false;
            const normalized = raw.toLowerCase();
            return [
                'tomografia', 'resson', 'raio x', 'radiografia', 'ultrass', 'mamografia',
                'densitometria', 'ecografia', 'angiografia', 'pet', 'cintilografia'
            ].some((k) => normalized.includes(k));
        };

        groups.forEach(group => {
            // Usar todos os IDs ordenados como chave única do grupo
            const groupKey = `${group.id}::${[...group.docIds].sort().join('|')}`;

            if (analyzingGroupsRef.current.has(groupKey)) return;

            // Critérios para disparar Análise Unificada:
            // 1. É um laudo prévio
            // 2. Todos os docs do grupo estão com status 'done' (OCR finalizado) e têm texto verbatim.
            // 3. Verifica se precisa de análise (isUnified=false)
            const hasNonLaudoTypes = group.docs.some(d =>
                ['pedido_medico', 'guia_autorizacao', 'questionario', 'termo_consentimento', 'assistencial', 'administrativo']
                    .includes(d.classification)
            );
            const hasLaudoSignal = group.docs.some(d =>
                d.classification === 'laudo_previo' ||
                d.tipoPagina === 'laudo_previo' ||
                isLaudoKeyword(d.globalGroupType)
            );
            const isLaudoGroup = hasLaudoSignal && !hasNonLaudoTypes;
            const allPagesReady = group.docs.every(d => d.status === 'done' && d.verbatimText);
            const needsUnifiedAnalysis = !group.docs[0].isUnified;

            if (isLaudoGroup && allPagesReady && needsUnifiedAnalysis) {
                analyzingGroupsRef.current.add(groupKey);

                const combinedText = group.docs
                    .map((d, i) => `--- PÁGINA ${i + 1} (${d.source}) ---\n${d.verbatimText}`)
                    .join('\n\n');

                if (DEBUG_LOGS) {
                    console.log(`[PipelineV2] Auto-enqueuing group analysis for ${group.title} (${group.docs.length} pages)`);
                }

                enqueue({ type: 'group_analysis', docIds: group.docIds, fullText: combinedText });
            }
        });
    }, [session.docs]);

    // --- AUTO CLINICAL SUMMARY (Restored from Legacy) ---
    const prevSummaryKeyRef = useRef<string>('');
    const summaryTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        // Tipos de documentos que alimentam o resumo clínico (todos exceto laudo_previo)
        const CLINICAL_CONTEXT_TYPES = ['assistencial', 'pedido_medico', 'guia_autorizacao', 'termo_consentimento', 'questionario'];

        const readyDocs = session.docs.filter(d =>
            CLINICAL_CONTEXT_TYPES.includes(d.classification) &&
            d.status === 'done' &&
            (d.verbatimText || d.extractedData)
        );

        const summaryKey = readyDocs
            .map(doc => `${doc.id}:${doc.classification}:${doc.verbatimText?.length || 0}:${doc.extractedData ? 1 : 0}`)
            .join('|');

        if (readyDocs.length === 0) {
            if (summaryTimeoutRef.current) clearTimeout(summaryTimeoutRef.current);
            if (prevSummaryKeyRef.current !== '') {
                prevSummaryKeyRef.current = '';
                sessionDispatch({
                    type: 'SET_CLINICAL_MARKDOWN',
                    payload: { markdown: '', data: undefined }
                });
            }
            return;
        }

        if (summaryKey !== prevSummaryKeyRef.current) {
            if (summaryTimeoutRef.current) clearTimeout(summaryTimeoutRef.current);

            summaryTimeoutRef.current = window.setTimeout(async () => {
                prevSummaryKeyRef.current = summaryKey;
                try {
                    const result = await PipelineActions.processClinicalSummary(readyDocs);
                    if (result && isMounted.current) {
                        sessionDispatch({
                            type: 'SET_CLINICAL_MARKDOWN',
                            payload: { markdown: result.markdown_para_ui, data: result }
                        });
                    }
                } catch (err) {
                    console.error('[PipelineV2] Clinical summary failed:', err);
                }
            }, 2000);
        }
    }, [session.docs, sessionDispatch]);

    // --- AUTO RADIOLOGY CHECKLIST ---
    const prevChecklistKeyRef = useRef<string>('');
    const checklistTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        const checklistDocs = session.docs.filter(d =>
            d.status === 'done' && (d.verbatimText || d.extractedData)
        );

        const summaryFingerprint = session.clinicalMarkdown || '';
        const examFingerprint = session.patient?.tipo_exame?.valor || '';
        const queryFingerprint = session.checklistQuery || '';

        const checklistKey = [
            checklistDocs.map(doc => `${doc.id}:${doc.classification}:${doc.verbatimText?.length || 0}:${doc.extractedData ? 1 : 0}`).join('|'),
            `summary:${summaryFingerprint}`,
            `exam:${examFingerprint}`,
            `query:${queryFingerprint}`
        ].join('|');

        const hasInput = checklistDocs.length > 0 || summaryFingerprint.length > 0 || !!examFingerprint || queryFingerprint.length > 0;

        if (!hasInput) {
            if (checklistTimeoutRef.current) clearTimeout(checklistTimeoutRef.current);
            if (prevChecklistKeyRef.current !== '') {
                prevChecklistKeyRef.current = '';
                sessionDispatch({
                    type: 'SET_CHECKLIST',
                    payload: { markdown: '', data: undefined }
                });
            }
            return;
        }

        if (checklistKey !== prevChecklistKeyRef.current) {
            if (checklistTimeoutRef.current) clearTimeout(checklistTimeoutRef.current);

            checklistTimeoutRef.current = window.setTimeout(async () => {
                prevChecklistKeyRef.current = checklistKey;
                try {
                    const input = buildChecklistInput(session, { query: queryFingerprint });
                    const result = await PipelineActions.processRadiologyChecklist(input);
                    if (result && isMounted.current) {
                        sessionDispatch({
                            type: 'SET_CHECKLIST',
                            payload: { markdown: result.markdown_para_ui, data: result }
                        });
                    }
                } catch (err) {
                    console.error('[PipelineV2] Checklist generation failed:', err);
                }
            }, 2500);
        }
    }, [session.docs, session.patient, session.clinicalMarkdown, session.clinicalSummaryData, session.checklistQuery, sessionDispatch]);

    // Cleanup completed jobs periodically
    useEffect(() => {
        const interval = setInterval(() => {
            dispatch({ type: 'CLEAR_COMPLETED' });
        }, 60000); // Every minute

        return () => clearInterval(interval);
    }, []);

    // --- RETURN PUBLIC INTERFACE ---

    return {
        // Actions
        enqueue,
        pause,
        resume,
        retry,

        // Read-only state
        queueLength: state.queue.length,
        processingCount: state.processing.size,
        errorCount: state.errors.size,
        status: state.status,

        // For debugging
        errors: Array.from(state.errors.entries()).map(([id, info]) => ({
            id,
            error: info.error.message,
            attempts: info.attempts
        }))
    };
}

/**
 * Process a single queue item (async)
 * 
 * This is extracted to make testing easier and keep the hook clean
 */
async function processItem(
    item: ProcessingQueueItem,
    sessionDispatch: any,
    session: any,
    latestDocs: any[]
): Promise<any> {

    switch (item.type) {
        case 'header': {
            const headerDoc = session.headerImage;
            if (headerDoc?.id === item.docId && headerDoc.status === 'pending' && headerDoc.file) {
                sessionDispatch({ type: 'UPDATE_DOC', payload: { id: item.docId, updates: { status: 'processing' } } });
                const data = await PipelineActions.processHeader(headerDoc.file);
                sessionDispatch({ type: 'SET_PATIENT', payload: data });
                sessionDispatch({ type: 'SET_HEADER', payload: { ...headerDoc, status: 'done' } });
                return data;
            }
            break;
        }

        case 'doc': {
            const doc = latestDocs.find((d: any) => d.id === item.docId) || session.docs.find((d: any) => d.id === item.docId);
            if (!doc) {
                throw new Error(`Doc ${item.docId} not ready`);
            }
            if (doc.status !== 'pending') break;
            if (!doc.file) {
                sessionDispatch({
                    type: 'UPDATE_DOC',
                    payload: {
                        id: item.docId,
                        updates: { status: 'error', errorMessage: 'Arquivo indisponível para OCR.' }
                    }
                });
                break;
            }

            sessionDispatch({ type: 'UPDATE_DOC', payload: { id: item.docId, updates: { status: 'processing' } } });
            const latestDoc = latestDocs.find((d: any) => d.id === item.docId) || doc;
            const updates = await PipelineActions.processDocument(doc.file, latestDoc);
            sessionDispatch({ type: 'UPDATE_DOC', payload: { id: item.docId, updates } });
            return updates;
        }

        case 'group_analysis': {
            if (!item.docIds || !item.fullText) {
                throw new Error('Group analysis missing docIds or fullText');
            }
            const result = await PipelineActions.processGroupAnalysis(item.fullText);
            item.docIds.forEach((id: string) => {
                sessionDispatch({
                    type: 'UPDATE_DOC',
                    payload: {
                        id,
                        updates: {
                            detailedAnalysis: result.detailedAnalysis,
                            isUnified: true,
                            metadata: result.metadata,
                            summary: result.summary
                        }
                    }
                });
            });
            return result;
        }

        case 'audio': {
            const job = session.audioJobs.find((j: any) => j.id === item.jobId);
            if (job && job.status === 'processing' && job.blob) {
                const result = await PipelineActions.processAudio(job.blob);
                sessionDispatch({
                    type: 'UPDATE_AUDIO_JOB',
                    payload: { id: item.jobId, updates: { status: 'done', ...result } }
                });
                return result;
            } else if (job && !job.blob) {
                sessionDispatch({
                    type: 'UPDATE_AUDIO_JOB',
                    payload: { id: item.jobId, updates: { status: 'error', transcriptRaw: 'Áudio perdido.' } }
                });
                throw new Error('Audio blob missing');
            }
            break;
        }

        default:
            throw new Error(`Unknown job type: ${(item as any).type}`);
    }
}
