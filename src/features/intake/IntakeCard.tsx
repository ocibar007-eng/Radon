
import React from 'react';
import { Card } from '../../components/ui/Card';
import { PatientRegistrationDetails, AttachmentDoc } from '../../types';
import { User, Calendar, Activity, UploadCloud, Hash } from 'lucide-react';

interface Props {
  data: PatientRegistrationDetails | null;
  headerDoc: AttachmentDoc | null;
}

export const IntakeCard: React.FC<Props> = ({ data, headerDoc }) => {
  // Empty State (Upload Area)
  if (!data && !headerDoc) {
    return (
      <Card className="doc-upload-card">
        <UploadCloud className="text-tertiary" size={24} />
        <span className="doc-upload-text">Arraste a imagem da etiqueta/cabeçalho aqui</span>
      </Card>
    );
  }

  return (
    <Card className="intake-card p-0 overflow-hidden flex flex-row h-32 border-subtle bg-surface">
      {/* Coluna 1: Imagem (Thumbnail) - Agora com fundo Slate e não Preto */}
      <div
        className="w-32 h-full relative border-r border-subtle group cursor-pointer"
        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
      >
        {headerDoc ? (
          <img
            src={headerDoc.previewUrl}
            alt="Header"
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-tertiary">
            <Activity size={24} className="opacity-20" />
          </div>
        )}
        {/* Overlay sutil para integração */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[var(--border-subtle)] opacity-10 pointer-events-none" />
      </div>

      {/* Coluna 2: Dados (Grid) */}
      <div className="flex-1 p-5 grid grid-cols-2 gap-x-8 gap-y-3 content-center">
        {data ? (
          <>
            {/* Paciente (Full width visual) */}
            <div className="col-span-2">
              <span className="text-[10px] uppercase tracking-wider text-tertiary font-bold mb-1 flex items-center gap-1.5">
                <User size={10} /> Paciente
              </span>
              <span className="text-xl text-primary font-semibold tracking-tight block truncate" title={data.paciente?.valor}>
                {data.paciente?.valor || 'Paciente não identificado'}
              </span>
            </div>

            {/* OS / ID */}
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-tertiary font-bold mb-0.5 flex items-center gap-1.5 whitespace-nowrap">
                <Hash size={10} /> OS / Pedido
              </span>
              <span className="text-sm font-mono text-secondary truncate" title={data.os?.valor}>
                {data.os?.valor || 'N/A'}
              </span>
            </div>

            {/* Data */}
            <div className="flex flex-col justify-center border-l border-subtle pl-4 min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-tertiary font-bold mb-0.5 flex items-center gap-1.5 whitespace-nowrap">
                <Calendar size={10} /> Realização
              </span>
              <span className="text-sm font-mono text-accent truncate" title={data.data_exame?.valor}>
                {data.data_exame?.valor || 'N/A'}
              </span>
            </div>
          </>
        ) : (
          /* Loading State (Skeleton) */
          <div className="col-span-2 flex flex-col gap-3 w-full justify-center">
            <div className="h-5 bg-surface-elevated rounded w-1/2 animate-pulse" />
            <div className="flex gap-4">
              <div className="h-4 bg-surface-elevated rounded w-1/4 animate-pulse" />
              <div className="h-4 bg-surface-elevated rounded w-1/4 animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
