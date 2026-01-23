let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported');
      return null;
    }
  }
  return audioContext;
};

const playTone = (ctx: AudioContext, frequency: number, start: number, duration: number, volume: number) => {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);

  gainNode.gain.setValueAtTime(0, start);
  gainNode.gain.linearRampToValueAtTime(volume, start + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);

  oscillator.start(start);
  oscillator.stop(start + duration);
};

export const warmUpAudio = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => null);
  }
};

export const playAlarmSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => null);
  }

  const now = ctx.currentTime;
  playTone(ctx, 523, now, 0.3, 0.18);
  playTone(ctx, 659, now + 0.22, 0.35, 0.16);
};
