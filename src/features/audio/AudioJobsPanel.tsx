
import React from 'react';
import { Card } from '../../components/ui/Card';
import { AudioJob } from '../../types';
import { Mic, Clock, Download, Trash2, FileMusic } from 'lucide-react';

interface Props {
  jobs: AudioJob[];
  children?: React.ReactNode;
  onRemoveAudio?: (jobId: string) => void;
}

const MP3_BLOCK_SIZE = 1152;
const MP3_BITRATE = 128;

const isMp3Blob = (blob: Blob, url?: string) => {
  if (blob.type && blob.type.includes('mpeg')) return true;
  if (url && /\.mp3(\?|$)/i.test(url)) return true;
  return false;
};

const resolveFallbackName = (job: AudioJob, blob: Blob, url?: string) => {
  const baseName = `audio_${job.id.slice(0, 6)}`;

  if (blob.type.includes('wav')) return `${baseName}.wav`;
  if (blob.type.includes('mpeg')) return `${baseName}.mp3`;
  if (blob.type.includes('webm')) return `${baseName}.webm`;

  if (url) {
    const match = url.split('?')[0].match(/\.([a-z0-9]+)$/i);
    if (match) return `${baseName}.${match[1]}`;
  }

  return `${baseName}.webm`;
};

const resolveMp3Name = (job: AudioJob) => `audio_${job.id.slice(0, 6)}.mp3`;

const floatTo16BitPCM = (input: Float32Array) => {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
};

const loadMp3Encoder = async () => {
  const globalScope = globalThis as any;
  if (!globalScope.MPEGMode || !globalScope.MPEGMODE) {
    const mpegModule: any = await import('lamejs/src/js/MPEGMode.js');
    const MPEGMode = mpegModule?.default || mpegModule;
    if (MPEGMode) {
      globalScope.MPEGMode = MPEGMode;
      globalScope.MPEGMODE = MPEGMode;
    }
  }

  if (!globalScope.Lame) {
    const lameModule: any = await import('lamejs/src/js/Lame.js');
    const Lame = lameModule?.default || lameModule;
    if (Lame) {
      globalScope.Lame = Lame;
    }
  }

  if (!globalScope.BitStream) {
    const bitstreamModule: any = await import('lamejs/src/js/BitStream.js');
    const BitStream = bitstreamModule?.default || bitstreamModule;
    if (BitStream) {
      globalScope.BitStream = BitStream;
    }
  }

  const mod: any = await import('lamejs');
  return mod.Mp3Encoder || mod.default?.Mp3Encoder || mod.default;
};

const convertBlobToMp3 = async (blob: Blob) => {
  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextCtor) {
    throw new Error('AudioContext not supported');
  }

  const audioContext = new AudioContextCtor();
  try {
    const buffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(buffer.slice(0));
    const channels = Math.min(audioBuffer.numberOfChannels, 2);
    const left = floatTo16BitPCM(audioBuffer.getChannelData(0));
    const right = channels > 1 ? floatTo16BitPCM(audioBuffer.getChannelData(1)) : null;
    const Mp3Encoder = await loadMp3Encoder();
    const encoder = new Mp3Encoder(channels, audioBuffer.sampleRate, MP3_BITRATE);
    const mp3Data: Uint8Array[] = [];

    for (let i = 0; i < left.length; i += MP3_BLOCK_SIZE) {
      const leftChunk = left.subarray(i, i + MP3_BLOCK_SIZE);
      const rightChunk = right ? right.subarray(i, i + MP3_BLOCK_SIZE) : undefined;
      const mp3buf = rightChunk ? encoder.encodeBuffer(leftChunk, rightChunk) : encoder.encodeBuffer(leftChunk);
      if (mp3buf.length > 0) mp3Data.push(mp3buf);
    }

    const flush = encoder.flush();
    if (flush.length > 0) mp3Data.push(flush);

    return new Blob(mp3Data, { type: 'audio/mpeg' });
  } finally {
    audioContext.close();
  }
};

const ensureMp3Blob = async (blob: Blob, url?: string) => {
  if (isMp3Blob(blob, url)) return blob;
  return convertBlobToMp3(blob);
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const AudioJobsPanel: React.FC<Props> = ({ jobs, children, onRemoveAudio }) => {
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
              <div className="job-actions">
                <span className={`job-status status-${job.status}`}>
                  {job.status === 'processing' ? 'Transcrevendo...' : (job.status === 'done' ? 'Concluído' : 'Erro')}
                </span>
                {onRemoveAudio && (
                  <button
                    type="button"
                    className="audio-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!window.confirm('Excluir este áudio e a transcrição?')) return;
                      onRemoveAudio(job.id);
                    }}
                    title="Excluir áudio"
                    aria-label="Excluir áudio"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
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
                    className="audio-download-btn audio-download-btn--minimal"
                    onClick={async (e) => {
                      e.stopPropagation();

                      // Try to download from blob or storageUrl
                      try {
                        let sourceBlob = job.blob;
                        if (!sourceBlob && job.storageUrl) {
                          const response = await fetch(job.storageUrl);
                          if (!response.ok) throw new Error('Download failed');
                          sourceBlob = await response.blob();
                        }

                        if (!sourceBlob) return;

                        const mp3Blob = await ensureMp3Blob(sourceBlob, job.storageUrl);
                        triggerDownload(mp3Blob, resolveMp3Name(job));
                      } catch (error) {
                        console.warn('[Audio] Download failed', error);
                        if (job.blob) {
                          triggerDownload(job.blob, resolveFallbackName(job, job.blob, job.storageUrl));
                        }
                      }
                    }}
                    disabled={!job.blob && !job.storageUrl}
                    aria-label="Baixar audio"
                    title="Baixar audio"
                  >
                    <span className="audio-download-tag">
                      <FileMusic size={12} />
                      MP3
                    </span>
                    <Download size={12} />
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

      {children}
    </aside>
  );
};
