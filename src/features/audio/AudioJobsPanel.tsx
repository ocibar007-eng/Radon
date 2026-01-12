
import React from 'react';
import { Card } from '../../components/ui/Card';
import { AudioJob } from '../../types';
import { Mic, Clock, FileText, Download } from 'lucide-react';

interface Props {
  jobs: AudioJob[];
}

export const AudioJobsPanel: React.FC<Props> = ({ jobs }) => {
  return (
    <aside className="sidebar">
      <h2 className="section-title">
        <span className="flex items-center gap-2"><Mic size={14} /> Transcrições</span>
        {jobs.length > 0 && <span className="text-xs font-normal text-tertiary bg-surface-elevated px-2 py-0.5 rounded-full">{jobs.length}</span>}
      </h2>

      <div className="audio-jobs-list">
        {jobs.length === 0 && (
          <div className="audio-empty-state">
            <div className="mb-2 opacity-50"><Mic size={24} /></div>
            <p>Nenhuma gravação recente.</p>
            <span className="text-xs opacity-70">Use o botão "Gravar" acima.</span>
          </div>
        )}

        {jobs.map(job => (
          <Card key={job.id} className="job-item border-subtle bg-surface hover:bg-surface-elevated transition-colors">
            <div className="job-header">
              <span className="job-time flex items-center gap-1.5">
                <Clock size={10} />
                {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className={`job-status status-${job.status}`}>
                {job.status === 'processing' ? 'Transcrevendo...' : (job.status === 'done' ? 'Concluído' : 'Erro')}
              </span>
            </div>

            {job.status === 'done' ? (
              <div className="mt-2">
                {job.transcriptRows && job.transcriptRows.length > 0 ? (
                  <div className="transcript-table scroll-thin">
                    {job.transcriptRows.map((row, i) => (
                      <div key={i} className="transcript-row">
                        <span className="t-time">{row.tempo}</span>
                        <span className="t-text">{row.texto}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-2 bg-surface-elevated rounded border border-subtle">
                    <p className="job-transcript font-mono text-xs leading-relaxed">{job.transcriptRaw}</p>
                  </div>
                )}

                {/* Download Audio Action */}
                <div className="border-t border-subtle mt-3 pt-2 flex justify-end">
                  <button
                    className="text-xs flex items-center gap-1 text-tertiary hover:text-primary transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();

                      // Try to download from blob or storageUrl
                      if (job.blob) {
                        const url = URL.createObjectURL(job.blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `audio_${job.id.slice(0, 6)}.mp3`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } else if (job.storageUrl) {
                        const a = document.createElement('a');
                        a.href = job.storageUrl;
                        a.download = `audio_${job.id.slice(0, 6)}.mp3`;
                        a.target = '_blank';
                        a.click();
                      }
                    }}
                    disabled={!job.blob && !job.storageUrl}
                  >
                    <Download size={12} /> Baixar Áudio
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="shimmer-bg h-2 w-3/4 rounded opacity-20" />
                <div className="shimmer-bg h-2 w-1/2 rounded opacity-20" />
              </div>
            )}
          </Card>
        ))}
      </div>
    </aside>
  );
};
