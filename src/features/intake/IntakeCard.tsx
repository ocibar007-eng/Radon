
import React from 'react';
import { Card } from '../../components/ui/Card';
import { PatientRegistrationDetails, AttachmentDoc } from '../../types';
import type { Patient } from '../../types/patient';
import { User, Calendar, Activity, UploadCloud, Hash } from 'lucide-react';

interface Props {
  data: PatientRegistrationDetails | null;
  headerDoc: AttachmentDoc | null;
  patientRecord?: Patient | null;
}

export const IntakeCard: React.FC<Props> = ({ data, headerDoc, patientRecord }) => {
  const displayName = patientRecord?.name || data?.paciente?.valor || 'Paciente não identificado';
  const displayOs = patientRecord?.os || data?.os?.valor || 'N/A';
  const displayExam = data?.tipo_exame?.valor || patientRecord?.examType || 'N/A';
  const displayDate = data?.data_exame?.valor || patientRecord?.examDate || 'N/A';
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
    <Card className="intake-card p-0 flex flex-row h-auto min-h-[8rem] border-subtle bg-surface">
      {/* Coluna 1: Imagem (Thumbnail) - Agora com fundo Slate e não Preto */}
      <div className="intake-header-image group cursor-pointer">
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
      <div className="intake-body">
        {data ? (
          <>
            <div className="intake-header">
              <span className="intake-label">
                <User size={10} /> Paciente
              </span>
              <span className="intake-name" title={displayName}>
                {displayName}
              </span>
            </div>

            <div className="intake-meta">
              <div className="intake-meta-item">
                <span className="intake-meta-label">
                  <Calendar size={10} /> Realização
                </span>
                <span className="intake-meta-value intake-meta-value--accent" title={displayDate}>
                  {displayDate}
                </span>
              </div>
              <div className="intake-meta-item">
                <span className="intake-meta-label">
                  <Activity size={10} /> Exame
                </span>
                <span className="intake-meta-value" title={displayExam}>
                  {displayExam}
                </span>
              </div>
              <div className="intake-meta-item">
                <span className="intake-meta-label">
                  <Hash size={10} /> OS / Pedido
                </span>
                <span className="intake-meta-value" title={displayOs}>
                  {displayOs}
                </span>
              </div>
            </div>
          </>
        ) : (
          /* Loading State (Skeleton) */
          <div className="intake-skeleton">
            <div className="intake-skeleton-line" />
            <div className="intake-skeleton-row">
              <div className="intake-skeleton-chip" />
              <div className="intake-skeleton-chip" />
              <div className="intake-skeleton-chip" />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
