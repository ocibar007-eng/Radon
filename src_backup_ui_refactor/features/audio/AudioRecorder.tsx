
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Upload, Pause, Play, Trash2, StopCircle, Music, FileAudio, ArrowUp } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

interface Props {
  onRecordingComplete: (blob: Blob) => void;
  isProcessing: boolean;
}

export const AudioRecorder: React.FC<Props> = ({ onRecordingComplete, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Visualization
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused && streamRef.current) {
      setupVisualizer(streamRef.current);
    } else if (isPaused) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [isRecording, isPaused]);

  const cleanupAudio = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        // Nada aqui se foi cancelado manualmente, a lógica de save está no stopRecording
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimeRef.current = 0;

      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          recordingTimeRef.current = newTime;
          return newTime;
        });
      }, 1000);

    } catch (err) {
      console.error("Error accessing mic:", err);
      alert("Microfone não permitido ou não encontrado.");
    }
  };

  const setupVisualizer = async (stream: MediaStream) => {
    if (!canvasRef.current) return;

    // Reaproveita contexto ou cria novo
    let audioCtx = audioContextRef.current;
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
    }

    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64; // Menor para barras mais largas
    analyserRef.current = analyser;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    draw();
  };

  const draw = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    const analyser = analyserRef.current;

    if (!canvasCtx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const animate = () => {
      // Se pausado ou parado, para loop
      if (!isRecording || isPaused) return;

      animationFrameRef.current = requestAnimationFrame(animate);
      analyser.getByteTimeDomainData(dataArray);

      // Limpar canvas
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      // Desenhar waveform estilo "voice memo"
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      const centerY = canvas.height / 2;

      for (let i = 0; i < bufferLength; i++) {
        // Normalizar valor (0 a 255 -> -1 a 1)
        const v = (dataArray[i] - 128) / 128.0;
        // Amplificar visualmente
        const height = Math.abs(v) * canvas.height * 1.5;

        // Cor baseada na amplitude (opcional)
        // Estilo moderno: barras arredondadas brancas com transparência variável
        canvasCtx.fillStyle = `rgba(255, 255, 255, ${0.4 + Math.abs(v)})`;

        // Desenha barra centralizada verticalmente
        // Arredondada
        roundRect(canvasCtx, x, centerY - height / 2, barWidth - 1, Math.max(height, 2), 2);

        x += barWidth;
      }
    };

    animate();
  };

  // Helper para desenhar retângulos arredondados no canvas
  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      // Resume timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          recordingTimeRef.current = newTime;
          return newTime;
        });
      }, 1000);
    }
  };

  const stopAndSave = () => {
    if (mediaRecorderRef.current) {
      // Listener temporário para capturar o blob final deste stop específico
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const finalTime = recordingTimeRef.current;

        if (finalTime < 2) {
          alert('Áudio muito curto (mínimo 2s).');
          return;
        }
        onRecordingComplete(blob);
      };

      mediaRecorderRef.current.stop();
      cleanupAudio(); // Para streams e timers
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const discardRecording = () => {
    setShowDiscardConfirm(true);
  };

  const confirmDiscard = () => {
    cleanupAudio();
    setIsRecording(false);
    setIsPaused(false);
    chunksRef.current = [];
    setShowDiscardConfirm(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      alert('Por favor, selecione um arquivo de áudio válido.');
      return;
    }
    onRecordingComplete(file);
    e.target.value = '';
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="audio/*"
        style={{ display: 'none' }}
      />

      {!isRecording ? (
        <div className="flex gap-2 w-full">
          <Button
            onClick={startRecording}
            variant="primary"
            className="flex-1 shadow-md border-0 bg-orange-500 hover:bg-orange-600 text-white transition-all active:scale-[0.98] h-10 flex items-center justify-center p-0"
            title="Gravar Áudio"
          >
            <Mic size={22} />
          </Button>

          <button
            onClick={handleUploadClick}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-transparent hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
            title="Upload de áudio"
          >
            <div className="relative">
              <FileAudio size={20} />
              <ArrowUp size={10} className="absolute -top-1 -right-1 text-orange-500" />
            </div>
          </button>
        </div>
      ) : (
        <div className="flex items-center w-full h-10 bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-full px-1 shadow-sm animate-in fade-in zoom-in-95 duration-200">
          {/* Botão Cancelar/Lixeira (Esquerda) */}
          <button
            onClick={discardRecording}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-[var(--color-text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-colors ml-0.5"
            title="Descartar"
          >
            <Trash2 size={16} />
          </button>

          {/* Timer (Espaço fixo para não cortar) */}
          <div className="flex-shrink-0 min-w-[45px] text-center ml-1">
            <span className="font-mono text-xs font-bold text-[var(--color-text-primary)]">
              {formatTime(recordingTime)}
            </span>
          </div>

          {/* Visualizador de Ondas (Centro - Flex-1) */}
          <div className="flex-1 flex items-center h-full relative mx-1 overflow-hidden">
            <canvas
              ref={canvasRef}
              width="200"
              height="40"
              className="w-full h-full opacity-80"
            />
          </div>

          {/* Controles (Direita) */}
          <div className="flex-shrink-0 flex items-center gap-0.5 mr-0.5">
            <button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
              title={isPaused ? "Retomar" : "Pausar"}
            >
              {isPaused ? <Play size={15} className="fill-current" /> : <Pause size={15} className="fill-current" />}
            </button>

            <button
              onClick={stopAndSave}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white shadow-md transition-transform hover:scale-105 active:scale-95"
              title="Finalizar"
            >
              <StopCircle size={18} className="fill-current" />
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDiscardConfirm}
        title="Descartar Gravação"
        message="Deseja descartar a gravação atual? Esta ação não pode ser desfeita."
        confirmLabel="Descartar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={confirmDiscard}
        onCancel={() => setShowDiscardConfirm(false)}
      />
    </div>
  );
};
