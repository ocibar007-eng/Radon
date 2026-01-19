
import React, { useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { FileText, History, Download, Loader2, CheckCircle, UploadCloud, AlertTriangle, ScanLine, Eraser, ArrowDown, Pencil } from 'lucide-react';
import { IntakeCard } from '../intake/IntakeCard';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { AudioRecorder } from '../audio/AudioRecorder';
import { groupDocsVisuals } from '../../utils/grouping';
import { PatientService } from '../../services/patient-service';
import { isFirebaseEnabled } from '../../core/firebase';
import { buildSessionSnapshot } from '../../utils/session-persistence';
import { StorageService } from '../../services/storage-service';

// Component Imports
import { DocumentGallery } from '../intake/DocumentGallery';
import { ClinicalTab } from '../clinical/ClinicalTab';
import { PreviousReportsTab } from '../reports/PreviousReportsTab';
import { AudioJobsPanel } from '../audio/AudioJobsPanel';
import { OcrImportModal } from './OcrImportModal';
import { HistoryItem } from '../ocr-batch/types';
import { GroupingConfirmDialog } from '../../components/GroupingConfirmDialog';
import { MultipleImagesDialog } from '../../components/MultipleImagesDialog';

// Architecture Imports
import { useSession } from '../../context/SessionContext';
import { usePersistence } from '../../hooks/usePersistence';
import { useWorkspaceActions } from '../../hooks/useWorkspaceActions';
import { usePasteHandler } from '../../hooks/usePasteHandler';
import { Patient, PatientStatus } from '../../types/patient';

const DEBUG_LOGS = true;

interface WorkspaceLayoutProps {
    patient: Patient | null;
    exitRequest: boolean;
    onExit: () => void;
    onCancelExit: () => void;
}

/**
 * WorkspaceLayout - Main editor interface for patient workspaces
 * 
 * Handles:
 * - Session hydration from IndexedDB/Firestore
 * - Document and audio processing
 * - Tab management (Clinical Summary vs Previous Reports)
 * - Drag & drop file handling
 * - Auto-save and exit confirmation
 */
export function WorkspaceLayout({ patient, exitRequest, onExit, onCancelExit }: WorkspaceLayoutProps) {
    // 1. Contextos & Hooks Base
    const { session, dispatch } = useSession();

    // 2. Lógica de Ações (Refatorada)
    const {
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
    } = useWorkspaceActions(patient);

    // 3. Estado Local de UI
    const [activeTab, setActiveTab] = useState<'summary' | 'reports'>('summary');
    const [isHydrating, setIsHydrating] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
    const [showOcrImportModal, setShowOcrImportModal] = useState(false);
    const [importedOcrData, setImportedOcrData] = useState<HistoryItem | null>(null);
    const [isDragOverDocs, setIsDragOverDocs] = useState(false);
    const [dragOverZone, setDragOverZone] = useState<'suporte' | 'laudo' | null>(null);
    const [showEditPatient, setShowEditPatient] = useState(false);
    const [editName, setEditName] = useState(patient?.name || '');
    const [editOs, setEditOs] = useState(patient?.os || '');
    const lastStatusRef = useRef<PatientStatus | null>(null);
    const sessionRef = useRef(session);
    const firebaseActive = isFirebaseEnabled();

    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    // 4. Persistência & Hidratação
    // 🔥 FIX: Passamos isHydrating para impedir salvamento prematuro
    usePersistence(!isHydrating && patient?.id ? patient.id : undefined, isHydrating);

    useLayoutEffect(() => {
        if (!patient) return;

        const sessionPatientId = session.patientId;
        const isSamePatient = !!sessionPatientId && sessionPatientId === patient.id;
        if (isSamePatient) return;

        if (session.patient || sessionPatientId) {
            dispatch({ type: 'CLEAR_SESSION' });
        }
        dispatch({ type: 'SET_PATIENT_ID', payload: patient.id });
    }, [patient?.id, session.patient, session.patientId, dispatch]);

    useEffect(() => {
        let mounted = true;
        async function hydrate() {
            if (!patient) return;

            const sessionPatientId = session.patientId;
            const samePatientById = !!sessionPatientId && sessionPatientId === patient.id;
            const samePatientByData = !!session.patient &&
                session.patient.os.valor === patient.os &&
                session.patient.paciente.valor === patient.name &&
                session.patient.tipo_exame.valor === patient.examType;
            const isSamePatient = samePatientById || samePatientByData;

            if (!isSamePatient && (session.patient || sessionPatientId)) {
                dispatch({ type: 'CLEAR_SESSION' });
            }

            dispatch({ type: 'SET_PATIENT_ID', payload: patient.id });

            if (isSamePatient && session.docs.length > 0) return;

            setIsHydrating(true);
            try {
                // 1. Prioridade Máxima: IndexedDB (Crash Recovery)
                const localSession = await StorageService.loadSession(patient.id);

                if (localSession && mounted) {
                    console.log(`[Hydrate] Restaurando sessão do IndexedDB para ${patient.id}...`);
                    dispatch({ type: 'RESTORE_SESSION', payload: localSession });
                    setIsHydrating(false);
                    return;
                }

                // 2. Fallback: Firestore (Modo Nuvem)
                const isTempPatient = patient.os && patient.os.startsWith('TMP-');
                const fullPatient = isTempPatient ? null : await PatientService.getPatient(patient.id);

                if (!mounted) return;

                if (fullPatient && fullPatient.workspace) {
                    const workspace = fullPatient.workspace as any;
                    dispatch({ type: 'RESTORE_SESSION', payload: workspace });
                    dispatch({ type: 'SET_PATIENT_ID', payload: patient.id });
                } else {
                    // 3. New Session
                    dispatch({ type: 'CLEAR_SESSION' });
                    dispatch({
                        type: 'SET_PATIENT',
                        payload: {
                            paciente: { valor: patient.name, confianca: 'alta', evidencia: 'Cadastro', candidatos: [] },
                            os: { valor: patient.os, confianca: 'alta', evidencia: 'Cadastro', candidatos: [] },
                            tipo_exame: { valor: patient.examType, confianca: 'media', evidencia: 'Cadastro', candidatos: [] },
                            data_exame: { valor: '', confianca: 'baixa', evidencia: '', data_normalizada: null, hora: null, candidatos: [] },
                            outras_datas_encontradas: [],
                            observacoes: []
                        }
                    });
                    dispatch({ type: 'SET_PATIENT_ID', payload: patient.id });
                }
            } catch (error) {
                console.error("Erro na hidratação:", error);

                // FALLBACK ROBUSTO: Se falhar (offline), iniciamos a sessão com o que temos.
                if (mounted) {
                    dispatch({ type: 'CLEAR_SESSION' });
                    dispatch({
                        type: 'SET_PATIENT',
                        payload: {
                            paciente: { valor: patient.name, confianca: 'alta', evidencia: 'Cadastro Offline', candidatos: [] },
                            os: { valor: patient.os, confianca: 'alta', evidencia: 'Cadastro Offline', candidatos: [] },
                            tipo_exame: { valor: patient.examType, confianca: 'media', evidencia: 'Cadastro Offline', candidatos: [] },
                            data_exame: { valor: '', confianca: 'baixa', evidencia: '', data_normalizada: null, hora: null, candidatos: [] },
                            outras_datas_encontradas: [],
                            observacoes: []
                        }
                    });
                    dispatch({ type: 'SET_PATIENT_ID', payload: patient.id });
                }
            } finally {
                if (mounted) setIsHydrating(false);
            }
        }
        hydrate();
        return () => { mounted = false; };
    }, [patient?.id, dispatch]);

    useEffect(() => {
        if (!patient || isHydrating) return;
        if (patient.status === 'done') {
            lastStatusRef.current = 'done';
            return;
        }

        const hasDocs = session.docs.length > 0;
        const hasAudio = session.audioJobs.length > 0;
        const hasProcessingDocs = session.docs.some(doc => doc.status === 'pending' || doc.status === 'processing');
        const hasProcessingAudio = session.audioJobs.some(job => job.status === 'processing');
        const hasProcessing = hasProcessingDocs || hasProcessingAudio;

        let nextStatus: PatientStatus = 'waiting';
        if (hasDocs || hasAudio) {
            nextStatus = hasAudio ? 'in_progress' : 'ready';
        }
        if (hasProcessing) {
            nextStatus = 'processing';
        }

        if (lastStatusRef.current === nextStatus) return;
        lastStatusRef.current = nextStatus;

        if (patient.status === nextStatus) return;

        PatientService.updatePatient(patient.id, {
            status: nextStatus,
            hasAttachments: hasDocs || hasAudio
        }).catch((error) => {
            console.error('Erro ao atualizar status:', error);
        });
    }, [patient, session.docs, session.audioJobs, isHydrating]);

    const flushWorkspace = useCallback(async () => {
        if (!patient?.id) return;
        const snapshot = buildSessionSnapshot(sessionRef.current);
        try {
            await PatientService.saveWorkspaceState(patient.id, snapshot);
        } catch (error) {
            console.error('Erro ao salvar antes de sair:', error);
        }
    }, [patient?.id]);

    const hasPendingProcessing = session.docs.some(doc => doc.status === 'pending' || doc.status === 'processing') ||
        session.audioJobs.some(job => job.status === 'processing');

    useEffect(() => {
        if (!exitRequest) return;

        if (hasPendingProcessing) {
            setShowExitConfirm(true);
            return;
        }

        flushWorkspace().finally(() => {
            setShowExitConfirm(false);
            onExit();
        });
    }, [exitRequest, hasPendingProcessing, flushWorkspace, onExit]);

    const handlePasteDocs = useCallback((files: File[]) => {
        if (!files.length) return;
        // ⚠️ REMOVIDO forcedType para permitir classificação correta pela IA
        // Agora Guias, Pedidos, Termos e Questionários serão classificados corretamente
        if (DEBUG_LOGS) {
            console.log('[Debug][Workspace] paste', {
                count: files.length,
                activeTab,
                names: files.map(file => file.name)
            });
        }
        handleFilesUpload(files, false, undefined, (type) => setActiveTab(type));
    }, [activeTab, handleFilesUpload]);

    usePasteHandler({ onFilePaste: handlePasteDocs, enabled: true });

    const isFileDragEvent = useCallback((event: React.DragEvent) => {
        const types = event.dataTransfer?.types;
        if (!types) return false;
        return Array.from(types).includes('Files');
    }, []);

    const handleWorkspaceDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        if (!isFileDragEvent(event)) return;
        const target = event.target as HTMLElement | null;
        if (target?.closest('.doc-drop-zones') || target?.closest('.doc-list-group') || target?.closest('.reports-grid')) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'copy';
        setIsDragOverDocs(true);
    }, [isFileDragEvent]);

    const handleWorkspaceDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        if (!isFileDragEvent(event)) return;
        const related = event.relatedTarget as Node | null;
        if (related && event.currentTarget.contains(related)) return;
        setIsDragOverDocs(false);
    }, [isFileDragEvent]);

    const handleWorkspaceDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        if (event.defaultPrevented) {
            setIsDragOverDocs(false);
            return;
        }
        if (!isFileDragEvent(event)) return;
        event.preventDefault();
        event.stopPropagation();
        setIsDragOverDocs(false);

        const files = Array.from(event.dataTransfer.files || []) as File[];
        if (!files.length) return;

        // ⚠️ REMOVIDO forcedType para permitir classificação correta pela IA
        if (DEBUG_LOGS) {
            console.log('[Debug][Workspace] drop', {
                count: files.length,
                activeTab,
                names: files.map(file => file.name)
            });
        }
        handleFilesUpload(files, false, undefined, (type) => setActiveTab(type));
    }, [activeTab, handleFilesUpload, isFileDragEvent]);

    useEffect(() => {
        const clearDragOverlay = () => setIsDragOverDocs(false);
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isDragOverDocs) setIsDragOverDocs(false);
        };
        window.addEventListener('drop', clearDragOverlay);
        window.addEventListener('dragend', clearDragOverlay);
        window.addEventListener('keydown', handleEsc);
        return () => {
            window.removeEventListener('drop', clearDragOverlay);
            window.removeEventListener('dragend', clearDragOverlay);
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isDragOverDocs]);

    // 5. Dados Derivados (Views)
    const reportGroups = useMemo(() => {
        // Agora incluímos os novos tipos para que apareçam na aba de Laudos/Exames
        const reportsTypes = ['laudo_previo', 'pedido_medico', 'termo_consentimento', 'questionario', 'guia_autorizacao', 'assistencial'];
        const previousReports = session.docs.filter(d => reportsTypes.includes(d.classification));
        return groupDocsVisuals(previousReports);
    }, [session.docs]);

    const assistencialDocs = useMemo(() => {
        // Documentos de suporte administrativo ou não identificados
        return session.docs.filter(d =>
            d.classification === 'assistencial' ||
            d.classification === 'administrativo' ||
            d.classification === 'indeterminado'
        );
    }, [session.docs]);

    const isDocsProcessing = useMemo(() =>
        session.docs.some(d => d.status === 'processing' || d.status === 'pending'),
        [session.docs]);

    const counts = useMemo(() => ({
        assistencialCount: assistencialDocs.length,
        laudoGroups: reportGroups.length,
        laudoPages: session.docs.filter(d => ['laudo_previo', 'pedido_medico', 'termo_consentimento', 'questionario', 'guia_autorizacao'].includes(d.classification)).length
    }), [session.docs, reportGroups, assistencialDocs]);

    // --- RENDER ---
    if (isHydrating) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="animate-spin text-accent" size={48} />
                <p className="text-muted">Iniciando sessão...</p>
            </div>
        );
    }

    return (
        <div
            className="app-container"
            onDragOver={handleWorkspaceDragOver}
            onDragLeave={handleWorkspaceDragLeave}
            onDrop={handleWorkspaceDrop}
        >

            {/* HEADER */}
            <header className="header">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="header-title">
                            {patient ? patient.name : <span>Novo</span>} <span>Workspace</span>
                        </h1>
                        {patient && <span className="text-muted text-xs font-mono">{patient.os}</span>}
                    </div>
                </div>

                <div className="header-actions">
                    <div className="recorder-wrapper">
                        <AudioRecorder onRecordingComplete={handleAudioComplete} isProcessing={false} />
                    </div>

                    <button
                        className={`w-10 h-10 flex items-center justify-center rounded-lg bg-transparent hover:bg-zinc-700 transition-all ${importedOcrData ? 'text-green-400' : 'text-zinc-400 hover:text-white'}`}
                        onClick={() => setShowOcrImportModal(true)}
                        title={importedOcrData ? 'OCR Vinculado ✓' : 'Importar OCR'}
                    >
                        <div className="relative">
                            <ScanLine size={20} />
                            <ArrowDown size={10} className={`absolute -bottom-1 -right-1 ${importedOcrData ? 'text-green-500' : 'text-amber-500'}`} />
                        </div>
                    </button>

                    <button
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-transparent hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all disabled:opacity-50"
                        onClick={() => downloadAll(importedOcrData ? { batchName: importedOcrData.batchName, jsonResult: importedOcrData.jsonResult } : undefined)}
                        disabled={isGeneratingReport}
                        title="Baixar Laudo"
                    >
                        {isGeneratingReport ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <div className="relative">
                                <FileText size={18} />
                                <Download size={10} className="absolute -bottom-1 -right-1 text-amber-500" />
                            </div>
                        )}
                    </button>

                    {patient && patient.status !== 'done' ? (
                        <Button variant="primary" onClick={() => setShowFinalizeConfirm(true)}>
                            <CheckCircle size={16} />
                            Finalizar
                        </Button>
                    ) : patient && patient.status === 'done' ? (
                        <Button
                            variant="secondary"
                            className="border-green-500/50 text-green-400 bg-green-500/10 cursor-default"
                            disabled
                        >
                            <CheckCircle size={16} className="text-green-400" />
                            Finalizado
                        </Button>
                    ) : null}

                    <button
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-transparent hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-all"
                        onClick={() => setShowClearConfirm(true)}
                        title="Limpar Tela"
                    >
                        <Eraser size={20} />
                    </button>
                </div>
            </header>

            {!firebaseActive && (
                <div className="mb-4 p-4 border border-yellow-500 bg-yellow-900/20 text-yellow-200 rounded flex items-center gap-2">
                    <AlertTriangle size={20} />
                    <div>
                        <strong>Modo Offline</strong>
                        <p className="text-sm opacity-80">
                            Firebase não configurado. Os dados podem não ser persistidos após recarregar.
                        </p>
                    </div>
                </div>
            )}

            {/* MAIN GRID */}
            <div className="main-grid">
                <div className="main-content">

                    {/* INTAKE / ID */}
                    <section>
                        <div className="section-header">
                            <h2 className="section-title">Contexto do Paciente</h2>
                            <button
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-transparent hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer"
                                title="Editar dados do paciente"
                                onClick={() => {
                                    setEditName(session.patient?.paciente?.valor || '');
                                    setEditOs(session.patient?.os?.valor || '');
                                    setShowEditPatient(true);
                                }}
                            >
                                <Pencil size={16} />
                            </button>
                        </div>
                        <IntakeCard data={session.patient} headerDoc={session.headerImage} patientRecord={patient} />
                    </section>

                    {/* TABS CONTAINER */}
                    <section className="glass tabs-container">
                        <div className="tabs-header" role="tablist">
                            <button
                                role="tab"
                                aria-selected={activeTab === 'summary'}
                                onClick={() => setActiveTab('summary')}
                                className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                            >
                                <FileText size={16} /> Resumo Clínico
                            </button>
                            <button
                                role="tab"
                                aria-selected={activeTab === 'reports'}
                                onClick={() => setActiveTab('reports')}
                                className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
                            >
                                <History size={16} /> Documentos Clínicos
                            </button>
                        </div>

                        <div className="tabs-subbar">
                            <span className="count-item text-info">
                                {counts.assistencialCount} docs de suporte
                            </span>
                            <span className="divider">·</span>
                            <span className="count-item text-accent">
                                {counts.laudoGroups} documentos clínicos detectados <span style={{ opacity: 0.6, fontWeight: 400 }}>({counts.laudoPages} págs)</span>
                            </span>
                        </div>

                        <div className="tab-content">
                            {activeTab === 'summary' && (
                                <div role="tabpanel">
                                    <ClinicalTab
                                        markdown={session.clinicalMarkdown}
                                        data={session.clinicalSummaryData}
                                        patientHeader={session.patient}
                                        patientRecord={patient}
                                        isProcessing={isDocsProcessing}
                                    />
                                    <DocumentGallery
                                        docs={session.docs}
                                        reportGroups={reportGroups}
                                        onUpload={(e, type) => handleFileUpload(e, false, type, (t) => setActiveTab(t))}
                                        onDropFiles={(files, target) => handleFilesUpload(files, false, target, (t) => setActiveTab(t))}
                                        onRemoveDoc={removeDoc}
                                        onReclassifyDoc={handleManualReclassify}
                                    />
                                </div>
                            )}

                            {activeTab === 'reports' && (
                                <div role="tabpanel">
                                    <PreviousReportsTab
                                        groups={reportGroups}
                                        onRemoveGroup={(groupId) => removeReportGroup(groupId, reportGroups)}
                                        onSplitGroup={handleSplitReportGroup}
                                        onUpload={(e) => handleFileUpload(e, false, undefined)}
                                        onDropFiles={(files) => handleFilesUpload(files, false, undefined, (t) => setActiveTab(t))}
                                        onReclassifyDoc={handleManualReclassify}
                                    />
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* SIDEBAR */}
                <AudioJobsPanel jobs={session.audioJobs} />
            </div>

            {/* Confirmation Modal for Clear Session */}
            <ConfirmModal
                isOpen={showClearConfirm}
                title="Limpar Tela?"
                message="Essa ação irá limpar todos os documentos e dados da sessão atual. Deseja continuar?"
                confirmLabel="Limpar"
                cancelLabel="Cancelar"
                variant="danger"
                onConfirm={() => {
                    handleClearSession();
                    setShowClearConfirm(false);
                }}
                onCancel={() => setShowClearConfirm(false)}
            />

            <ConfirmModal
                isOpen={showExitConfirm}
                title="Sair com processamentos ativos?"
                message="Ainda existem documentos ou áudios em processamento. Se sair agora, eles continuarão em background, mas o resultado pode demorar para aparecer. Deseja sair mesmo assim?"
                confirmLabel="Sair"
                cancelLabel="Ficar"
                onConfirm={() => {
                    flushWorkspace().finally(() => {
                        setShowExitConfirm(false);
                        onExit();
                    });
                }}
                onCancel={() => {
                    setShowExitConfirm(false);
                    onCancelExit();
                }}
            />

            <ConfirmModal
                isOpen={showFinalizeConfirm}
                title="Finalizar Exame?"
                message={`Deseja finalizar o exame de ${patient?.name || 'paciente'}? Ele será marcado como concluído e não poderá ser editado.`}
                confirmLabel="Finalizar"
                cancelLabel="Cancelar"
                variant="primary"
                onConfirm={async () => {
                    await handleFinalize(true);
                    setShowFinalizeConfirm(false);
                    // Pequeno delay para o usuário ver o feedback, depois volta para a lista
                    setTimeout(() => {
                        onExit();
                    }, 500);
                }}
                onCancel={() => setShowFinalizeConfirm(false)}
            />

            <OcrImportModal
                isOpen={showOcrImportModal}
                patientName={patient?.name || ''}
                patientOs={patient?.os || ''}
                onImport={(historyItem) => {
                    setImportedOcrData(historyItem);
                    console.log('[OCR Import] Vinculado ao paciente:', historyItem.batchName);
                }}
                onClose={() => setShowOcrImportModal(false)}
            />

            {/* Modal Editar Paciente */}
            {showEditPatient && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowEditPatient(false)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') setShowEditPatient(false);
                        if (e.key === 'Enter') {
                            dispatch({ type: 'UPDATE_PATIENT', payload: { name: editName, os: editOs } });
                            setShowEditPatient(false);
                        }
                    }}
                >
                    <div
                        className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-white mb-4">Editar Paciente</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Nome do Paciente</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">OS / Pedido</label>
                                <input
                                    type="text"
                                    value={editOs}
                                    onChange={(e) => setEditOs(e.target.value)}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                                onClick={() => setShowEditPatient(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors"
                                onClick={async () => {
                                    // Cria payload com estrutura correta
                                    const updatedPatient = {
                                        paciente: { ...session.patient?.paciente, valor: editName },
                                        os: { ...session.patient?.os, valor: editOs }
                                    };

                                    // Atualiza estado local
                                    dispatch({ type: 'UPDATE_PATIENT', payload: updatedPatient });

                                    // Persiste no Firebase se paciente existir
                                    if (patient?.id && !patient.id.startsWith('tmp_')) {
                                        try {
                                            await PatientService.updatePatient(patient.id, {
                                                name: editName,
                                                os: editOs
                                            });
                                        } catch (e) {
                                            console.error('Erro ao salvar paciente:', e);
                                        }
                                    }
                                    setShowEditPatient(false);
                                }}
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isDragOverDocs && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/70 backdrop-blur-sm animate-fade-in"
                >
                    <div className="flex flex-col items-center max-w-xl w-full px-8">
                        <UploadCloud size={48} className="text-amber-500 mb-4 animate-bounce" />
                        <p className="text-xl font-bold text-white mb-6">Solte os arquivos aqui</p>

                        {/* Zona Única de Upload */}
                        <div
                            className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed w-full transition-all cursor-pointer min-h-[150px] border-amber-500/50 bg-amber-500/15 hover:bg-amber-500/25"
                            onDragEnter={(e) => { e.preventDefault(); }}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const files = Array.from(e.dataTransfer.files || []);
                                if (files.length > 0) handleFilesUpload(files, false, undefined); // IA classifica tudo
                                setIsDragOverDocs(false);
                                setDragOverZone(null);
                            }}
                        >
                            <FileText size={36} className="mb-3 text-amber-400" />
                            <span className="font-bold text-center text-lg text-amber-300">DOCUMENTOS DO PACIENTE</span>
                            <span className="text-amber-400/70 text-sm mt-1">A IA irá classificar automaticamente</span>
                        </div>

                        <p className="text-zinc-500 text-sm mt-4">Pressione ESC para cancelar</p>
                    </div>
                </div>
            )}

            {/* Diálogo de Múltiplas Imagens */}
            {pendingImages && (
                <MultipleImagesDialog
                    images={pendingImages.images}
                    onConfirm={handleMultipleImagesConfirm}
                    onCancel={cancelMultipleImagesDialog}
                />
            )}
        </div>
    );
}
