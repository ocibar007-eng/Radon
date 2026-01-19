
import React, { useState, useCallback, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { usePipeline } from './usePipeline';
import { StorageService } from '../services/storage-service';
import { PatientService } from '../services/patient-service';
import { convertPdfToImages, PdfLoadError } from '../utils/pdf';
import { groupDocsVisuals } from '../utils/grouping';
import * as GeminiAdapter from '../adapters/gemini-prompts';
import { AttachmentDoc, AudioJob, DocClassification, PdfGlobalGroupingResult } from '../types';
import { Patient } from '../types/patient';
import { SimilarityResult } from '../utils/similarity';

const DEBUG_LOGS = true;
const BLANK_PAGE_MAX_DIMENSION = 72;
const BLANK_PAGE_DARK_RATIO = 0.02;
const BLANK_PAGE_LIGHT_THRESHOLD = 245;
const BLANK_PAGE_DARK_THRESHOLD = 12;

async function detectBlankPage(blob: Blob): Promise<boolean> {
  if (typeof createImageBitmap === 'undefined') return false;
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(
    BLANK_PAGE_MAX_DIMENSION / bitmap.width,
    BLANK_PAGE_MAX_DIMENSION / bitmap.height,
    1
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const { data } = ctx.getImageData(0, 0, width, height);
  const total = width * height;
  let darkPixels = 0;
  let lightPixels = 0;
  let luminanceSum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    luminanceSum += luminance;
    if (luminance < BLANK_PAGE_LIGHT_THRESHOLD) darkPixels += 1;
    if (luminance > 250) lightPixels += 1;
  }

  const average = luminanceSum / total;
  const darkRatio = darkPixels / total;
  const lightRatio = lightPixels / total;

  const mostlyWhite = average > BLANK_PAGE_LIGHT_THRESHOLD && darkRatio < BLANK_PAGE_DARK_RATIO;
  const mostlyBlack = average < BLANK_PAGE_DARK_THRESHOLD && lightRatio < BLANK_PAGE_DARK_RATIO;

  return mostlyWhite || mostlyBlack;
}

export function useWorkspaceActions(patient: Patient | null) {
  const { session, dispatch } = useSession();
  const { enqueue } = usePipeline();

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Resume audio jobs after navigation or hydration clears the pipeline queue.
  useEffect(() => {
    const pendingAudio = session.audioJobs.filter(job => job.status === 'processing');
    if (pendingAudio.length === 0) return;

    pendingAudio.forEach(job => {
      if (!job.blob) return;
      enqueue({ type: 'audio', jobId: job.id });
    });
  }, [enqueue, session.audioJobs]);

  // Estado para múltiplas imagens enviadas simultaneamente
  const [pendingImages, setPendingImages] = useState<{
    images: File[];
    forcedType?: DocClassification;
    remainingFiles?: File[];
    isHeader?: boolean;
  } | null>(null);

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
      classification: forcedType ?? 'indeterminado'
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

    // Detectar múltiplas imagens (não PDFs) enviadas juntas
    const imageFiles = allowedFiles.filter(f => f.type.startsWith('image/') && f.type !== 'application/pdf');
    if (imageFiles.length >= 2 && !isHeader) {
      if (DEBUG_LOGS) {
        console.log('[Debug][Upload] Múltiplas imagens detectadas, mostrando diálogo', {
          count: imageFiles.length,
          remaining: allowedFiles.length - imageFiles.length
        });
      }
      // Armazenar imagens e mostrar diálogo
      setPendingImages({
        images: imageFiles,
        forcedType,
        remainingFiles: allowedFiles.filter(f => !imageFiles.includes(f)),
        isHeader
      });
      return; // Retorna aqui, processamento continua após resposta do usuário
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
          const blankPageMap = await Promise.all(
            images.map(async (blob) => {
              if (forcedType) return false;
              try {
                return await detectBlankPage(blob);
              } catch {
                return false;
              }
            })
          );
          if (DEBUG_LOGS) {
            console.log('[Debug][Upload] handleFilesUpload:pdf', {
              displayName,
              pages: images.length
            });
          }

          // ANÁLISE GLOBAL: Enviar todas as páginas para identificar quantos laudos existem
          let globalGrouping: PdfGlobalGroupingResult | null = null;

          // Só faz análise global se tiver mais de 1 página e não for header
          if (images.length > 1 && !isHeader) {
            try {
              if (DEBUG_LOGS) {
                console.log('[Debug][Upload] Iniciando análise global de PDF...', {
                  displayName,
                  pages: images.length
                });
              }
              globalGrouping = await GeminiAdapter.analyzePdfGlobalGrouping(images);
              if (DEBUG_LOGS) {
                console.log('[Debug][Upload] Análise global concluída', {
                  displayName,
                  totalLaudos: globalGrouping.total_laudos,
                  grupos: globalGrouping.grupos.map(g => ({
                    id: g.laudo_id,
                    paginas: g.paginas,
                    tipo: g.tipo_detectado,
                    paciente: g.nome_paciente
                  })),
                  alertas: globalGrouping.alertas
                });
              }

              // VALIDAÇÃO DE SEGURANÇA: Detectar pacientes trocados
              const uniquePatients = new Set(
                globalGrouping.grupos
                  .map(g => g.nome_paciente)
                  .filter(nome => nome && nome.length > 3)
                  .map(nome => nome.trim().toUpperCase())
              );

              if (uniquePatients.size > 1) {
                const pacientesList = Array.from(uniquePatients).join(' vs ');
                console.warn(
                  `⚠️ SEGURANÇA CLÍNICA: PDF "${displayName}" contém laudos de ${uniquePatients.size} pacientes diferentes: ${pacientesList}`
                );
                globalGrouping.alertas.push(
                  `⚠️ SEGURANÇA: PDF contém laudos de múltiplos pacientes: ${pacientesList}`
                );
              }
            } catch (globalErr) {
              console.error('[Debug][Upload] Erro na análise global, usando fallback', globalErr);
              // Continua sem análise global - cada página será analisada individualmente
            }
          }

          images.forEach((blob, idx) => {
            const pageNum = idx + 1;
            const pageFile = new File([blob], `${baseName}_Pg${pageNum}.jpg`, { type: 'image/jpeg' });
            const sourceName = `${displayName} Pg ${pageNum}`;
            const isBlankPage = blankPageMap[idx];

            // Encontrar o grupo desta página na análise global
            const grupo = globalGrouping?.grupos.find(g => g.paginas.includes(pageNum));

            if (isBlankPage) {
              const docId = crypto.randomUUID();
              const tempUrl = URL.createObjectURL(pageFile);

              const newDoc: AttachmentDoc = {
                id: docId,
                file: pageFile,
                source: sourceName,
                previewUrl: tempUrl,
                status: 'done',
                classification: 'pagina_vazia',
                classificationSource: 'auto',
                globalGroupId: grupo?.laudo_id,
                globalGroupType: grupo?.tipo_detectado,
                globalGroupSource: displayName,
                isProvisorio: grupo?.is_provisorio,
                isAdendo: grupo?.is_adendo,
                reportGroupHint: grupo
                  ? `GLOBAL:${grupo.laudo_id}|PDF:${displayName}|TIPO:${grupo.tipo_detectado}`
                  : undefined,
                reportGroupHintSource: 'auto',
                tipoPagina: 'pagina_vazia'
              };

              dispatch({ type: 'ADD_DOC', payload: newDoc });

              if (patient) {
                StorageService.uploadFile(patient.id, pageFile, sourceName)
                  .then((downloadUrl) => {
                    dispatch({
                      type: 'UPDATE_DOC',
                      payload: { id: docId, updates: { previewUrl: downloadUrl } }
                    });
                  })
                  .catch(console.error);
              }
              return;
            }

            // Se tem análise global, criar doc com metadados corretos
            if (grupo) {
              const docId = crypto.randomUUID();
              const tempUrl = URL.createObjectURL(pageFile);

              const newDoc: AttachmentDoc = {
                id: docId,
                file: pageFile,
                source: sourceName,
                previewUrl: tempUrl,
                status: 'pending',
                classification: forcedType ?? 'indeterminado',
                globalGroupId: grupo.laudo_id,
                globalGroupType: grupo.tipo_detectado,
                globalGroupSource: displayName,
                isProvisorio: grupo.is_provisorio,
                isAdendo: grupo.is_adendo,
                reportGroupHint: `GLOBAL:${grupo.laudo_id}|PDF:${displayName}|TIPO:${grupo.tipo_detectado}`,
                reportGroupHintSource: 'auto'
              };

              dispatch({ type: 'ADD_DOC', payload: newDoc });
              enqueue({ type: 'doc', docId: newDoc.id });

              if (patient) {
                StorageService.uploadFile(patient.id, pageFile, sourceName)
                  .then((downloadUrl) => {
                    dispatch({
                      type: 'UPDATE_DOC',
                      payload: { id: docId, updates: { previewUrl: downloadUrl } }
                    });
                  })
                  .catch(console.error);
              }
            } else {
              // Sem análise global, usa fluxo normal
              addDocToSessionAndUpload(pageFile, isHeader, sourceName, forcedType);
            }
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
    // 🔥 FIX: Reclassificar APENAS o documento específico, não todos do grupo
    const doc = session.docs.find(d => d.id === docId);
    if (!doc) return;

    const classificationChanged = doc.classification !== target;

    // 🔥 FIX: Só permite reprocessar se tiver arquivo disponível
    const hasFile = !!doc.file;
    const canReprocess = classificationChanged && hasFile;

    if (DEBUG_LOGS) {
      console.log('[Debug][Reclassify]', {
        docId,
        from: doc.classification,
        to: target,
        hasFile,
        canReprocess
      });
    }

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
        // 🔥 FIX: Sem arquivo, apenas muda classificação e mantém done
        updates.reportGroupHint = doc.reportGroupHint;
        updates.reportGroupHintSource = doc.reportGroupHintSource;
        updates.status = 'done'; // Mantém done, não pending!
      }
    }

    dispatch({ type: 'UPDATE_DOC', payload: { id: docId, updates } });

    if (canReprocess) {
      enqueue({ type: 'doc', docId });
    }

    if (!hasFile && classificationChanged) {
      console.warn('[Reclassify] Arquivo original não disponível. Classificação alterada sem reprocessamento.');
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
    const sessionId = patient?.id || session.patientId || 'local-draft';
    const nextSession = {
      ...session,
      patientId: session.patientId ?? patient?.id ?? null,
      audioJobs: [newJob, ...session.audioJobs]
    };
    // Persist immediately to avoid losing the audio blob on navigation.
    StorageService.saveSession(sessionId, nextSession).catch((error) => {
      console.warn('[StorageService] Audio draft save failed', error);
    });

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
  }, [dispatch, enqueue, patient, session]);

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
      // Sucesso silencioso - o UI já mostra feedback visual (botão verde) e redireciona
    } catch (error) {
      console.error('Erro ao finalizar:', error);
      alert('❌ Erro ao finalizar exame. Tente novamente.');
    }
  }, [patient, session]);

  // Callback para confirmar ou rejeitar agrupamento de múltiplas imagens
  const handleMultipleImagesConfirm = useCallback(async (shouldGroup: boolean) => {
    if (!pendingImages) return;

    const { images, forcedType, remainingFiles, isHeader } = pendingImages;
    const sharedHint = shouldGroup ? `MANUAL_GROUP:${crypto.randomUUID().slice(0, 8)}` : null;

    if (DEBUG_LOGS) {
      console.log('[Debug][MultiImage] Processando resposta do usuário', {
        shouldGroup,
        count: images.length,
        remaining: remainingFiles?.length || 0,
        sharedHint
      });
    }

    // Processar todas as imagens
    images.forEach((file, index) => {
      const resolvedName = resolveFileName(file, index);
      const docId = crypto.randomUUID();
      const tempUrl = URL.createObjectURL(file);

      const newDoc: AttachmentDoc = {
        id: docId,
        file: file,
        source: resolvedName,
        previewUrl: tempUrl,
        status: 'pending',
        classification: forcedType ?? 'indeterminado',
        reportGroupHint: sharedHint || '',
        reportGroupHintSource: sharedHint ? 'manual' : undefined
      };

      dispatch({ type: 'ADD_DOC', payload: newDoc });
      enqueue({ type: 'doc', docId: newDoc.id });

      if (patient) {
        StorageService.uploadFile(patient.id, file, resolvedName)
          .then((downloadUrl) => {
            dispatch({
              type: 'UPDATE_DOC',
              payload: {
                id: docId,
                updates: { previewUrl: downloadUrl }
              }
            });
          })
          .catch(console.error);
      }
    });

    setPendingImages(null);
    if (remainingFiles && remainingFiles.length > 0) {
      await handleFilesUpload(remainingFiles, isHeader, forcedType);
    }
  }, [pendingImages, resolveFileName, dispatch, enqueue, patient, handleFilesUpload]);

  const cancelMultipleImagesDialog = useCallback(() => {
    setPendingImages(null);
  }, []);

  return {
    isGeneratingReport,
    pendingImages,
    handleMultipleImagesConfirm,
    cancelMultipleImagesDialog,
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
