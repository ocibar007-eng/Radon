import { describe, it, expect, vi } from 'vitest';
import { extractMetadata } from '@/core/metadata';
import { FileType } from '@/types';

// Mock exifr
vi.mock('exifr', () => ({
    default: {
        parse: vi.fn()
    }
}));

import exifr from 'exifr';

describe('metadata core', () => {
    it('should extract date from filename regex (YYYY-MM-DD)', async () => {
        const file = new File([''], 'IMG_2025-12-25.jpg', { type: 'image/jpeg' });
        const metadata = await extractMetadata(file, FileType.IMAGE);

        const date = new Date(metadata.timestamp!);
        expect(date.getFullYear()).toBe(2025);
        expect(date.getMonth()).toBe(11); // December (0-indexed)
        expect(date.getDate()).toBe(25);
        expect(metadata.timestampSource).toBe('filename');
    });

    it('should extract date from filename regex (YYYYMMDD)', async () => {
        const file = new File([''], 'SCAN_20240115_123.png', { type: 'image/png' });
        const metadata = await extractMetadata(file, FileType.IMAGE);

        const date = new Date(metadata.timestamp!);
        expect(date.getFullYear()).toBe(2024);
        expect(date.getMonth()).toBe(0); // January
        expect(date.getDate()).toBe(15);
        expect(metadata.timestampSource).toBe('filename');
    });

    it('should fallback to file modified date if no regex match', async () => {
        const lastModified = new Date(2023, 5, 10).getTime();
        const file = new File([''], 'random_name.jpg', { type: 'image/jpeg', lastModified });
        const metadata = await extractMetadata(file, FileType.IMAGE);

        expect(metadata.timestamp).toBe(lastModified);
        expect(metadata.timestampSource).toBe('modified');
    });

    it('should use EXIF data if available', async () => {
        const exifDate = new Date(2022, 10, 5);
        (exifr.parse as any).mockResolvedValue({ DateTimeOriginal: exifDate });

        const file = new File([''], 'photo.jpg', { type: 'image/jpeg' });
        const metadata = await extractMetadata(file, FileType.IMAGE);

        expect(metadata.timestamp).toBe(exifDate.getTime());
        expect(metadata.timestampSource).toBe('exif');
    });
});
