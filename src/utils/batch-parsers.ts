
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface PatientBatchItem {
  os: string;
  paciente: string;
  tipo_exame: string;
  data_exame: string;
  data_entrega?: string;
}

/**
 * Normaliza uma string de data para formato YYYY-MM-DD
 * Suporta: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD.MM.YYYY
 */
export function normalizeDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';

  const cleaned = dateStr.trim();
  if (!cleaned) return '';

  // Já está em formato ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // YYYY/MM/DD, YYYY.MM.DD
  const ymdMatch = cleaned.match(/^(\d{4})[\/\.](\d{1,2})[\/\.](\d{1,2})$/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Não conseguiu parsear, retorna vazio
  return '';
}

/**
 * Parse CSV file into batch items
 * Procura por variações de nomes de colunas
 */
export async function parseCSV(file: File): Promise<PatientBatchItem[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const mapped = results.data.map((row: any) => ({
            os: row['OS'] || row['Pedido'] || row['Protocolo'] || row['Número'] || row['N°'] || row['No'] || '',
            paciente: row['Paciente'] || row['Nome'] || row['Nome Paciente'] || row['Patient'] || '',
            tipo_exame: row['Exame'] || row['Tipo'] || row['Modalidade'] || row['Tipo Exame'] || row['Exam'] || '',
            data_exame: normalizeDate(row['Data'] || row['Data Exame'] || row['Data Realizacao'] || row['Date'] || ''),
            data_entrega: normalizeDate(row['Entrega'] || row['Data Entrega'] || row['Delivery'] || ''),
          }));

          // Filtrar linhas completamente vazias
          const filtered = mapped.filter(item =>
            item.os || item.paciente || item.tipo_exame
          );

          resolve(filtered);
        } catch (error) {
          reject(error);
        }
      },
      error: reject,
    });
  });
}

/**
 * Parse Excel file into batch items
 * Suporta .xls e .xlsx
 */
export async function parseExcel(file: File): Promise<PatientBatchItem[]> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    // Pega primeira aba
    const firstSheetName = workbook.SheetNames[0];
    const firstSheet = workbook.Sheets[firstSheetName];

    // Converte para JSON
    const json = XLSX.utils.sheet_to_json(firstSheet);

    const mapped = json.map((row: any) => ({
      os: String(row['OS'] || row['Pedido'] || row['Protocolo'] || row['Número'] || row['N°'] || row['No'] || ''),
      paciente: String(row['Paciente'] || row['Nome'] || row['Nome Paciente'] || row['Patient'] || ''),
      tipo_exame: String(row['Exame'] || row['Tipo'] || row['Modalidade'] || row['Tipo Exame'] || row['Exam'] || ''),
      data_exame: normalizeDate(String(row['Data'] || row['Data Exame'] || row['Data Realizacao'] || row['Date'] || '')),
      data_entrega: normalizeDate(String(row['Entrega'] || row['Data Entrega'] || row['Delivery'] || '')),
    }));

    // Filtrar linhas completamente vazias
    const filtered = mapped.filter(item =>
      item.os || item.paciente || item.tipo_exame
    );

    return filtered;
  } catch (error) {
    console.error('Erro ao parsear Excel:', error);
    throw new Error('Erro ao processar arquivo Excel');
  }
}

/**
 * Valida se um item do batch tem dados mínimos
 */
export function isValidBatchItem(item: PatientBatchItem): boolean {
  // Precisa ter pelo menos OS ou Paciente
  return !!(item.os || item.paciente);
}
