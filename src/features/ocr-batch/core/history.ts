
import { BatchFile, HistoryItem, ProcessStatus } from '../types';
import { generateBatchJson } from './export';
import { SortMethod } from '../types';

const HISTORY_KEY = 'ocr_batch_history_v1';

export const saveBatchToHistory = (files: BatchFile[]): HistoryItem | null => {
  // Only save if we have completed files
  const completedFiles = files.filter(f => f.status === ProcessStatus.COMPLETED && f.ocrResult);
  if (completedFiles.length === 0) return null;

  // Heuristic to find the most frequent Patient Name/ID/Date in the batch to label the history item
  const names: Record<string, number> = {};
  const ids: Record<string, number> = {};
  const dates: Record<string, number> = {};

  completedFiles.forEach(f => {
    const res = f.ocrResult?.extraction;
    if (res) {
      if (res.patient_name && res.patient_name !== 'NID') names[res.patient_name] = (names[res.patient_name] || 0) + 1;
      if (res.patient_id && res.patient_id !== 'NID') ids[res.patient_id] = (ids[res.patient_id] || 0) + 1;
      if (res.exam_date && res.exam_date !== 'NID') dates[res.exam_date] = (dates[res.exam_date] || 0) + 1;
    }
  });

  const getTop = (record: Record<string, number>) => Object.entries(record).sort((a, b) => b[1] - a[1])[0]?.[0] || 'NID';

  const batchName = getTop(names);
  const patientId = getTop(ids);
  const examDate = getTop(dates);

  const manifest = generateBatchJson(files, SortMethod.FILENAME); // Save state of batch

  const newItem: HistoryItem = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    batchName: batchName === 'NID' ? 'Lote Sem Nome' : batchName,
    patientId,
    examDate,
    itemCount: files.length,
    jsonResult: manifest
  };

  const currentHistory = getHistory();
  const updatedHistory = [newItem, ...currentHistory].slice(0, 50); // Limit to last 50 batches

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (e) {
    console.error("Storage full or error saving history", e);
  }

  return newItem;
};

export const getHistory = (): HistoryItem[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const clearHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
};

export const deleteHistoryItem = (id: string) => {
    const current = getHistory();
    const updated = current.filter(item => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
};

export const importHistoryFromJSON = (jsonString: string): boolean => {
    try {
        const imported = JSON.parse(jsonString);
        if (!Array.isArray(imported)) return false;

        const current = getHistory();
        const currentIds = new Set(current.map(c => c.id));
        
        // Merge strategies: Only add items that don't exist ID-wise
        let addedCount = 0;
        const newItems = [];
        
        for (const item of imported) {
            if (item.id && item.createdAt && item.jsonResult && !currentIds.has(item.id)) {
                newItems.push(item);
                addedCount++;
            }
        }

        if (addedCount > 0) {
            // Sort merged list by date desc
            const merged = [...newItems, ...current].sort((a, b) => b.createdAt - a.createdAt);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
            return true;
        }
        return false;
    } catch (e) {
        console.error("Failed to import history", e);
        return false;
    }
};
