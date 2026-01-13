
import React, { useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { FileText, History, Download, RefreshCw, Loader2, CheckCircle, UploadCloud, AlertTriangle } from 'lucide-react';
import { IntakeCard } from '../features/intake/IntakeCard';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { AudioRecorder } from '../features/audio/AudioRecorder';
import { groupDocsVisuals } from '../utils/grouping';
import { PatientService } from '../services/patient-service';
import { isFirebaseEnabled } from '../core/firebase';
import { buildSessionSnapshot } from '../utils/session-persistence';

// Component Imports
import { DocumentGallery } from '../features/intake/DocumentGallery';
import { ClinicalTab } from '../features/clinical/ClinicalTab';
import { PreviousReportsTab } from '../features/reports/PreviousReportsTab';
import { AudioJobsPanel } from '../features/audio/AudioJobsPanel';
import { PatientList } from '../components/PatientList';
import { Sidebar } from '../components/Sidebar';
import { GlobalGalleryModal } from '../components/GlobalGalleryModal';

// Architecture Imports
import { SessionProvider, useSession } from '../context/SessionContext';
import { GalleryProvider } from '../context/GalleryContext';
import { usePersistence } from '../hooks/usePersistence';
import { useWorkspaceActions } from '../hooks/useWorkspaceActions';
import { usePasteHandler } from '../hooks/usePasteHandler';
import { Patient, PatientStatus } from '../types/patient';
import { StorageService } from '../services/storage-service';

const DEBUG_LOGS = true;

// --- APP ROOT (Router Logic) ---
export default function App() {
  const [currentView, setCurrentView] = useState<'list' | 'workspace'>('list');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [exitRequest, setExitRequest] = useState(false);

  const handleSelectPatient = (patient: Patient) => {
    // 🔥 FIX: Limpa sessão imediatamente para evitar vazamento de dados do paciente anterior
    // enquanto o novo carrega (race condition no usePersistence)
    // Precisamos acessar o dispatch via Context, mas como estamos fora do SessionProvider aqui...
    // WAIT: O SessionProvider está DENTRO do App. Não consigo acessar dispatch aqui no root.
    // SOLUÇÃO: Mover essa lógica para dentro do WorkspaceLayout ou criar um wrapper.
    // Por enquanto, vamos confiar que o WorkspaceLayout vai lidar com isso, 
    // MAS vamos garantir que o ID mude para forçar remontagem se necessário.
    setSelectedPatient(patient);
    setCurrentView('workspace');
  };

  const handleQuickStart = () => {
    const tempPatient: Patient = {
      id: crypto.randomUUID(),
      name: 'Paciente Avulso',
      os: `TMP-${new Date().getHours()}${new Date().getMinutes()}`,
      examType: 'Não especificado',
      status: 'processing',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      docsCount: 0,
      audioCount: 0,
      hasClinicalSummary: false
    };
    handleSelectPatient(tempPatient);
  };

  const handleChangeView = (view: 'list' | 'workspace') => {
    if (view === 'list' && currentView === 'workspace') {
      setExitRequest(true);
      return;
    }
    setCurrentView(view);
  };

  return (
    <SessionProvider>
      <GalleryProvider>
        <div className="app-shell">
          <Sidebar
            currentView={currentView}
            onChangeView={handleChangeView}
            onQuickStart={handleQuickStart}
            hasActivePatient={!!selectedPatient}
          />

          <main className="shell-main scroll-thin">
            {currentView === 'list' ? (
              <PatientList
                onSelectPatient={handleSelectPatient}
                onQuickStart={handleQuickStart}
              />
            ) : (
              <WorkspaceLayout
                patient={selectedPatient}
                exitRequest={exitRequest}
                onExit={() => {
                  setCurrentView('list');
                  setExitRequest(false);
                }}
                onCancelExit={() => setExitRequest(false)}
              />
            )}
          </main>

          <GlobalGalleryModal />
        </div>
      </GalleryProvider>
    </SessionProvider>
  );
}

// --- WORKSPACE LAYOUT ---
interface WorkspaceProps {
  patient: Patient | null;
  exitRequest: boolean;
  onExit: () => void;
  onCancelExit: () => void;
}

function WorkspaceLayout({ patient, exitRequest, onExit, onCancelExit }: WorkspaceProps) {
  // 1. Contextos & Hooks Base
  const { session, dispatch } = useSession();

  // 2. Lógica de Ações (Refatorada)
  const {
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
  } = useWorkspaceActions(patient);

  // 3. Estado Local de UI
  const [activeTab, setActiveTab] = useState<'summary' | 'reports'>('summary');
  const [isHydrating, setIsHydrating] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isDragOverDocs, setIsDragOverDocs] = useState(false);
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
    const forcedType = activeTab === 'reports' ? 'laudo_previo' : 'assistencial';
    if (DEBUG_LOGS) {
      console.log('[Debug][Workspace] paste', {
        count: files.length,
        activeTab,
        forcedType,
        names: files.map(file => file.name)
      });
    }
    handleFilesUpload(files, false, forcedType, (type) => setActiveTab(type));
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

    const forcedType = activeTab === 'reports' ? 'laudo_previo' : 'assistencial';
    if (DEBUG_LOGS) {
      console.log('[Debug][Workspace] drop', {
        count: files.length,
        activeTab,
        forcedType,
        names: files.map(file => file.name)
      });
    }
    handleFilesUpload(files, false, forcedType, (type) => setActiveTab(type));
  }, [activeTab, handleFilesUpload, isFileDragEvent]);

  useEffect(() => {
    const clearDragOverlay = () => setIsDragOverDocs(false);
    window.addEventListener('drop', clearDragOverlay);
    window.addEventListener('dragend', clearDragOverlay);
    return () => {
      window.removeEventListener('drop', clearDragOverlay);
      window.removeEventListener('dragend', clearDragOverlay);
    };
  }, []);

  // 5. Dados Derivados (Views)
  const reportGroups = useMemo(() => {
    const previousReports = session.docs.filter(d => d.classification === 'laudo_previo');
    return groupDocsVisuals(previousReports);
  }, [session.docs]);

  const assistencialDocs = useMemo(() => {
    return session.docs.filter(d => d.classification === 'assistencial' || d.classification === 'indeterminado');
  }, [session.docs]);

  const isDocsProcessing = useMemo(() =>
    session.docs.some(d => d.status === 'processing' || d.status === 'pending'),
    [session.docs]);

  const counts = useMemo(() => ({
    assistencialCount: assistencialDocs.length,
    laudoGroups: reportGroups.length,
    laudoPages: session.docs.filter(d => d.classification === 'laudo_previo').length
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

          <Button variant="secondary" onClick={downloadAll} disabled={isGeneratingReport} isLoading={isGeneratingReport}>
            {!isGeneratingReport && <Download className="w-4 h-4 mr-2" size={16} />}
            Download Report
          </Button>

          {patient && patient.status !== 'done' && (
            <Button variant="primary" onClick={handleFinalize}>
              <CheckCircle size={16} />
              Finalizar
            </Button>
          )}

          <Button variant="secondary" onClick={() => setShowClearConfirm(true)} title="Limpar Tela">
            <RefreshCw className="w-4 h-4" size={16} />
          </Button>
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
              <h2 className="section-title">Identificação</h2>
              <label className="upload-link">
                Trocar Header
                <input type="file" hidden accept="image/*" onChange={(e) => handleFileUpload(e, true)} />
              </label>
            </div>
            <IntakeCard data={session.patient} headerDoc={session.headerImage} />
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
                <History size={16} /> Laudos Prévios
              </button>
            </div>

            <div className="tabs-subbar">
              <span className="count-item text-info">
                {counts.assistencialCount} docs de suporte
              </span>
              <span className="divider">·</span>
              <span className="count-item text-accent">
                {counts.laudoGroups} exames detectados <span style={{ opacity: 0.6, fontWeight: 400 }}>({counts.laudoPages} págs)</span>
              </span>
            </div>

            <div className="tab-content">
              {activeTab === 'summary' && (
                <div role="tabpanel">
                  <ClinicalTab
                    markdown={session.clinicalMarkdown}
                    data={session.clinicalSummaryData}
                    isProcessing={isDocsProcessing}
                  />
                  <DocumentGallery
                    docs={session.docs}
                    reportGroups={reportGroups}
                    // AQUI: Usamos 'undefined' (Auto) para o upload global, ou o 'type' passado pelos inputs internos
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
                    // AQUI: Forçamos 'laudo_previo' pois estamos na aba de laudos
                    onUpload={(e) => handleFileUpload(e, false, 'laudo_previo')}
                    onDropFiles={(files) => handleFilesUpload(files, false, 'laudo_previo', (t) => setActiveTab(t))}
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

      {isDragOverDocs && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm animate-fade-in"
          style={{ pointerEvents: 'none' }}
        >
          <div className="text-center">
            <UploadCloud size={64} className="mx-auto text-amber-500 mb-4 animate-bounce" />
            <p className="text-2xl font-bold text-white mb-2">Solte os arquivos aqui</p>
            <p className="text-zinc-400">
              Imagens ou PDFs — vai para {activeTab === 'reports' ? 'Laudos Prévios' : 'Docs de Suporte'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
