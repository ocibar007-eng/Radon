
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

  // Fila de processamento sequencial e trava de execução
  const [queue, setQueue] = useState<ProcessingQueueItem[]>([]);
  const isProcessingRef = useRef(false);

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
    setQueue(prev => {
      // Evita duplicatas na fila para o mesmo ID/Tipo
      const exists = prev.some(item => (item.type === type && (item.docId === id || item.jobId === id)));
      if (exists) return prev;
      // @ts-ignore
      return [...prev, { type, docId: id, jobId: id }];
    });
  };

  const enqueueGroupAnalysis = (docIds: string[], fullText: string) => {
    setQueue(prev => {
      const groupKey = [...docIds].sort().join('|');
      const exists = prev.some(item => item.type === 'group_analysis' && item.docIds && [...item.docIds].sort().join('|') === groupKey);
      if (exists) return prev;
      return [...prev, { type: 'group_analysis', docIds, fullText }];
    });
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


  // 2. QUEUE PROCESSOR (Atomic & Sequential)
  useEffect(() => {
    const processNext = async () => {
      if (queue.length === 0 || isProcessingRef.current) return;

      isProcessingRef.current = true;
      const item = queue[0];

      try {
        if (DEBUG_LOGS) console.log('[Debug][Pipeline] process:start', { type: item.type, id: item.docId || item.jobId });

        // --- HEADER PROCESSING ---
        if (item.type === 'header') {
          const { docId } = item;
          const headerDoc = session.headerImage;
          if (headerDoc?.id === docId && headerDoc.status === 'pending' && headerDoc.file) {
            dispatch({ type: 'UPDATE_DOC', payload: { id: docId, updates: { status: 'processing' } } });
            const data = await PipelineActions.processHeader(headerDoc.file);
            if (isMounted.current) {
              dispatch({ type: 'SET_PATIENT', payload: data });
              dispatch({ type: 'SET_HEADER', payload: { ...headerDoc, status: 'done' } });
            }
          }
        }

        // --- DOC PROCESSING (OCR ONLY) ---
        else if (item.type === 'doc') {
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
        else if (item.type === 'group_analysis') {
          const { docIds, fullText } = item;
          const groupKey = [...docIds].sort().join('|');
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
            analyzingGroupsRef.current.delete(groupKey);
          }
        }

        // --- AUDIO PROCESSING ---
        else if (item.type === 'audio') {
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
        }
        isProcessingRef.current = false;
        if (DEBUG_LOGS) console.log('[Debug][Pipeline] process:done');
      }
    };

    if (queue.length > 0 && !isProcessingRef.current) {
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
