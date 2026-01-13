
import { useState, useEffect, useRef } from 'react';
import { useSession } from '../context/SessionContext';
import { groupDocsVisuals } from '../utils/grouping';
import { ProcessingQueueItem } from '../types';
import * as PipelineActions from '../core/pipeline-actions';

const DEBUG_LOGS = true;

export function usePipeline() {
  const { session, dispatch } = useSession();

  // CORREÇÃO CENÁRIO 2: Race Condition Protection
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Ref para acessar o estado mais recente dos docs dentro do callback assíncrono
  const docsRef = useRef(session.docs);
  useEffect(() => {
    docsRef.current = session.docs;
  }, [session.docs]);

  // Fila de processamento sequencial
  const [queue, setQueue] = useState<ProcessingQueueItem[]>([]);

  // FIX: Resume jobs that were left hanging (e.g. user switched tabs)
  useEffect(() => {
    const stalledJobs = session.audioJobs.filter(j => j.status === 'processing');
    if (stalledJobs.length > 0) {
      console.log(`[Pipeline] Resuming ${stalledJobs.length} stalled audio jobs...`);
      stalledJobs.forEach(job => {
        // Only resume if we have the blob in memory (session/context)
        if (job.blob) {
          enqueue(job.id, 'audio');
        } else {
          // If blob is missing (page reload), mark as error since we can't process
          dispatch({
            type: 'UPDATE_AUDIO_JOB',
            payload: { id: job.id, updates: { status: 'error', transcriptRaw: 'Áudio perdido (navegação).' } }
          });
        }
      });
    }
  }, []); // Run ONCE on mount

  // Refs para controle de debounce e tracking de grupos já analisados
  const prevAssistencialCountRef = useRef(0);
  const summaryTimeoutRef = useRef<number | null>(null);
  const analyzingGroupsRef = useRef<Set<string>>(new Set());

  // Add item to processing queue
  const enqueue = (id: string, type: 'header' | 'doc' | 'audio') => {
    // @ts-ignore - TS union type matching simplified
    setQueue(prev => [...prev, { type, docId: id, jobId: id }]);
    if (DEBUG_LOGS) {
      console.log('[Debug][Pipeline] enqueue', { type, id });
    }
  };

  const enqueueGroupAnalysis = (docIds: string[], fullText: string) => {
    setQueue(prev => [...prev, { type: 'group_analysis', docIds, fullText }]);
    if (DEBUG_LOGS) {
      console.log('[Debug][Pipeline] enqueueGroupAnalysis', { docIds, length: fullText.length });
    }
  };

  // 1. WATCHER DE GRUPOS (Lógica de "Full Transcription")
  useEffect(() => {
    const groups = groupDocsVisuals(session.docs);
    if (DEBUG_LOGS) {
      console.log('[Debug][Pipeline] groups:scan', { groups: groups.length, docs: session.docs.length });
    }

    groups.forEach(group => {
      // Usar todos os IDs ordenados como chave única do grupo
      const groupKey = [...group.docIds].sort().join('|');

      if (analyzingGroupsRef.current.has(groupKey)) return;

      // Critérios para disparar Análise Unificada:
      // 1. É um laudo prévio
      // 2. Todos os docs do grupo estão com status 'done' (OCR finalizado) e têm texto verbatim.
      // 3. Verifica se precisa de análise (isUnified=false)
      const isLaudoGroup = group.docs.every(d => d.classification === 'laudo_previo');
      const allPagesReady = group.docs.every(d => d.status === 'done' && d.verbatimText);
      const needsUnifiedAnalysis = !group.docs[0].isUnified;

      if (isLaudoGroup && allPagesReady && needsUnifiedAnalysis) {
        analyzingGroupsRef.current.add(groupKey);

        const combinedText = group.docs
          .map((d, i) => `--- PÁGINA ${i + 1} (${d.source}) ---\n${d.verbatimText}`)
          .join('\n\n');

        console.log(`[Pipeline] Disparando Análise Unificada para grupo ${group.title} (${group.docs.length} páginas).`);

        enqueueGroupAnalysis(group.docIds, combinedText);
      }
    });
  }, [session.docs]);


  // 2. QUEUE PROCESSOR
  useEffect(() => {
    const processNext = async () => {
      if (queue.length === 0) return;

      const item = queue[0];
      const groupKey = item.type === 'group_analysis'
        ? [...item.docIds].sort().join('|')
        : null;
      if (DEBUG_LOGS) {
        console.log('[Debug][Pipeline] process:start', { type: item.type, docId: item.docId, jobId: item.jobId });
      }

      try {
        // --- HEADER PROCESSING ---
        if (item.type === 'header') {
          const { docId } = item;
          const headerDoc = session.headerImage;
          if (headerDoc && headerDoc.id === docId && headerDoc.status === 'pending') {
            dispatch({ type: 'UPDATE_DOC', payload: { id: docId, updates: { status: 'processing' } } });
            if (headerDoc.file) {
              const data = await PipelineActions.processHeader(headerDoc.file);
              if (isMounted.current) {
                dispatch({ type: 'SET_PATIENT', payload: data });
                dispatch({ type: 'SET_HEADER', payload: { ...headerDoc, status: 'done' } });
              }
            }
          }
        }

        // --- DOC PROCESSING (OCR ONLY) ---
        if (item.type === 'doc') {
          const { docId } = item;
          const doc = session.docs.find(d => d.id === docId);

          if (doc && doc.status === 'pending' && doc.file) {
            dispatch({ type: 'UPDATE_DOC', payload: { id: docId, updates: { status: 'processing' } } });

            // Obtemos a referência mais recente para checar overrides manuais
            const latestDoc = docsRef.current.find(d => d.id === docId) || doc;

            const updates = await PipelineActions.processDocument(doc.file, latestDoc);

            if (isMounted.current) {
              dispatch({ type: 'UPDATE_DOC', payload: { id: docId, updates } });
            }
          }
        }

        // --- GROUP ANALYSIS (INTELLIGENCE) ---
        if (item.type === 'group_analysis') {
          const { docIds, fullText } = item;
          const result = await PipelineActions.processGroupAnalysis(fullText);

          if (isMounted.current) {
            docIds.forEach(id => {
              dispatch({
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

            // Limpa o set de grupos analisados
            if (groupKey) {
              analyzingGroupsRef.current.delete(groupKey);
            }
            if (DEBUG_LOGS) {
              console.log('[Debug][Pipeline] group:done', { docIds });
            }
          }
        }

        // --- AUDIO PROCESSING ---
        if (item.type === 'audio') {
          const { jobId } = item;
          const job = session.audioJobs.find(j => j.id === jobId);
          if (job && job.status === 'processing' && job.blob) {
            const result = await PipelineActions.processAudio(job.blob);
            if (isMounted.current) {
              dispatch({
                type: 'UPDATE_AUDIO_JOB',
                payload: {
                  id: jobId,
                  updates: { status: 'done', ...result }
                }
              });
            }
          } else if (job && !job.blob) {
            if (isMounted.current) {
              dispatch({ type: 'UPDATE_AUDIO_JOB', payload: { id: jobId, updates: { status: 'error', transcriptRaw: 'Áudio perdido.' } } });
            }
          }
        }

      } catch (error) {
        console.error("Pipeline Error:", error);
        if (item.type === 'doc' && isMounted.current) {
          dispatch({ type: 'UPDATE_DOC', payload: { id: item.docId, updates: { status: 'error', errorMessage: 'Falha no processamento' } } });
        }
      } finally {
        if (isMounted.current) {
          setQueue(prev => prev.slice(1));
          if (DEBUG_LOGS) {
            console.log('[Debug][Pipeline] process:done', { type: item.type, docId: item.docId, jobId: item.jobId });
          }
        }
      }
    };

    if (queue.length > 0) {
      processNext();
    }
  }, [queue, session.docs, session.headerImage, session.audioJobs, dispatch]);


  // 3. Auto Clinical Summarizer
  useEffect(() => {
    const readyDocs = session.docs.filter(d => d.classification === 'assistencial' && d.status === 'done' && d.verbatimText);

    if (readyDocs.length > 0 && readyDocs.length !== prevAssistencialCountRef.current) {
      if (summaryTimeoutRef.current) clearTimeout(summaryTimeoutRef.current);

      summaryTimeoutRef.current = window.setTimeout(async () => {
        prevAssistencialCountRef.current = readyDocs.length;
        try {
          const result = await PipelineActions.processClinicalSummary(readyDocs);
          if (result && isMounted.current) {
            dispatch({
              type: 'SET_CLINICAL_MARKDOWN',
              payload: { markdown: result.markdown_para_ui, data: result }
            });
          }
        } catch (err) { console.error("Summary failed", err); }
      }, 2000);
    }
  }, [session.docs, dispatch]);

  return { enqueue, processingQueueLength: queue.length };
}
