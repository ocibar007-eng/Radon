
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
      enqueue(newDoc.id, 'header');
    } else {
      dispatch({ type: 'ADD_DOC', payload: newDoc });
      enqueue(newDoc.id, 'doc');
    }

    if (patient) {
      StorageService.uploadFile(patient.id, file, sourceName)
        .then((result) => {
          if (isHeader) {
            dispatch({ type: 'SET_HEADER', payload: { ...newDoc, previewUrl: result.downloadUrl } });
          } else {
            dispatch({
              type: 'UPDATE_DOC',
              payload: {
                id: docId,
                updates: { previewUrl: result.downloadUrl }
              }
            });
          }
        })
        .catch((err) => console.error("Erro no upload de background:", err));
    }
  }, [dispatch, enqueue, patient]);

  // --- AÇÕES PÚBLICAS ---

  const handleFileUpload = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>,
    isHeader = false,
    forcedType?: DocClassification,
    onTypeChange?: (type: 'summary' | 'reports') => void
  ) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files) as File[];
    e.target.value = '';

    if (onTypeChange) {
      if (forcedType === 'laudo_previo') onTypeChange('reports');
      if (forcedType === 'assistencial') onTypeChange('summary');
    }

    for (const file of files) {
      if (file.type === 'application/pdf') {
        try {
          const images = await convertPdfToImages(file);
          images.forEach((blob, idx) => {
            const pageFile = new File([blob], `${file.name.replace('.pdf', '')}_Pg${idx + 1}.jpg`, { type: 'image/jpeg' });
            addDocToSessionAndUpload(pageFile, isHeader, `${file.name} Pg ${idx + 1}`, forcedType);
          });
        } catch (err: any) {
          const errorMsg = err instanceof PdfLoadError ? err.message : "Erro desconhecido ao ler PDF.";
          if (!isHeader) {
            dispatch({
              type: 'ADD_DOC',
              payload: {
                id: crypto.randomUUID(),
                source: file.name,
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
        addDocToSessionAndUpload(file, isHeader, file.name, forcedType);
      }
    }
  }, [addDocToSessionAndUpload, dispatch]);

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
        enqueue(id, 'doc');
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
    dispatch({ type: 'ADD_AUDIO_JOB', payload: newJob });
    enqueue(newJob.id, 'audio');

    if (patient) {
      StorageService.uploadFile(patient.id, blob, `audio_${Date.now()}.webm`)
        .then((result) => {
          dispatch({
            type: 'UPDATE_AUDIO_JOB',
            payload: {
              id: newJob.id,
              updates: { storageUrl: result.downloadUrl } as any
            }
          });
        })
        .catch(console.error);
    }
  }, [dispatch, enqueue, patient]);

  const downloadAll = useCallback(async () => {
    setIsGeneratingReport(true);
    try {
      const markdown = await GeminiAdapter.compileFinalReport(session);
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

  const handleFinalize = useCallback(async () => {
    if (!patient) return;

    // Validação - verificar se tem anexos
    const hasContent = session.docs.length > 0 || session.audioJobs.length > 0 || session.headerImage !== null;

    if (!hasContent) {
      alert('⚠️ Adicione pelo menos um anexo antes de finalizar o exame.');
      return;
    }

    // Confirmação
    const confirmed = window.confirm(
      'Deseja finalizar este exame? Ele será marcado como concluído.'
    );
    if (!confirmed) return;

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