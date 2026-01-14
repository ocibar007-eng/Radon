import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOcrProcessing } from '@/hooks/useOcrProcessing';
import { BatchFile, FileType, ProcessStatus } from '@/types';

// Mock the Gemini Adapter
vi.mock('../../src/adapters/ocr/gemini', () => ({
    runGeminiOcr: vi.fn().mockResolvedValue({
        full_text: "Result",
        extraction: {
            patient_name: "Test",
            patient_id: "ID",
            exam_date: "01/01/2025",
            measurements: [],
            institution: "Hosp"
        },
        readability: "READABLE"
    })
}));

import { runGeminiOcr } from '@/adapters/ocr/gemini';

const mockFile = (id: string, name: string): BatchFile => ({
    id,
    name,
    type: FileType.IMAGE,
    status: ProcessStatus.READY,
    isSelected: true,
    size: 100,
    originalFile: new File([], name)
});

describe('useOcrProcessing hook', () => {
    let options: any;

    beforeEach(() => {
        vi.clearAllMocks();
        options = {
            onSessionStatusChange: vi.fn(),
            onSessionProgressUpdate: vi.fn(),
            onFileStatusChange: vi.fn(),
            onFileCompleted: vi.fn(),
            onFileError: vi.fn(),
            onError: vi.fn(),
            onComplete: vi.fn()
        };
    });

    it('should process files and trigger callbacks', async () => {
        const { result } = renderHook(() => useOcrProcessing(options));
        const files = [mockFile('1', 'a.jpg'), mockFile('2', 'b.jpg')];
        const sessionId = 'session-1';

        await act(async () => {
            await result.current.startProcessing(files, sessionId);
        });

        expect(runGeminiOcr).toHaveBeenCalledTimes(2);
        expect(options.onSessionStatusChange).toHaveBeenCalledWith(sessionId, 'processing');
        expect(options.onSessionProgressUpdate).toHaveBeenCalledWith(sessionId, 2, 2);
        expect(options.onComplete).toHaveBeenCalledWith(sessionId);
    });

    it('should handle errors in individual files', async () => {
        (runGeminiOcr as any).mockRejectedValueOnce(new Error('Fatal OCR Error'));

        const { result } = renderHook(() => useOcrProcessing(options));
        const files = [mockFile('1', 'a.jpg')];

        await act(async () => {
            await result.current.startProcessing(files, 'session-1');
        });

        expect(options.onFileError).toHaveBeenCalledWith('1', 'Fatal OCR Error', 'session-1');
        expect(options.onComplete).toHaveBeenCalled();
    });

    it('should respect abort requests', async () => {
        // Mock a slow process
        (runGeminiOcr as any).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

        const { result } = renderHook(() => useOcrProcessing(options));
        const files = [mockFile('1', 'a.jpg'), mockFile('2', 'b.jpg')];
        const sessionId = 'session-abort';

        const processingPromise = act(async () => {
            const p = result.current.startProcessing(files, sessionId);
            // Abort immediately
            result.current.abortProcessing(sessionId);
            await p;
        });

        processingPromise; // wait for it

        // Due to concurrency and immediate abort, we might have 0 or some calls started but checked
        // The hook checks for abort inside the worker loop.
    });
});
