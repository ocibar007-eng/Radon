import { describe, it, expect } from 'vitest';
import { generateBatchJson, generateCombinedTxt } from '@/core/export';
import { BatchFile, SortMethod, ProcessStatus, FileType } from '@/types';

const mockCompletedFile = (id: string, name: string, orderIndex: number, text: string): BatchFile => ({
    id,
    name,
    orderIndex,
    normalizedName: `${String(orderIndex).padStart(3, '0')}.jpg`,
    type: FileType.IMAGE,
    status: ProcessStatus.COMPLETED,
    isSelected: true,
    size: 100,
    originalFile: new File([], name),
    ocrResult: {
        full_text: text,
        extraction: {
            patient_name: "JOHN DOE",
            patient_id: "123",
            exam_date: "01/01/2025",
            measurements: ["10mm"],
            institution: "Hospital"
        },
        readability: "READABLE" as any
    }
});

describe('export core', () => {
    describe('generateBatchJson', () => {
        it('should generate a valid JSON manifest for completed files', () => {
            const files = [
                mockCompletedFile('1', 'a.jpg', 1, 'Hello world'),
                { ...mockCompletedFile('2', 'b.jpg', 2, 'Goodbye'), status: ProcessStatus.READY, ocrResult: undefined } as any,
            ];

            const json = generateBatchJson(files, SortMethod.FILENAME);

            expect(json.schema_version).toBe('1.0.0');
            expect(json.items).toHaveLength(1);
            expect(json.items[0].original_filename).toBe('a.jpg');
            expect(json.items[0].status).toBe(ProcessStatus.COMPLETED);
            expect(json.full_combined_text).toContain('Hello world');
            expect(json.full_combined_text).not.toContain('Goodbye');
        });
    });

    describe('generateCombinedTxt', () => {
        it('should combine OCR results into a human-readable text', () => {
            const files = [
                mockCompletedFile('1', 'a.jpg', 1, 'Text 1'),
                mockCompletedFile('2', 'b.jpg', 2, 'Text 2'),
            ];

            const txt = generateCombinedTxt(files);

            expect(txt).toContain('=== PAGE 1 | 001.jpg ===');
            expect(txt).toContain('Text 1');
            expect(txt).toContain('=== PAGE 2 | 002.jpg ===');
            expect(txt).toContain('Text 2');
        });
    });
});
