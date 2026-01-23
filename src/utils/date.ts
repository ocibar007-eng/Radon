export const formatDateBR = (value?: string | null) => {
  if (!value) return '';

  const raw = value.trim();
  if (!raw) return '';

  const ymdMatch = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(.*)$/);
  if (ymdMatch) {
    const [, year, month, day, rest = ''] = ymdMatch;
    const suffix = rest ? rest.replace('T', ' ') : '';
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}${suffix}`;
  }

  const dmyMatch = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(.*)$/);
  if (dmyMatch) {
    const [, day, month, year, rest = ''] = dmyMatch;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}${rest}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('pt-BR');
  }

  return raw;
};
