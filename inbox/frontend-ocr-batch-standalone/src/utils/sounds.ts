// Premium Sound Effects using Web Audio API
// No external dependencies, pure synthesized sounds

type SoundType = 'success' | 'error' | 'notification' | 'click' | 'complete';

interface SoundConfig {
    frequency: number;
    type: OscillatorType;
    duration: number;
    volume: number;
    ramp?: boolean;
    secondFreq?: number;
}

const SOUNDS: Record<SoundType, SoundConfig> = {
    success: { frequency: 880, type: 'sine', duration: 0.15, volume: 0.2, ramp: true, secondFreq: 1100 },
    error: { frequency: 200, type: 'sawtooth', duration: 0.3, volume: 0.15, ramp: true },
    notification: { frequency: 600, type: 'sine', duration: 0.1, volume: 0.15, secondFreq: 800 },
    click: { frequency: 1200, type: 'sine', duration: 0.05, volume: 0.1 },
    complete: { frequency: 523, type: 'sine', duration: 0.5, volume: 0.2, secondFreq: 659 } // C5 to E5
};

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
            return null;
        }
    }
    return audioContext;
};

export const playSound = (type: SoundType): void => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const config = SOUNDS[type];
    const now = ctx.currentTime;

    // Main oscillator
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(config.frequency, now);
    oscillator.type = config.type;

    // Volume envelope
    gainNode.gain.setValueAtTime(config.volume, now);

    if (config.ramp) {
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + config.duration);
    } else {
        gainNode.gain.setValueAtTime(config.volume, now);
        gainNode.gain.linearRampToValueAtTime(0, now + config.duration);
    }

    // Optional second frequency for melody
    if (config.secondFreq) {
        oscillator.frequency.setValueAtTime(config.frequency, now);
        oscillator.frequency.setValueAtTime(config.secondFreq, now + config.duration * 0.5);
    }

    oscillator.start(now);
    oscillator.stop(now + config.duration);
};

export const playSuccessSound = () => playSound('success');
export const playErrorSound = () => playSound('error');
export const playNotificationSound = () => playSound('notification');
export const playClickSound = () => playSound('click');
export const playCompleteSound = () => playSound('complete');

// Batch completion celebration sound (multiple notes)
export const playCelebrationSound = (): void => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6 (C major chord arpeggio)
    const now = ctx.currentTime;

    notes.forEach((freq, i) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.setValueAtTime(freq, now);
        oscillator.type = 'sine';

        const startTime = now + i * 0.1;
        const duration = 0.3;

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    });
};
