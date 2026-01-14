
import { BatchFile, FileType, ProcessStatus } from '../types';
import JSZip from 'jszip';

export const generateId = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const DICOM_EXTENSIONS = ['.dcm', '.dicom'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.bmp', '.webp'];
const VALID_EXTENSIONS = [...DICOM_EXTENSIONS, ...IMAGE_EXTENSIONS];

const getBaseName = (filename: string): string => {
    return filename.split('/').pop() || filename;
};

const hasValidExtension = (filename: string): boolean => {
    const lower = getBaseName(filename).toLowerCase();
    return VALID_EXTENSIONS.some(ext => lower.endsWith(ext));
};

const isExtensionless = (filename: string): boolean => {
    const base = getBaseName(filename);
    return !base.includes('.');
};

const detectFileTypeFromName = (file: File): FileType | null => {
    const name = file.name.toLowerCase();

    if (DICOM_EXTENSIONS.some(ext => name.endsWith(ext)) || file.type === 'application/dicom') {
        return FileType.DICOM;
    }

    if (IMAGE_EXTENSIONS.some(ext => name.endsWith(ext)) || file.type.startsWith('image/')) {
        return FileType.IMAGE;
    }

    return null;
};

const looksLikeDicom = (view: Uint8Array): boolean => {
    if (view.length >= 132) {
        if (view[128] === 0x44 && view[129] === 0x49 && view[130] === 0x43 && view[131] === 0x4d) {
            return true;
        }
    }

    if (view.length >= 8) {
        const group = view[0] | (view[1] << 8);
        const element = view[2] | (view[3] << 8);

        if (group === 0x0002 && element === 0x0000) return true;

        const isUpper = (c: number) => c >= 65 && c <= 90;
        const hasExplicitVr = isUpper(view[4]) && isUpper(view[5]);
        if (hasExplicitVr && (group === 0x0008 || group === 0x0010 || group === 0x0020)) {
            return true;
        }
    }

    return false;
};

const looksLikeImage = (view: Uint8Array): boolean => {
    if (view.length >= 3) {
        if (view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff) return true; // JPEG
    }

    if (view.length >= 8) {
        if (view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4e && view[3] === 0x47 &&
            view[4] === 0x0d && view[5] === 0x0a && view[6] === 0x1a && view[7] === 0x0a) {
            return true; // PNG
        }
    }

    if (view.length >= 12) {
        if (view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46 &&
            view[8] === 0x57 && view[9] === 0x45 && view[10] === 0x42 && view[11] === 0x50) {
            return true; // WEBP
        }
    }

    if (view.length >= 2) {
        if (view[0] === 0x42 && view[1] === 0x4d) return true; // BMP
    }

    if (view.length >= 6) {
        if (view[0] === 0x47 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x38 &&
            (view[4] === 0x37 || view[4] === 0x39) && view[5] === 0x61) {
            return true; // GIF
        }
    }

    return false;
};

const sniffFileType = async (file: File): Promise<FileType | null> => {
    const headerSize = Math.min(132, file.size);
    if (headerSize <= 0) return null;

    try {
        const buffer = await file.slice(0, headerSize).arrayBuffer();
        const view = new Uint8Array(buffer);

        if (looksLikeDicom(view)) return FileType.DICOM;
        if (looksLikeImage(view)) return FileType.IMAGE;
    } catch (error) {
        console.warn('Failed to sniff file type:', file.name, error);
    }

    return null;
};

export const detectFileType = async (file: File): Promise<FileType | null> => {
    // Check extension first as it's more reliable after ZIP extraction than MIME type sometimes
    const fromName = detectFileTypeFromName(file);
    if (fromName) return fromName;
    const sniffed = await sniffFileType(file);
    if (sniffed) return sniffed;
    if (isExtensionless(file.name) && file.size >= 132) {
        if (!file.type || file.type === 'application/octet-stream') return FileType.DICOM;
    }
    return null;
};

export const createBatchFile = async (file: File): Promise<BatchFile | null> => {
    const type = await detectFileType(file);
    if (!type) return null;
    const timestamp = file.lastModified;

    return {
        id: generateId(),
        originalFile: file,
        name: file.name,
        type,
        size: file.size,
        timestamp,
        timestampSource: 'modified',
        status: type === FileType.IMAGE ? ProcessStatus.READY : ProcessStatus.IDLE,
        previewUrl: type === FileType.IMAGE ? URL.createObjectURL(file) : undefined,
        isSelected: false, // Default to unselected so user manually picks them via Spacebar
    };
};

export const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// --- ADVANCED FILE PROCESSING (FOLDERS & ZIPS) ---

/**
 * Checks if a filename is valid for our app (DICOM or Image) and not a system file.
 */
const isValidFile = (filename: string): boolean => {
    const baseName = getBaseName(filename);
    // Ignore macOS system files and hidden files
    if (filename.startsWith('__MACOSX') || filename.split('/').some(part => part.startsWith('.'))) return false;
    if (hasValidExtension(baseName)) return true;
    return isExtensionless(baseName);
};

const getMimeTypeFromExtension = (filename: string): string => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.dcm') || lower.endsWith('.dicom')) return 'application/dicom';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.bmp')) return 'image/bmp';
    return '';
};

/**
 * Unzips a file and returns an array of valid Files extracted from it.
 */
export const processZipFile = async (zipFile: File): Promise<File[]> => {
    try {
        // Instantiate JSZip explicitly for better compatibility
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(zipFile);

        const extractedFiles: File[] = [];
        const promises: Promise<void>[] = [];

        loadedZip.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) return; // Skip directories
            if (!isValidFile(relativePath)) return;

            const promise = zipEntry.async('blob').then((blob) => {
                // Flatten directory structure: take only the filename
                const cleanName = relativePath.split('/').pop() || relativePath;

                // Re-assign MIME type because extracted blobs often lack it
                const mimeType = getMimeTypeFromExtension(cleanName);

                const file = new File([blob], cleanName, {
                    type: mimeType || blob.type,
                    lastModified: zipEntry.date ? zipEntry.date.getTime() : Date.now()
                });

                extractedFiles.push(file);
            }).catch(err => {
                console.warn(`Failed to extract file ${relativePath} from zip:`, err);
            });

            promises.push(promise);
        });

        await Promise.all(promises);
        return extractedFiles;
    } catch (error) {
        console.error("Failed to unzip:", error);
        throw new Error(`Erro ao abrir ZIP: ${zipFile.name}. Verifique se o arquivo não está corrompido.`);
    }
};

/**
 * Recursively traverses a FileSystemEntry (Folder) to find all files.
 */
export const traverseFileTree = async (entry: any, path: string = ''): Promise<File[]> => {
    const files: File[] = [];

    if (entry.isFile) {
        // Wrap getFile in a Promise
        try {
            const file = await new Promise<File>((resolve, reject) => {
                entry.file((f: File) => resolve(f), (err: any) => reject(err));
            });

            if (isValidFile(file.name) || file.name.toLowerCase().endsWith('.zip')) {
                files.push(file);
            }
        } catch (e) {
            console.warn("Error reading file entry:", entry.name);
        }
    } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        // WebKits readEntries returns batches, so we need to loop until empty
        const readEntries = async (): Promise<any[]> => {
            return new Promise((resolve, reject) => {
                dirReader.readEntries((entries: any[]) => resolve(entries), (err: any) => reject(err));
            });
        };

        try {
            let entries = await readEntries();
            while (entries.length > 0) {
                for (const childEntry of entries) {
                    const childFiles = await traverseFileTree(childEntry, path + entry.name + '/');
                    files.push(...childFiles);
                }
                entries = await readEntries();
            }
        } catch (e) {
            console.warn("Error reading directory:", entry.name);
        }
    }

    return files;
};

/**
 * Main entry point for DataTransferItems (Drop event).
 * Handles: Regular Files, Folders (Recursive), ZIPs.
 */
export const processDropItems = async (items: DataTransferItemList): Promise<File[]> => {
    const allFiles: File[] = [];
    const entries = [];

    // 1. Get all entries first
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
            const entry = item.webkitGetAsEntry?.() || (item as any).getAsEntry?.();
            if (entry) {
                entries.push(entry);
            } else {
                // Fallback for browsers without Entry API
                const file = item.getAsFile();
                if (file) allFiles.push(file);
            }
        }
    }

    // 2. Process recursively (Files & Folders)
    for (const entry of entries) {
        const entryFiles = await traverseFileTree(entry);
        allFiles.push(...entryFiles);
    }

    // 3. Check for ZIPs in the found files and extract them
    const finalFiles: File[] = [];
    for (const file of allFiles) {
        if (file.name.toLowerCase().endsWith('.zip')) {
            try {
                const unzipped = await processZipFile(file);
                finalFiles.push(...unzipped);
            } catch (e) {
                console.warn(`Could not unzip ${file.name}, ignoring.`);
            }
        } else {
            // Re-validate regular files just in case
            if (isValidFile(file.name)) {
                finalFiles.push(file);
            }
        }
    }

    return finalFiles;
};
