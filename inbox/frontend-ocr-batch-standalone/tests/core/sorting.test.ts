import { describe, it, expect } from 'vitest';
import { sortFiles, enumerateFiles } from '@/core/sorting';
import { BatchFile, SortMethod, FileType, ProcessStatus } from '@/types';

const mockFile = (id: string, name: string, type: FileType = FileType.IMAGE, timestamp?: number): BatchFile => ({
    id,
    name,
    type,
    timestamp,
    status: ProcessStatus.READY,
    isSelected: false,
    size: 100,
    originalFile: new File([], name)
});

describe('sorting core', () => {
    describe('sortFiles', () => {
        it('should sort by filename correctly (alphabetical/numeric)', () => {
            const files = [
                mockFile('1', 'image10.jpg'),
                mockFile('2', 'image2.jpg'),
                mockFile('3', 'image1.jpg'),
            ];
            const sorted = sortFiles(files, SortMethod.FILENAME);
            expect(sorted[0].name).toBe('image1.jpg');
            expect(sorted[1].name).toBe('image2.jpg');
            expect(sorted[2].name).toBe('image10.jpg');
        });

        it('should sort by timestamp correctly', () => {
            const files = [
                mockFile('1', 'old.jpg', FileType.IMAGE, 1000),
                mockFile('2', 'new.jpg', FileType.IMAGE, 2000),
                mockFile('3', 'middle.jpg', FileType.IMAGE, 1500),
            ];
            const sorted = sortFiles(files, SortMethod.TIMESTAMP);
            expect(sorted[0].name).toBe('old.jpg');
            expect(sorted[1].name).toBe('middle.jpg');
            expect(sorted[2].name).toBe('new.jpg');
        });

        it('should handle DICOM special ordering (Series -> Instance)', () => {
            const files: BatchFile[] = [
                { ...mockFile('1', 'dcm1.dcm', FileType.DICOM), seriesNumber: 1, instanceNumber: 2 },
                { ...mockFile('2', 'dcm2.dcm', FileType.DICOM), seriesNumber: 2, instanceNumber: 1 },
                { ...mockFile('3', 'dcm3.dcm', FileType.DICOM), seriesNumber: 1, instanceNumber: 1 },
            ];
            const sorted = sortFiles(files, SortMethod.FILENAME);
            expect(sorted[0].id).toBe('3'); // Series 1, Instance 1
            expect(sorted[1].id).toBe('1'); // Series 1, Instance 2
            expect(sorted[2].id).toBe('2'); // Series 2, Instance 1
        });
    });

    describe('enumerateFiles', () => {
        it('should assign orderIndex and normalizedName', () => {
            const files = [
                mockFile('1', 'photo.jpg', FileType.IMAGE),
                mockFile('2', 'exam.dcm', FileType.DICOM),
            ];
            const enumerated = enumerateFiles(files);

            expect(enumerated[0].orderIndex).toBe(1);
            expect(enumerated[0].normalizedName).toBe('001.jpg');

            expect(enumerated[1].orderIndex).toBe(2);
            expect(enumerated[1].normalizedName).toBe('002.png'); // DICOM converts to png
        });
    });
});
