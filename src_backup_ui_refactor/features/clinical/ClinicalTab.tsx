
import React from 'react';
import { MarkdownRenderer } from '../../components/MarkdownRenderer';
import { ClinicalSummary } from '../../types';
import { Link2, FileText } from 'lucide-react';

interface Props {
  markdown: string;
  data?: ClinicalSummary;
  isProcessing: boolean;
}

export const ClinicalTab: React.FC<Props> = ({ markdown, data, isProcessing }) => {
  return (
    <div className="clinical-container animate-fade-in">
      {/* 1. Markdown Renderizado */}
      {markdown ? (
        <MarkdownRenderer content={markdown} variant="clinical" />
      ) : (
        <div className="empty-state">
          {isProcessing 
            ? 'Processando documentos e gerando resumo...' 
            : 'Aguardando documentos assistenciais...'}
        </div>
      )}

      {/* 2. Lista de Fontes (Evidências) */}
      {data && data.assistencial_docs && data.assistencial_docs.length > 0 && (
        <div className="sources-section">
          <h4 className="sources-title">
            <Link2 size={14} /> Fontes Analisadas ({data.assistencial_docs.length})
          </h4>
          
          <div className="sources-grid">
            {data.assistencial_docs.map((doc, idx) => (
              <div key={idx} className="source-card">
                <div className="source-header">
                  <h5 className="source-title">
                    <FileText size={12} className="mr-2" style={{ display: 'inline' }}/>
                    {doc.titulo_sugerido || 'Documento sem título'}
                  </h5>
                  {doc.datas_encontradas && doc.datas_encontradas.length > 0 && (
                    <span className="source-date-badge">
                      {doc.datas_encontradas[0]}
                    </span>
                  )}
                </div>
                
                <p className="source-summary">
                  {doc.mini_resumo}
                </p>
                
                <span className="source-origin" title={doc.source}>
                  Arquivo: {doc.source}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
