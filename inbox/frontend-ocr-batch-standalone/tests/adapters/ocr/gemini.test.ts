import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stable mock for generateContent
const mockGenerateContent = vi.fn();

// Mocking the GenAI library
vi.mock('@google/genai', () => {
    return {
        GoogleGenAI: vi.fn().mockImplementation(() => ({
            models: {
                generateContent: mockGenerateContent
            }
        })),
        Type: {
            OBJECT: 'OBJECT',
            STRING: 'STRING',
            ARRAY: 'ARRAY'
        }
    };
});

// Mocking ocrHelpers
vi.mock('../../../src/utils/ocrHelpers', () => {
    return {
        processImageForApi: vi.fn().mockResolvedValue('base64string'),
        delay: vi.fn().mockResolvedValue(undefined)
    };
});

import { runGeminiOcr } from '../../../src/adapters/ocr/gemini';

describe('Gemini OCR Adapter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return parsed JSON on success', async () => {
        const mockResponse = {
            text: JSON.stringify({
                full_text: "PACIENTE: ANTONIO SANTOS\nDATA: 2025-12-29",
                extraction: {
                    patient_name: "ANTONIO SANTOS",
                    patient_id: "123",
                    exam_date: "29/12/2025",
                    measurements: [],
                    institution: "Clinica"
                },
                readability: "READABLE"
            })
        };
        mockGenerateContent.mockResolvedValue(mockResponse);

        const file = new File([''], 'test.jpg');
        const result = await runGeminiOcr(file);

        expect(result.extraction.patient_name).toBe("ANTONIO SANTOS");
        expect(result.extraction.exam_date).toBe("29/12/2025");
    });

    it('should retry on 429 Resource Exhausted', async () => {
        // Mocking failure then success
        mockGenerateContent
            .mockRejectedValueOnce({ status: 429, message: 'RESOURCE_EXHAUSTED' })
            .mockResolvedValueOnce({
                text: JSON.stringify({
                    full_text: "success",
                    extraction: {
                        patient_name: "X",
                        patient_id: "Y",
                        exam_date: "Z",
                        measurements: [],
                        institution: "A"
                    },
                    readability: "READABLE"
                })
            });

        const file = new File([''], 'test.jpg');
        const result = await runGeminiOcr(file);

        expect(result.full_text).toBe("success");
        expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
        mockGenerateContent.mockRejectedValue({ status: 429, message: 'RESOURCE_EXHAUSTED' });

        const file = new File([''], 'test.jpg');
        await expect(runGeminiOcr(file)).rejects.toThrow();

        expect(mockGenerateContent).toHaveBeenCalledTimes(11); // Initial + 10 retries
    });
});
