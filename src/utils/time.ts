type FormatOptions = {
  includeSeconds?: boolean;
};

export const formatDurationClock = (ms: number, options: FormatOptions = {}) => {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (options.includeSeconds) {
    return `${hh}:${mm}:${ss}`;
  }

  return `${hh}:${mm}`;
};
