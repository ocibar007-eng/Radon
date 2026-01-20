
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageService } from './storage-service';

// Mock do Firebase
vi.mock('../core/firebase', () => ({
  storage: {}, // Truthy para simular ativado
  isFirebaseEnabled: vi.fn()
}));

const mockUploadBytes = vi.fn();
const mockGetDownloadURL = vi.fn();
const mockRef = vi.fn();

vi.mock('firebase/storage', () => ({
  ref: (...args: any[]) => mockRef(...args),
  uploadBytes: (...args: any[]) => mockUploadBytes(...args),
  getDownloadURL: (...args: any[]) => mockGetDownloadURL(...args),
  deleteObject: vi.fn()
}));

// Import dinâmico para manipular o mock do isFirebaseEnabled
import { isFirebaseEnabled } from '../core/firebase';

describe('StorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
  const patientId = 'patient-123';

  it('MODO OFFLINE: deve retornar URL local (createObjectURL)', async () => {
    // Simula Firebase desligado
    (isFirebaseEnabled as any).mockReturnValue(false);
    
    // Mock do URL.createObjectURL (ambiente JSDOM)
    const mockLocalUrl = 'blob:http://localhost/123';
    globalThis.URL.createObjectURL = vi.fn(() => mockLocalUrl);

    const result = await StorageService.uploadFile(patientId, mockFile);

    expect(result.downloadUrl).toBe(mockLocalUrl);
    expect(result.storagePath).toContain('memory://');
    expect(mockUploadBytes).not.toHaveBeenCalled();
  });

  it('MODO ONLINE: deve chamar uploadBytes e getDownloadURL', async () => {
    // Simula Firebase ligado
    (isFirebaseEnabled as any).mockReturnValue(true);
    
    mockUploadBytes.mockResolvedValue({});
    mockGetDownloadURL.mockResolvedValue('https://firebasestorage.googleapis.com/v0/b/test.jpg');

    const result = await StorageService.uploadFile(patientId, mockFile);

    expect(mockRef).toHaveBeenCalled(); // Verifica se criou a referência
    expect(mockUploadBytes).toHaveBeenCalled(); // Verifica se fez upload
    expect(result.downloadUrl).toContain('https://firebasestorage');
    expect(result.storagePath).not.toContain('memory://');
  });
});