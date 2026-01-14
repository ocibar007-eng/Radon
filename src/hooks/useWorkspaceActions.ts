
import React, { useState, useCallback } from 'react';
import { useSession } from '../context/SessionContext';
import { usePipeline } from './usePipeline';
import { StorageService } from '../services/storage-service';
import { PatientService } from '../services/patient-service';
import { convertPdfToImages, PdfLoadError } from '../utils/pdf';
import { groupDocsVisuals } from '../utils/grouping';
import * as GeminiAdapter from '../adapters/gemini-prompts';
import { AttachmentDoc, AudioJob, DocClassification } from '../types';
import { Patient } from '../types/patient';

const DEBUG_LOGS = true;

export function useWorkspaceActions(patient: Patient | null) {
  const { session, dispatch } = useSession();
  const { enqueue } = usePipeline();

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  // Estado local para controlar aba ativa pode ficar na UI, mas se quisermos controlar via ação, podemos por aqui.
  // Por enquanto, vamos manter o activeTab na UI e focar nas ações de dados.

  // --- HELPER INTERNO ---
  const addDocToSessionAndUpload = useCallback(async (file: File, isHeader: boolean, sourceName: string, forcedType?: DocClassification) => {
    const docId = crypto.randomUUID();
    const tempUrl = URL.createObjectURL(file);
    if (DEBUG_LOGS) {
      console.log('[Debug][Upload] addDocToSessionAndUpload', {
        docId,
        name: file.name,
        type: file.type,
        size: file.size,
        sourceName,
        isHeader,
        forcedType
      });
    }

    const newDoc: AttachmentDoc = {
      id: docId,
      file: file,
      source: sourceName,
      previewUrl: tempUrl,
      status: 'pending',
      classification: forcedType
    };

    if (isHeader) {
      dispatch({ type: 'SET_HEADER', payload: newDoc });
      enqueue({ type: 'header', docId: newDoc.id });
    } else {
      dispatch({ type: 'ADD_DOC', payload: newDoc });
      enqueue({ type: 'doc', docId: newDoc.id });
    }

    if (patient) {
      StorageService.uploadFile(patient.id, file, sourceName)
        .then((downloadUrl) => {
          if (DEBUG_LOGS) {
            console.log('[Debug][Upload] upload:success', {
              docId,
              sourceName,
              url: downloadUrl
            });
          }
          if (isHeader) {
            dispatch({ type: 'SET_HEADER', payload: { ...newDoc, previewUrl: downloadUrl } });
          } else {
            dispatch({
              type: 'UPDATE_DOC',
              payload: {
                id: docId,
                updates: { previewUrl: downloadUrl }
              }
            });
          }
        })
        .catch((err) => {
          console.error("Erro no upload de background:", err);
          if (DEBUG_LOGS) {
            console.log('[Debug][Upload] upload:error', { docId, sourceName, err });
          }
        });
    }
  }, [dispatch, enqueue, patient]);

  // --- AÇÕES PÚBLICAS ---

  const resolveFileName = useCallback((file: File, index: number) => {
    const trimmed = (file.name || '').trim();
    if (trimmed) return trimmed;

    const timestamp = Date.now();
    if (file.type === 'application/pdf') {
      return `documento_colado_${timestamp}_${index + 1}.pdf`;
    }
    if (file.type.startsWith('image/')) {
      const ext = file.type.split('/')[1] || 'png';
      return `imagem_colada_${timestamp}_${index + 1}.${ext}`;
    }
    return `arquivo_colado_${timestamp}_${index + 1}`;
  }, []);

  const handleFilesUpload = useCallback(async (
    files: File[],
    isHeader = false,
    forcedType?: DocClassification,
    onTypeChange?: (type: 'summary' | 'reports') => void
  ) => {
    if (!files.length) return;
    if (DEBUG_LOGS) {
      console.log('[Debug][Upload] handleFilesUpload:start', {
        count: files.length,
        isHeader,
        forcedType
      });
    }

    if (onTypeChange) {
      if (forcedType === 'laudo_previo') onTypeChange('reports');
      if (forcedType === 'assistencial') onTypeChange('summary');
    }

    const allowedFiles = files.filter(file =>
      file.type === 'application/pdf' || file.type.startsWith('image/')
    );
    if (DEBUG_LOGS) {
      console.log('[Debug][Upload] handleFilesUpload:filtered', {
        allowed: allowedFiles.length
      });
    }

    for (const [index, file] of allowedFiles.entries()) {
      const resolvedName = resolveFileName(file, index);
      if (DEBUG_LOGS) {
        console.log('[Debug][Upload] handleFilesUpload:file', {
          name: file.name,
          type: file.type,
          resolvedName
        });
      }

      if (file.type === 'application/pdf') {
        const displayName = resolvedName.toLowerCase().endsWith('.pdf')
          ? resolvedName
          : `${resolvedName}.pdf`;
        const baseName = displayName.replace(/\.pdf$/i, '');

        try {
          const images = await convertPdfToImages(file);
          if (DEBUG_LOGS) {
            console.log('[Debug][Upload] handleFilesUpload:pdf', {
              displayName,
              pages: images.length
            });
          }
          images.forEach((blob, idx) => {
            const pageFile = new File([blob], `${baseName}_Pg${idx + 1}.jpg`, { type: 'image/jpeg' });
            addDocToSessionAndUpload(pageFile, isHeader, `${displayName} Pg ${idx + 1}`, forcedType);
          });
        } catch (err: any) {
          const errorMsg = err instanceof PdfLoadError ? err.message : "Erro desconhecido ao ler PDF.";
          if (DEBUG_LOGS) {
            console.log('[Debug][Upload] handleFilesUpload:pdf:error', {
              displayName,
              errorMsg
            });
          }
          if (!isHeader) {
            dispatch({
              type: 'ADD_DOC',
              payload: {
                id: crypto.randomUUID(),
                source: displayName,
                file: file,
                previewUrl: '',
                status: 'error',
                errorMessage: errorMsg,
                classification: 'indeterminado'
              }
            });
          } else {
            alert(errorMsg);
          }
        }
      } else {
        addDocToSessionAndUpload(file, isHeader, resolvedName, forcedType);
      }
    }
  }, [addDocToSessionAndUpload, dispatch, resolveFileName]);

  const handleFileUpload = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>,
    isHeader = false,
    forcedType?: DocClassification,
    onTypeChange?: (type: 'summary' | 'reports') => void
  ) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files) as File[];
    if (DEBUG_LOGS) {
      console.log('[Debug][Upload] handleFileUpload:input', { count: files.length });
    }
    e.target.value = '';
    await handleFilesUpload(files, isHeader, forcedType, onTypeChange);
  }, [handleFilesUpload]);

  const removeDoc = useCallback((docId: string) => {
    const doc = session.docs.find(d => d.id === docId);
    if (doc?.previewUrl) URL.revokeObjectURL(doc.previewUrl);
    dispatch({ type: 'REMOVE_DOC', payload: docId });
  }, [session.docs, dispatch]);

  const removeReportGroup = useCallback((groupId: string, reportGroups: any[]) => {
    if (window.confirm('Deseja remover este exame e todas as suas páginas?')) {
      const group = reportGroups.find(g => g.id === groupId);
      if (group) {
        group.docIds.forEach((id: string) => removeDoc(id));
      }
    }
  }, [removeDoc]);

  const handleManualReclassify = useCallback((docId: string, target: DocClassification) => {
    const allGroups = groupDocsVisuals(session.docs);
    const group = allGroups.find(g => g.docIds.includes(docId));
    const targetDocIds = group ? group.docIds : [docId];
    let hasMissingFile = false;

    targetDocIds.forEach(id => {
      const doc = session.docs.find(d => d.id === id);
      if (!doc) return;

      const classificationChanged = doc.classification !== target;
      // Permite reprocessar se mudar de classe OU se estiver em erro
      const canReprocess = (classificationChanged && !!doc.file) || (doc.status === 'error');

      const updates: Partial<AttachmentDoc> = {
        classification: target,
        classificationSource: 'manual',
        isRecoveredBySystem: false
      };

      if (classificationChanged) {
        updates.isUnified = false;
        updates.detailedAnalysis = undefined;
        updates.metadata = undefined;
        updates.summary = undefined;

        if (canReprocess) {
          // Se vai reprocessar, limpa hints para que a IA (ou pipeline) re-agrupe
          updates.reportGroupHint = '';
          updates.reportGroupHintSource = 'auto';
          updates.status = 'pending';
          updates.verbatimText = '';
          updates.errorMessage = undefined;
        } else {
          // Se não pode reprocessar, mantém metadados
          updates.reportGroupHint = doc.reportGroupHint;
          updates.reportGroupHintSource = doc.reportGroupHintSource;
          if (!doc.file) {
            hasMissingFile = true;
          }
        }
      }

      dispatch({ type: 'UPDATE_DOC', payload: { id, updates } });

      if (canReprocess) {
        enqueue({ type: 'doc', docId: id });
      }
    });

    if (hasMissingFile) {
      alert('Arquivo original não disponível. Não foi possível reprocessar este documento.');
    }
  }, [session.docs, dispatch, enqueue]);

  const handleSplitReportGroup = useCallback((groupId: string, splitStartPage: number) => {
    const allGroups = groupDocsVisuals(session.docs);
    const group = allGroups.find(g => g.id === groupId);
    if (!group || group.docs.length < 2) return;

    const sortedDocs = [...group.docs];
    const maxSplit = Math.max(2, sortedDocs.length);
    const clampedSplit = Math.min(Math.max(splitStartPage, 2), maxSplit);
    const splitIndex = clampedSplit - 1;

    // Gera token único para forçar separação no utils/grouping
    const token = crypto.randomUUID().slice(0, 6).toUpperCase();
    const hintA = `MANUAL_SPLIT:${token}:1`;
    const hintB = `MANUAL_SPLIT:${token}:2`;

    sortedDocs.forEach((doc, idx) => {
      const hint = idx < splitIndex ? hintA : hintB;

      dispatch({
        type: 'UPDATE_DOC',
        payload: {
          id: doc.id,
          updates: {
            reportGroupHint: hint,
            reportGroupHintSource: 'manual',
            isUnified: false, // Força reanálise unificada de cada novo subgrupo
            detailedAnalysis: undefined,
            metadata: undefined,
            summary: undefined
          }
        }
      });
    });
  }, [session.docs, dispatch]);

  const handleClearSession = useCallback(() => {
    // Confirmation is now handled by ConfirmModal in UI
    dispatch({ type: 'CLEAR_SESSION' });
  }, [dispatch]);

  const handleAudioComplete = useCallback((blob: Blob) => {
    const newJob: AudioJob = { id: crypto.randomUUID(), blob, status: 'processing', createdAt: Date.now() };
    if (DEBUG_LOGS) {
      console.log('[Debug][Audio] handleAudioComplete', { id: newJob.id, size: blob.size });
    }
    dispatch({ type: 'ADD_AUDIO_JOB', payload: newJob });
    enqueue({ type: 'audio', jobId: newJob.id });

    if (patient) {
      StorageService.uploadFile(patient.id, blob, `audio_${Date.now()}.webm`)
        .then((downloadUrl) => {
          dispatch({
            type: 'UPDATE_AUDIO_JOB',
            payload: {
              id: newJob.id,
              updates: { storageUrl: downloadUrl } as any
            }
          });
        })
        .catch(console.error);
    }
  }, [dispatch, enqueue, patient]);

  const downloadAll = useCallback(async (ocrData?: { batchName: string; jsonResult: any }) => {
    setIsGeneratingReport(true);
    try {
      const markdown = await GeminiAdapter.compileFinalReport(session, ocrData);
      const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `laudo_${session.patient?.os?.valor || 'gerado'}.md`;
      a.click();
    } catch (error) {
      alert("Erro ao gerar relatório.");
    } finally {
      setIsGeneratingReport(false);
    }
  }, [session]);

  const handleFinalize = useCallback(async (skipConfirm = false) => {
    if (!patient) return;

    // Validação - verificar se tem anexos
    const hasContent = session.docs.length > 0 || session.audioJobs.length > 0 || session.headerImage !== null;

    // Confirmação (pula se skipConfirm for true)
    if (!skipConfirm) {
      const confirmed = window.confirm(
        'Deseja finalizar este exame? Ele será marcado como concluído.'
      );
      if (!confirmed) return;
    }

    // Atualizar patient no Firestore
    try {
      const updates = {
        status: 'done' as const,
        finalized: true,
        finalizedAt: Date.now(),
        hasAttachments: hasContent,
      };

      await PatientService.updatePatient(patient.id, updates);

      alert('✅ Exame finalizado com sucesso!');
    } catch (error) {
      console.error('Erro ao finalizar:', error);
      alert('❌ Erro ao finalizar exame. Tente novamente.');
    }
  }, [patient, session]);

  return {
    isGeneratingReport,
    handleFileUpload,
    handleFilesUpload,
    removeDoc,
    removeReportGroup,
    handleManualReclassify,
    handleSplitReportGroup,
    handleClearSession,
    handleAudioComplete,
    downloadAll,
    handleFinalize
  };
}
