
import * as dcmjs from 'dcmjs';
import { BatchFile, TechnicalMetadata } from '../types';

// Mapeamento de sintaxes para logs e debug
const TRANSFER_SYNTAX_NAMES: Record<string, string> = {
    '1.2.840.10008.1.2': 'Implicit VR Little Endian',
    '1.2.840.10008.1.2.1': 'Explicit VR Little Endian',
    '1.2.840.10008.1.2.2': 'Explicit VR Big Endian',
    '1.2.840.10008.1.2.4.50': 'JPEG Baseline (Process 1)',
    '1.2.840.10008.1.2.4.51': 'JPEG Extended (Process 2 & 4)',
    '1.2.840.10008.1.2.4.70': 'JPEG Lossless',
    '1.2.840.10008.1.2.4.80': 'JPEG-LS Lossless',
    '1.2.840.10008.1.2.4.90': 'JPEG 2000 Lossless',
    '1.2.840.10008.1.2.4.91': 'JPEG 2000 (Compressed)',
    '1.2.840.10008.1.2.5': 'RLE Lossless'
};

const toJpegName = (name: string): string => {
    if (/\.(dcm|dicom)$/i.test(name)) {
        return name.replace(/\.(dcm|dicom)$/i, '.jpg');
    }
    return `${name}.jpg`;
};

export async function processDicom(file: File): Promise<Partial<BatchFile>> {
    let arrayBuffer: ArrayBuffer;
    try {
        arrayBuffer = await file.arrayBuffer();
    } catch (e) {
        return { status: 'error' as any, errorMessage: "Falha ao ler arquivo do disco." };
    }

    // --- ESTRATÉGIA 1: SANITIZAÇÃO BINÁRIA (ZERO-COPY) ---
    sanitizeDicomCharset(arrayBuffer);

    try {
        // Use ignoreErrors option to handle charset issues gracefully
        const dicomData = dcmjs.data.DicomMessage.readFile(arrayBuffer, {
            ignoreErrors: true,
            untilTag: null, // Read entire file
            includeUndefinedLength: true
        });
        const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomData.dict);

        let tsUID = '1.2.840.10008.1.2.1';
        try {
            const meta = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomData.meta);
            tsUID = meta.TransferSyntaxUID || tsUID;
        } catch (ignore) { }

        const isCompressed = isCompressedTransferSyntax(tsUID);
        const { timestamp, timestampSource, instanceNumber, seriesNumber } = extractDicomMetadata(dataset);

        const techInfo: TechnicalMetadata = {
            transferSyntaxUID: tsUID,
            transferSyntax: TRANSFER_SYNTAX_NAMES[tsUID] || `Unknown (${tsUID})`,
            isCompressed: isCompressed,
            rows: dataset.Rows,
            columns: dataset.Columns
        };

        let previewUrl: string;
        let convertedFile: File;

        const outputName = toJpegName(file.name);

        if (isCompressed) {
            // Extração rápida sem re-compressão para formatos encapsulados
            const blob = extractEncapsulatedPixelData(dataset, tsUID);
            previewUrl = URL.createObjectURL(blob);
            convertedFile = new File([blob], outputName, { type: blob.type });
        } else {
            // Renderização pixel-a-pixel (Raw / Uncompressed)
            const blob = await renderRawDicomToJpeg(dataset);
            previewUrl = URL.createObjectURL(blob);
            convertedFile = new File([blob], outputName, { type: 'image/jpeg' });
        }

        return {
            timestamp,
            timestampSource,
            instanceNumber,
            seriesNumber,
            previewUrl,
            convertedFile,
            techInfo,
            status: 'ready' as any
        };

    } catch (dcmjsError: any) {
        console.warn(`[DICOM] Falha no parser padrão. Tentando fallback bruto...`, dcmjsError);

        // --- ESTRATÉGIA 2: EXTRAÇÃO BRUTA (FALLBACK) ---
        try {
            const magicBlob = extractImageByMagicBytes(arrayBuffer);
            if (magicBlob) {
                const previewUrl = URL.createObjectURL(magicBlob);
                const convertedFile = new File([magicBlob], toJpegName(file.name), { type: magicBlob.type });

                return {
                    timestamp: file.lastModified,
                    timestampSource: 'modified',
                    instanceNumber: 0,
                    seriesNumber: 0,
                    previewUrl,
                    convertedFile,
                    techInfo: { transferSyntax: 'RAW Extraction (Fallback)' },
                    status: 'ready' as any,
                    errorMessage: 'Aviso: Extraído via recuperação bruta.'
                };
            }
        } catch (magicError) { }

        return {
            status: 'error' as any,
            errorMessage: `Erro DICOM: ${dcmjsError.message || "Formato inválido"}`,
            timestampSource: 'none'
        };
    }
}

function sanitizeDicomCharset(buffer: ArrayBuffer): void {
    const view = new Uint8Array(buffer);
    const len = view.length;
    const limit = Math.min(len, 8192); // Search in first 8KB for metadata

    // List of problematic charset patterns to neutralize
    // We'll replace them with 'ISO_IR 100' (Latin-1) which is widely supported
    const problematicPatterns = [
        // "iso-ir-100" (lowercase variant that dcmjs doesn't like)
        [105, 115, 111, 45, 105, 114, 45, 49, 48, 48], // iso-ir-100
        // "ISO 2022" variants
        [73, 83, 79, 32, 50, 48, 50, 50], // ISO 2022
        // "iso-ir-" prefix (catch all)
        [105, 115, 111, 45, 105, 114, 45], // iso-ir-
    ];

    // Safe replacement: "ISO_IR 100" (standard that dcmjs supports)
    const safeCharset = [73, 83, 79, 95, 73, 82, 32, 49, 48, 48]; // ISO_IR 100

    // Find tag (0008,0005) which is SpecificCharacterSet
    // In DICOM, tags are little-endian: 0x0008, 0x0005 -> bytes: 08 00 05 00
    for (let i = 0; i < limit - 20; i++) {
        // Look for the tag signature (0008,0005)
        if (view[i] === 0x08 && view[i + 1] === 0x00 && view[i + 2] === 0x05 && view[i + 3] === 0x00) {
            // Found SpecificCharacterSet tag - check if it contains problematic values
            // The value typically starts a few bytes after (depends on VR)
            const searchStart = i + 4;
            const searchEnd = Math.min(i + 64, limit);

            // Look for problematic patterns within this tag's value area
            for (let j = searchStart; j < searchEnd; j++) {
                for (const pattern of problematicPatterns) {
                    let matches = true;
                    for (let k = 0; k < pattern.length && j + k < len; k++) {
                        // Case-insensitive match for ASCII letters
                        const fileChar = view[j + k];
                        const patternChar = pattern[k];
                        if (fileChar !== patternChar &&
                            !(patternChar >= 65 && patternChar <= 90 && fileChar === patternChar + 32) &&
                            !(patternChar >= 97 && patternChar <= 122 && fileChar === patternChar - 32)) {
                            matches = false;
                            break;
                        }
                    }

                    if (matches) {
                        console.log(`[DICOM] Sanitizing problematic charset at offset ${j}`);
                        // Overwrite with safe charset
                        for (let k = 0; k < Math.min(safeCharset.length, pattern.length + 6) && j + k < len; k++) {
                            view[j + k] = k < safeCharset.length ? safeCharset[k] : 32; // Pad with spaces
                        }
                        return; // Done
                    }
                }
            }
        }
    }
}

function extractImageByMagicBytes(buffer: ArrayBuffer): Blob | null {
    const view = new Uint8Array(buffer);
    const len = view.length;

    // Search for JPEG header (FF D8 FF)
    for (let i = 132; i < len - 10; i++) {
        // JPEG magic: FF D8 FF followed by valid marker
        if (view[i] === 0xFF && view[i + 1] === 0xD8 && view[i + 2] === 0xFF) {
            const type = view[i + 3];
            // Common JPEG markers: E0 (JFIF), E1 (EXIF), DB (DQT), C0-C3 (SOF), C4 (DHT), FE (COM)
            if (type >= 0xC0 || type === 0xDB || type === 0xFE) {
                console.log(`[DICOM] Found JPEG at offset ${i}`);
                const jpegBytes = view.slice(i);
                return new Blob([jpegBytes], { type: 'image/jpeg' });
            }
        }
    }

    // Search for PNG header (89 50 4E 47 0D 0A 1A 0A)
    for (let i = 132; i < len - 10; i++) {
        if (view[i] === 0x89 && view[i + 1] === 0x50 && view[i + 2] === 0x4E && view[i + 3] === 0x47 &&
            view[i + 4] === 0x0D && view[i + 5] === 0x0A && view[i + 6] === 0x1A && view[i + 7] === 0x0A) {
            console.log(`[DICOM] Found PNG at offset ${i}`);
            const pngBytes = view.slice(i);
            return new Blob([pngBytes], { type: 'image/png' });
        }
    }

    // Search for JPEG2000 header (00 00 00 0C 6A 50)
    for (let i = 132; i < len - 12; i++) {
        if (view[i] === 0x00 && view[i + 1] === 0x00 && view[i + 2] === 0x00 && view[i + 3] === 0x0C &&
            view[i + 4] === 0x6A && view[i + 5] === 0x50) {
            console.log(`[DICOM] Found JPEG2000 at offset ${i}`);
            const jp2Bytes = view.slice(i);
            return new Blob([jp2Bytes], { type: 'image/jp2' });
        }
    }

    return null;
}

function extractEncapsulatedPixelData(dataset: any, tsUID: string): Blob {
    const pixelData = dataset.PixelData;
    if (!pixelData || !Array.isArray(pixelData)) throw new Error("PixelData inválido");

    const fragment = pixelData.reduce((prev, current) => {
        return (current instanceof Uint8Array && current.length > prev.length) ? current : prev;
    }, new Uint8Array([]));

    if (!fragment || fragment.length < 64) throw new Error("Imagem vazia.");

    let mime = 'image/jpeg';
    if (tsUID.includes('1.2.840.10008.1.2.4.9')) mime = 'image/jp2';
    if (tsUID.includes('1.2.840.10008.1.2.4.8')) mime = 'image/jls';

    return new Blob([fragment], { type: mime });
}

function isCompressedTransferSyntax(uid: string): boolean {
    if (!uid) return false;
    return uid.startsWith('1.2.840.10008.1.2.4') || uid.startsWith('1.2.840.10008.1.2.5');
}

function extractDicomMetadata(dataset: any) {
    let timestamp: number | undefined;
    let timestampSource: BatchFile['timestampSource'] = 'none';

    const parseDT = (d: string, t: string = '000000') => {
        if (!d || d.length < 8) return null;
        const Y = +d.slice(0, 4), M = +d.slice(4, 6) - 1, D = +d.slice(6, 8);
        const h = +t.slice(0, 2) || 0, m = +t.slice(2, 4) || 0, s = +t.slice(4, 6) || 0;
        const date = new Date(Y, M, D, h, m, s);
        return isNaN(date.getTime()) ? null : date.getTime();
    };

    if (dataset.AcquisitionDate) timestamp = parseDT(dataset.AcquisitionDate, dataset.AcquisitionTime);
    else if (dataset.ContentDate) timestamp = parseDT(dataset.ContentDate, dataset.ContentTime);
    else if (dataset.SeriesDate) timestamp = parseDT(dataset.SeriesDate, dataset.SeriesTime);

    if (timestamp) timestampSource = 'dicom';

    // Robust Fallback for numeric fields
    const instanceNumber = dataset.InstanceNumber ? parseInt(dataset.InstanceNumber) : 0;
    const seriesNumber = dataset.SeriesNumber ? parseInt(dataset.SeriesNumber) : 0;

    return {
        timestamp,
        timestampSource,
        instanceNumber: isNaN(instanceNumber) ? 0 : instanceNumber,
        seriesNumber: isNaN(seriesNumber) ? 0 : seriesNumber
    };
}

// --- NEW RENDERER SUPPORTS COLOR (RGB/YBR) ---
async function renderRawDicomToJpeg(dataset: any): Promise<Blob> {
    return new Promise((resolve, reject) => {
        try {
            const width = dataset.Columns;
            const height = dataset.Rows;
            const samplesPerPixel = dataset.SamplesPerPixel || 1;
            const photometric = dataset.PhotometricInterpretation || 'MONOCHROME2';
            const planarConfig = dataset.PlanarConfiguration || 0; // 0=RGBRGB, 1=RRRGGGBBB

            let rawPixelData = dataset.PixelData;
            // Normalize dcmjs output (sometimes it's array of buffers, sometimes single buffer)
            if (Array.isArray(rawPixelData)) rawPixelData = rawPixelData[0];

            if (!rawPixelData) throw new Error("Buffer de pixels vazio");

            let buffer: ArrayBufferLike = rawPixelData.buffer ? rawPixelData.buffer : (new Uint8Array(rawPixelData)).buffer;
            if (rawPixelData.byteOffset && rawPixelData.byteOffset > 0) {
                buffer = rawPixelData.slice(0).buffer;
            }

            // Create appropriate view
            let data: TypedArray;
            if (dataset.BitsAllocated > 8) {
                data = dataset.PixelRepresentation === 1 ? new Int16Array(buffer) : new Uint16Array(buffer);
            } else {
                data = new Uint8Array(buffer);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            const imgData = ctx.createImageData(width, height);
            const clamped = imgData.data;
            const numPixels = width * height;

            // --- COLOR HANDLING (RGB / YBR) ---
            if (samplesPerPixel === 3) {
                const isYBR = photometric.includes('YBR');
                const isPlanar = planarConfig === 1; // RRR GGG BBB

                for (let i = 0; i < numPixels; i++) {
                    let c1, c2, c3;

                    if (isPlanar) {
                        // Plane 1, Plane 2, Plane 3 stored sequentially
                        c1 = data[i];
                        c2 = data[i + numPixels];
                        c3 = data[i + numPixels * 2];
                    } else {
                        // RGB RGB RGB
                        const p = i * 3;
                        c1 = data[p];
                        c2 = data[p + 1];
                        c3 = data[p + 2];
                    }

                    let r, g, b;

                    if (isYBR) {
                        // YBR -> RGB Conversion
                        // R = Y + 1.402(Cr-128)
                        // G = Y - 0.34414(Cb-128) - 0.71414(Cr-128)
                        // B = Y + 1.772(Cb-128)
                        const y = c1;
                        const cb = c2;
                        const cr = c3;

                        r = y + 1.402 * (cr - 128);
                        g = y - 0.344136 * (cb - 128) - 0.714136 * (cr - 128);
                        b = y + 1.772 * (cb - 128);
                    } else {
                        // Assumes RGB
                        r = c1;
                        g = c2;
                        b = c3;
                    }

                    const idx = i * 4;
                    clamped[idx] = r;
                    clamped[idx + 1] = g;
                    clamped[idx + 2] = b;
                    clamped[idx + 3] = 255; // Alpha
                }
            }
            // --- GRAYSCALE HANDLING ---
            else {
                const slope = dataset.RescaleSlope || 1;
                const intercept = dataset.RescaleIntercept || 0;
                const isInverse = photometric === 'MONOCHROME1';

                // Find Range for Normalization
                let min = Number.MAX_VALUE;
                let max = Number.MIN_VALUE;
                for (let i = 0; i < data.length; i++) {
                    const val = data[i] * slope + intercept;
                    if (val < min) min = val;
                    if (val > max) max = val;
                }
                const range = (max - min) || 1;

                for (let i = 0; i < numPixels; i++) {
                    let val = data[i] * slope + intercept;
                    let norm = (val - min) / range;

                    if (norm < 0) norm = 0;
                    if (norm > 1) norm = 1;
                    if (isInverse) norm = 1 - norm;

                    const gray = (norm * 255) | 0;
                    const idx = i * 4;
                    clamped[idx] = gray;
                    clamped[idx + 1] = gray;
                    clamped[idx + 2] = gray;
                    clamped[idx + 3] = 255;
                }
            }

            ctx.putImageData(imgData, 0, 0);

            canvas.toBlob((b) => {
                if (b) resolve(b);
                else reject(new Error("Erro ao gerar JPEG"));
            }, 'image/jpeg', 0.90);

        } catch (e) {
            reject(e);
        }
    });
}

type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array;
