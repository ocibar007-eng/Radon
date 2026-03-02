
import React from 'react';
import { LayoutGrid, FileText, Settings, Zap, ScanLine, FlaskConical, ListChecks, ExternalLink } from 'lucide-react';

interface SidebarProps {
  currentView: 'list' | 'workspace' | 'ocr-batch' | 'sandbox';
  onChangeView: (view: 'list' | 'workspace' | 'ocr-batch' | 'sandbox') => void;
  onQuickStart: () => void;
  hasActivePatient: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onQuickStart, hasActivePatient }) => {
  const worklistSheetUrl = String(import.meta.env.VITE_WORKLIST_SHEET_URL || 'https://docs.google.com/spreadsheets/d/1WMMBvb89TXDu3n5M3w_w3SXnsDnSlJVzcXeTQ1Wp_04/edit?gid=746869844#gid=746869844').trim();

  const openWorklistSheet = () => {
    if (!worklistSheetUrl) return;
    window.open(worklistSheetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <aside className="shell-sidebar">
      {/* Brand Icon */}
      <div className="sidebar-brand">
        <img src="/logo.png?v=2" alt="Radon" className="w-full h-full object-contain" />
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <button
          className={`nav-item ${currentView === 'list' ? 'active' : ''}`}
          onClick={() => onChangeView('list')}
          title="Pacientes (lista de trabalho do app)"
          aria-label="Pacientes"
        >
          <ListChecks size={20} />
          <span className="nav-label">Pacientes</span>
        </button>

        <button
          className="nav-item nav-item-external"
          onClick={openWorklistSheet}
          title="Abrir Worklist no Google Sheets"
          aria-label="Abrir planilha Worklist"
        >
          <LayoutGrid size={20} />
          <span className="nav-label">Planilha</span>
          <ExternalLink size={11} className="nav-item-badge" />
        </button>

        <button
          className={`nav-item ${currentView === 'workspace' && hasActivePatient ? 'active' : ''}`}
          onClick={() => hasActivePatient && onChangeView('workspace')}
          disabled={!hasActivePatient}
          title={hasActivePatient ? "Voltar ao Paciente" : "Selecione um paciente na lista"}
          aria-label="Laudo do Paciente"
        >
          <FileText size={20} />
          <span className="nav-label">Laudo</span>
        </button>



        <button
          className="nav-item"
          onClick={onQuickStart}
          title="Iniciar Laudo Avulso (Sem cadastro)"
          aria-label="Iniciar Laudo Rápido"
        >
          <Zap size={20} className="text-accent" />
          <span className="nav-label">Rápido</span>
        </button>

        <button
          className={`nav-item ${currentView === 'ocr-batch' ? 'active' : ''}`}
          onClick={() => onChangeView('ocr-batch')}
          title="OCR Batch Processor - Processar lotes de imagens DICOM/JPEG"
          aria-label="OCR Batch"
        >
          <ScanLine size={20} />
          <span className="nav-label">OCR</span>
        </button>

        <button
          className={`nav-item ${currentView === 'sandbox' ? 'active' : ''}`}
          onClick={() => onChangeView('sandbox')}
          title="Sandbox - Testes do pipeline"
          aria-label="Sandbox"
        >
          <FlaskConical size={20} />
          <span className="nav-label">Sandbox</span>
        </button>
      </nav>

      {/* Footer / Settings */}
      <div className="sidebar-footer">
        <button className="nav-item" title="Configurações (Em breve)" aria-label="Configurações">
          <Settings size={20} />
        </button>
      </div>
    </aside>
  );
};
