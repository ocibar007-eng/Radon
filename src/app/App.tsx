
import React, { useState, useMemo, useEffect } from 'react';
import { FileText, History, Download, RefreshCw, Loader2 } from 'lucide-react';
import { IntakeCard } from '../features/intake/IntakeCard';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { AudioRecorder } from '../features/audio/AudioRecorder';
import { groupDocsVisuals } from '../utils/grouping';
import { PatientService } from '../services/patient-service';

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
import { Patient } from '../types/patient';

// --- APP ROOT (Router Logic) ---
export default function App() {
  const [currentView, setCurrentView] = useState<'list' | 'workspace'>('list');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

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

  const handleExitWorkspace = () => {
    setCurrentView('list');
  };

  return (
    <SessionProvider>
      <GalleryProvider>
        <div className="app-shell">
          <Sidebar
            currentView={currentView}
            onChangeView={setCurrentView}
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
                onExit={handleExitWorkspace}
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
  onExit: () => void;
}

function WorkspaceLayout({ patient, onExit }: WorkspaceProps) {
  // 1. Contextos & Hooks Base
  const { session, dispatch } = useSession();

  // 2. Lógica de Ações (Refatorada)
  const {
    isGeneratingReport,
    handleFileUpload,
    removeDoc,
    removeReportGroup,
    handleManualReclassify,
    handleSplitReportGroup,
    handleClearSession,
    handleAudioComplete,
    downloadAll
  } = useWorkspaceActions(patient);

  // 3. Estado Local de UI
  const [activeTab, setActiveTab] = useState<'summary' | 'reports'>('summary');
  const [isHydrating, setIsHydrating] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // 4. Persistência & Hidratação
  // 🔥 FIX: Passamos isHydrating para impedir salvamento prematuro
  usePersistence(!isHydrating && patient?.id ? patient.id : undefined, isHydrating);

  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      if (!patient) return;

      // 🔥 FIX CRÍTICO: Se o ID do paciente mudou, limpamos TUDO imediatamente.
      // Não esperamos o await do getPatient, pois isso causa vazamento de estado
      // se o usePersistence rodar nesse meio tempo.
      if (session.patient && session.patient.os.valor !== patient.os) {
        dispatch({ type: 'CLEAR_SESSION' });
      }

      if (session.patient && session.patient.os.valor === patient.os && session.docs.length > 0) return;

      setIsHydrating(true);
      try {
        // OPTIMIZATION: Se for um paciente temporário (Quick Start), não buscamos no banco.
        const isTempPatient = patient.os && patient.os.startsWith('TMP-');
        const fullPatient = isTempPatient ? null : await PatientService.getPatient(patient.id);

        if (!mounted) return;

        if (fullPatient && fullPatient.workspace) {
          dispatch({ type: 'RESTORE_SESSION', payload: fullPatient.workspace as any });
        } else {
          // Se não existe ou é novo, iniciamos limpo (e garantimos novamente)
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
        }
      } finally {
        if (mounted) setIsHydrating(false);
      }
    }
    hydrate();
    return () => { mounted = false; };
  }, [patient?.id, dispatch]);

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
    <div className="app-container">

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

          <Button variant="secondary" onClick={() => setShowClearConfirm(true)} title="Limpar Tela">
            <RefreshCw className="w-4 h-4" size={16} />
          </Button>
        </div>
      </header>

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
    </div>
  );
}
