import React, { useEffect, useRef, useState } from 'react';
import { Clock, Coffee } from 'lucide-react';
import { useNow } from '../hooks/useNow';
import { useBreakTimer } from '../hooks/useBreakTimer';
import { useAlarmClock } from '../hooks/useAlarmClock';
import { formatDurationClock } from '../utils/time';
import { ConfirmModal } from './ui/ConfirmModal';

interface Props {
  onClockClick?: () => void;
  className?: string;
}

export const GlobalTimeChips: React.FC<Props> = ({ onClockClick, className }) => {
  const now = useNow(1000);
  const { remainingMs, durationMs, isPromptOpen, snooze, continueCycle, setDuration } = useBreakTimer();
  const {
    alarmAt,
    alarmLabel,
    isPromptOpen: isAlarmPromptOpen,
    setAlarmAtTime,
    clearAlarm,
    snooze: snoozeAlarm
  } = useAlarmClock();
  const timeLabel = new Date(now).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const breakLabel = formatDurationClock(remainingMs);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isAlarmMenuOpen, setIsAlarmMenuOpen] = useState(false);
  const [alarmHour, setAlarmHour] = useState('');
  const [alarmMinute, setAlarmMinute] = useState('');
  const breakButtonRef = useRef<HTMLButtonElement | null>(null);
  const breakMenuRef = useRef<HTMLDivElement | null>(null);
  const alarmButtonRef = useRef<HTMLButtonElement | null>(null);
  const alarmMenuRef = useRef<HTMLDivElement | null>(null);

  const options = [
    { label: '60m', value: 60 * 60 * 1000 },
    { label: '90m', value: 90 * 60 * 1000 },
    { label: '120m', value: 120 * 60 * 1000 }
  ];

  useEffect(() => {
    if (!isAdjustOpen && !isAlarmMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (breakMenuRef.current?.contains(target)) return;
      if (breakButtonRef.current?.contains(target)) return;
      if (alarmMenuRef.current?.contains(target)) return;
      if (alarmButtonRef.current?.contains(target)) return;
      setIsAdjustOpen(false);
      setIsAlarmMenuOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAdjustOpen(false);
        setIsAlarmMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isAdjustOpen, isAlarmMenuOpen]);

  useEffect(() => {
    if (isPromptOpen) {
      setIsAdjustOpen(false);
      setIsAlarmMenuOpen(false);
    }
  }, [isPromptOpen]);

  useEffect(() => {
    if (isAlarmPromptOpen) setIsAlarmMenuOpen(false);
  }, [isAlarmPromptOpen]);

  useEffect(() => {
    if (!isAlarmMenuOpen) return;
    const base = alarmAt ? new Date(alarmAt) : new Date();
    setAlarmHour(String(base.getHours()).padStart(2, '0'));
    setAlarmMinute(String(base.getMinutes()).padStart(2, '0'));
  }, [isAlarmMenuOpen, alarmAt]);

  const sanitizeTimeField = (value: string) => value.replace(/\D/g, '').slice(0, 2);

  const normalizeTimeField = (value: string, max: number) => {
    if (!value) return '';
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '';
    const clamped = Math.min(Math.max(0, numeric), max);
    return String(clamped).padStart(2, '0');
  };

  const applyExactAlarmTime = () => {
    const normalizedHour = normalizeTimeField(alarmHour, 23);
    const normalizedMinute = normalizeTimeField(alarmMinute, 59);
    if (!normalizedHour || !normalizedMinute) return;
    const hours = Number(normalizedHour);
    const minutes = Number(normalizedMinute);
    const nowDate = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    if (target.getTime() <= nowDate.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    setAlarmHour(normalizedHour);
    setAlarmMinute(normalizedMinute);
    setAlarmAtTime(target.getTime());
    setIsAlarmMenuOpen(false);
  };

  const clockTitle = alarmLabel
    ? `Horario atual · Alarme ${alarmLabel}`
    : 'Horario atual';

  return (
    <>
      <div className={`global-time-chips ${className ?? ''}`.trim()}>
        <div className="time-chip-wrapper">
          <button
            ref={alarmButtonRef}
            type="button"
            className={`time-chip time-chip--clock ${alarmAt ? 'is-alarm-set' : ''}`}
            onClick={() => {
              setIsAlarmMenuOpen((prev) => !prev);
              setIsAdjustOpen(false);
            }}
            title={clockTitle}
            aria-haspopup="menu"
            aria-expanded={isAlarmMenuOpen}
          >
            <Clock size={12} />
            {timeLabel}
          </button>

          {isAlarmMenuOpen && (
            <div ref={alarmMenuRef} className="time-chip-menu" role="menu" aria-label="Ajustar alarme">
              <span className="time-chip-menu-title">Alarme</span>
              <span className="time-chip-menu-sub">
                {alarmLabel ? `Ativo ${alarmLabel}` : 'Sem alarme'}
              </span>
              <div className="time-chip-time-row">
                <label className="time-chip-menu-sub" htmlFor="alarm-time-input">
                  Definir horario
                </label>
                <div className="time-chip-time-controls">
                  <div className="time-chip-time-field">
                    <input
                      id="alarm-time-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      className="time-chip-time-input"
                      value={alarmHour}
                      onChange={(event) => setAlarmHour(sanitizeTimeField(event.target.value))}
                      onBlur={() => setAlarmHour(normalizeTimeField(alarmHour, 23))}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          applyExactAlarmTime();
                        }
                      }}
                      aria-label="Hora do alarme"
                    />
                    <span className="time-chip-time-sep">:</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      className="time-chip-time-input"
                      value={alarmMinute}
                      onChange={(event) => setAlarmMinute(sanitizeTimeField(event.target.value))}
                      onBlur={() => setAlarmMinute(normalizeTimeField(alarmMinute, 59))}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          applyExactAlarmTime();
                        }
                      }}
                      aria-label="Minutos do alarme"
                    />
                  </div>
                  <button
                    type="button"
                    className="time-chip-apply"
                    onClick={applyExactAlarmTime}
                  >
                    Definir
                  </button>
                </div>
              </div>
              {alarmAt && (
                <button
                  type="button"
                  role="menuitem"
                  className="time-chip-option time-chip-option--danger"
                  onClick={() => {
                    clearAlarm();
                    setIsAlarmMenuOpen(false);
                  }}
                >
                  Desativar alarme
                </button>
              )}
              {onClockClick && (
                <button
                  type="button"
                  role="menuitem"
                  className="time-chip-option time-chip-option--ghost"
                  onClick={() => {
                    setIsAlarmMenuOpen(false);
                    onClockClick();
                  }}
                >
                  Estatisticas
                </button>
              )}
            </div>
          )}
        </div>

        <div className="time-chip-wrapper">
          <button
            ref={breakButtonRef}
            type="button"
            className={`time-chip time-chip--break ${remainingMs === 0 ? 'is-overdue' : ''}`}
            title="Pausa programada"
            aria-haspopup="menu"
            aria-expanded={isAdjustOpen}
            onClick={() => setIsAdjustOpen((prev) => !prev)}
          >
            <Coffee size={12} />
            {breakLabel}
          </button>

            {isAdjustOpen && (
            <div ref={breakMenuRef} className="time-chip-menu" role="menu" aria-label="Ajustar pausa">
              <span className="time-chip-menu-title">Pausa</span>
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={durationMs === option.value}
                  className={`time-chip-option ${durationMs === option.value ? 'is-active' : ''}`}
                  onClick={() => {
                    setDuration(option.value);
                    setIsAdjustOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={isPromptOpen}
        title="Pausa rapida?"
        message="Seu timer de uso chegou a 1h30. Quer fazer uma pausa para cafe?"
        confirmLabel="Soneca 10 min"
        cancelLabel="Continuar"
        onConfirm={snooze}
        onCancel={continueCycle}
      />

      <ConfirmModal
        isOpen={isAlarmPromptOpen}
        title="Alarme"
        message="Seu alarme tocou."
        confirmLabel="Soneca 10 min"
        cancelLabel="Dispensar"
        onConfirm={snoozeAlarm}
        onCancel={clearAlarm}
      />
    </>
  );
};
