/**
 * CorrectionInput — Caixa de texto + microfone para correções do radiologista.
 * O áudio é gravado e pode ser transcrito para inserir como texto.
 */

import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Send, Loader2 } from 'lucide-react';
import { transcribeAudio as transcribeAudioWithGemini } from '../../../adapters/gemini-prompts';
import type { DraftStatus } from '../useDraft';

interface Props {
    corrections: string;
    status: DraftStatus;
    onCorrectionsChange: (text: string) => void;
    onRegenerate: () => void;
    onRegenerateFull: () => void;
}

export const CorrectionInput: React.FC<Props> = ({
    corrections,
    status,
    onCorrectionsChange,
    onRegenerate,
    onRegenerateFull,
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [audioError, setAudioError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const transcribeRecordedAudio = useCallback(async (blob: Blob) => {
        setIsTranscribing(true);
        try {
            setAudioError(null);
            const { text } = await transcribeAudioWithGemini(blob);
            const transcription = text?.trim();
            if (transcription) {
                onCorrectionsChange(
                    corrections ? `${corrections}\n${transcription}` : transcription
                );
            }
        } catch (err) {
            console.error('[CorrectionInput] Transcription error:', err);
            setAudioError('Falha ao transcrever o áudio. Tente novamente.');
        } finally {
            setIsTranscribing(false);
        }
    }, [corrections, onCorrectionsChange]);

    const startRecording = useCallback(async () => {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            setAudioError('Seu navegador não suporta gravação de áudio nesta página.');
            return;
        }

        try {
            setAudioError(null);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const preferredMimeType = MediaRecorder.isTypeSupported?.('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported?.('audio/webm')
                    ? 'audio/webm'
                    : undefined;
            const mediaRecorder = preferredMimeType
                ? new MediaRecorder(stream, { mimeType: preferredMimeType })
                : new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach((t) => t.stop());
                const blob = new Blob(chunksRef.current, { type: preferredMimeType || 'audio/webm' });
                await transcribeRecordedAudio(blob);
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error('[CorrectionInput] Microphone error:', err);
            setAudioError('Não foi possível acessar o microfone.');
        }
    }, [transcribeRecordedAudio]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    }, []);

    const toggleRecording = useCallback(() => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }, [isRecording, startRecording, stopRecording]);

    const isRegenerating = status === 'regenerating';
    const canRegenerate = corrections.trim().length > 0 && !isRegenerating;
    const handleFullRegenerate = () => {
        const confirmed = window.confirm(
            'Regenerar completo usa mais tokens. Deseja continuar?',
        );
        if (!confirmed) return;
        onRegenerateFull();
    };

    return (
        <div className="draft-correction">
            <div className="draft-correction-header">
                <span className="draft-correction-title">Correções</span>
                <span className="draft-correction-hint">
                    Digite ou dite suas correções. A IA irá reprocessar o laudo.
                </span>
            </div>
            {audioError && <div className="draft-correction-error">{audioError}</div>}

            <div className="draft-correction-input-row">
                <textarea
                    className="draft-correction-textarea"
                    placeholder="Ex: Trocar 'nódulo' por 'cisto'. Adicionar nota sobre contraste..."
                    value={corrections}
                    onChange={(e) => onCorrectionsChange(e.target.value)}
                    rows={3}
                    disabled={isRegenerating}
                />

                <div className="draft-correction-buttons">
                    <button
                        type="button"
                        className={`draft-btn draft-btn--icon ${isRecording ? 'draft-btn--recording' : ''}`}
                        onClick={toggleRecording}
                        disabled={isTranscribing || isRegenerating}
                        aria-label={isRecording ? 'Parar gravação' : 'Gravar correção por áudio'}
                        title={isRecording ? 'Parar gravação' : 'Ditar correção'}
                    >
                        {isTranscribing ? (
                            <Loader2 size={18} className="draft-spinner" />
                        ) : isRecording ? (
                            <MicOff size={18} />
                        ) : (
                            <Mic size={18} />
                        )}
                    </button>

                    <button
                        type="button"
                        className="draft-btn draft-btn--send"
                        onClick={onRegenerate}
                        disabled={!canRegenerate}
                        aria-label="Reprocessar laudo com correções (rápido)"
                        title="Reprocessar com correções (modelo leve)"
                    >
                        {isRegenerating ? (
                            <Loader2 size={16} className="draft-spinner" />
                        ) : (
                            <Send size={16} />
                        )}
                        <span>Rápido</span>
                    </button>
                    <button
                        type="button"
                        className="draft-btn draft-btn--ghost"
                        onClick={handleFullRegenerate}
                        disabled={!canRegenerate}
                        aria-label="Reprocessar completo com Opus"
                        title="Reprocessar completo (Opus)"
                    >
                        <span>Completo</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
