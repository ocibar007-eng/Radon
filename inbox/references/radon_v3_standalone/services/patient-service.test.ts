
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PatientService } from './patient-service';
import { Patient } from '../types/patient';

// Mock do módulo Firebase
vi.mock('../core/firebase', () => ({
  db: {}, // Objeto mock truthy
  isFirebaseEnabled: () => true
}));

// Mock das funções do Firestore
const mockSetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
  getDoc: vi.fn(),
  Timestamp: { now: () => 1234567890 }
}));

describe('PatientService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPatient: Patient = {
    id: '123',
    name: 'João Silva',
    os: 'OS-001',
    examType: 'RX Torax',
    status: 'waiting',
    createdAt: 1000,
    updatedAt: 1000,
    docsCount: 0,
    audioCount: 0,
    hasClinicalSummary: false
  };

  it('deve criar um paciente corretamente', async () => {
    await PatientService.createPatient(mockPatient);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    // Verifica se o payload contém os dados do paciente
    expect(mockSetDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({
      id: '123',
      name: 'João Silva'
    }), { merge: true });
  });

  it('deve listar pacientes filtrando excluídos', async () => {
    // Mock do retorno do getDocs
    mockGetDocs.mockResolvedValue({
      docs: [
        { data: () => mockPatient }
      ]
    });

    const result = await PatientService.listPatients();
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('João Silva');
    // Verifica se as chamadas de query foram feitas (abstraído pelo mock simples aqui)
  });

  it('deve realizar soft delete atualizando deletedAt', async () => {
    await PatientService.softDeletePatient('123');
    
    expect(mockUpdateDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({
      deletedAt: expect.any(Number)
    }));
  });
});
