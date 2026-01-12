
import React from 'react';
import { LayoutGrid, FileText, Settings, Activity, Zap } from 'lucide-react';

interface SidebarProps {
  currentView: 'list' | 'workspace';
  onChangeView: (view: 'list' | 'workspace') => void;
  onQuickStart: () => void;
  hasActivePatient: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onQuickStart, hasActivePatient }) => {
  return (
    <aside className="shell-sidebar">
      {/* Brand Icon */}
      <div className="sidebar-brand">
        <Activity size={24} className="text-accent" />
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <button
          className={`nav-item ${currentView === 'list' ? 'active' : ''}`}
          onClick={() => onChangeView('list')}
          title="Lista de Trabalho"
          aria-label="Lista de Trabalho"
        >
          <LayoutGrid size={20} />
          <span className="nav-label">Lista</span>
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

        <div style={{ height: '1px', width: '60%', background: 'var(--border-subtle)', margin: '0.5rem 0' }} />

        <button
          className="nav-item"
          onClick={onQuickStart}
          title="Iniciar Laudo Avulso (Sem cadastro)"
          aria-label="Iniciar Laudo Rápido"
        >
          <Zap size={20} className="text-accent" />
          <span className="nav-label">Rápido</span>
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
