
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWorkspaceActions } from './useWorkspaceActions';
import { StorageService } from '../services/storage-service';
import * as PdfUtils from '../utils/pdf';
import * as GeminiAdapter from '../adapters/gemini-prompts';

// --- MOCKS GLOBAIS ---

// 1. Mock do Contexto de Sessão
const mockDispatch = vi.fn();
const mockSession = {
  docs: [],
  patient: { id: 'patient-123', os: { valor: 'OS-TEST' } },
  audioJobs: []
};

vi.mock('../context/SessionContext', () => ({
  useSession: () => ({
    session: mockSession,
    dispatch: mockDispatch
  })
}));

// 2. Mock do Pipeline (Fila de Processamento)
const mockEnqueue = vi.fn();
vi.mock('./usePipeline', () => ({
  usePipeline: () => ({
    enqueue: mockEnqueue
  })
}));

// 3. Mock do Storage Service
vi.mock('../services/storage-service', () => ({
  StorageService: {
    uploadFile: vi.fn().mockResolvedValue({ downloadUrl: 'https://fake-storage/file.jpg' })
  }
}));

// 4. Mock de Browser APIs
globalThis.URL.createObjectURL = vi.fn(() => 'blob:fake-url');
globalThis.URL.revokeObjectURL = vi.fn();
globalThis.crypto.randomUUID = vi.fn(() => 'uuid-1234') as any;

describe('Simulação de Fluxo: Workspace Actions', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.docs = []; // Reset docs
  });

  describe('Fluxo 1: Upload de Documentos', () => {
    it('deve processar o upload de uma IMAGEM corretamente', async () => {
      // Setup
      const { result } = renderHook(() => useWorkspaceActions(mockSession.patient as any));
      const file = new File(['fake-content'], 'exame.jpg', { type: 'image/jpeg' });

      const event = {
        target: { files: [file], value: '' }
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      // Ação: Usuário faz upload
      await act(async () => {
        await result.current.handleFileUpload(event, false, 'assistencial');
      });

      // Verificações (Simula o resultado esperado)

      // 1. Deve adicionar ao estado visual (Dispatch ADD_DOC)
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
        type: 'ADD_DOC',
        payload: expect.objectContaining({
          file: file,
          status: 'pending',
          classification: 'assistencial', // Forçado pelo parametro
          previewUrl: 'blob:fake-url'
        })
      }));

      // 2. Deve enviar para a Fila de IA (Enqueue)
      expect(mockEnqueue).toHaveBeenCalledWith('uuid-1234', 'doc');

      // 3. Deve iniciar upload em background (Storage)
      expect(StorageService.uploadFile).toHaveBeenCalledWith('patient-123', file, 'exame.jpg');
    });

    it('deve processar o upload de um PDF (convertendo em imagens)', async () => {
      // Mock da conversão de PDF
      const mockImages = [new Blob(['page1']), new Blob(['page2'])];
      vi.spyOn(PdfUtils, 'convertPdfToImages').mockResolvedValue(mockImages as any);

      const { result } = renderHook(() => useWorkspaceActions(mockSession.patient as any));
      const pdfFile = new File(['pdf-content'], 'laudo.pdf', { type: 'application/pdf' });

      const event = {
        target: { files: [pdfFile], value: '' }
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      // Ação
      await act(async () => {
        await result.current.handleFileUpload(event, false);
      });

      // Verificações
      expect(PdfUtils.convertPdfToImages).toHaveBeenCalledWith(pdfFile);

      // Deve ter disparado ADD_DOC (sync) e UPDATE_DOC (async upload) para cada pagina
      // Total 2 pgs * 2 actions = 4 calls.
      // O que importa é que ADD_DOC foi chamado para as duas paginas.
      expect(mockDispatch).toHaveBeenCalledTimes(4);

      // Verifica nomenclatura das páginas
      expect(mockDispatch).toHaveBeenNthCalledWith(1, expect.objectContaining({
        type: 'ADD_DOC',
        payload: expect.objectContaining({ source: 'laudo.pdf Pg 1' })
      }));
      expect(mockDispatch).toHaveBeenNthCalledWith(2, expect.objectContaining({
        type: 'ADD_DOC',
        payload: expect.objectContaining({ source: 'laudo.pdf Pg 2' })
      }));
    });
  });

  describe('Fluxo 2: Manipulação e Reclassificação', () => {
    it('deve permitir reclassificação manual e limpar metadados antigos', async () => {
      // Setup: Sessão já tem um doc classificado errado
      const docId = 'doc-existente';
      const existingDoc = {
        id: docId,
        source: 'test.pdf', // Adicionado para corrigir erro no grouping.ts
        classification: 'assistencial',
        file: new File([''], 'test'),
        metadata: { someOldData: true }, // Dados velhos que devem sumir
        isUnified: true
      };
      // @ts-ignore
      mockSession.docs = [existingDoc];

      const { result } = renderHook(() => useWorkspaceActions(mockSession.patient as any));

      // Ação: Usuário muda para 'laudo_previo'
      await act(async () => {
        result.current.handleManualReclassify(docId, 'laudo_previo');
      });

      // Verificações
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_DOC',
        payload: {
          id: docId,
          updates: expect.objectContaining({
            classification: 'laudo_previo',
            classificationSource: 'manual',
            isUnified: false, // Deve resetar flag de unificação
            metadata: undefined // Deve limpar metadados
          })
        }
      });

      // Deve reenfileirar para a IA reprocessar com o novo contexto
      expect(mockEnqueue).toHaveBeenCalledWith(docId, 'doc');
    });

    it('deve remover documento e revogar URL', async () => {
      const docId = 'doc-to-remove';
      // @ts-ignore
      mockSession.docs = [{ id: docId, previewUrl: 'blob:fake-url-123' }];

      const { result } = renderHook(() => useWorkspaceActions(mockSession.patient as any));

      await act(async () => {
        result.current.removeDoc(docId);
      });

      expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url-123');
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'REMOVE_DOC', payload: docId });
    });
  });

  describe('Fluxo 3: Áudio e Download', () => {
    it('deve criar job de áudio ao finalizar gravação', async () => {
      const { result } = renderHook(() => useWorkspaceActions(mockSession.patient as any));
      const audioBlob = new Blob(['audio'], { type: 'audio/webm' });

      await act(async () => {
        result.current.handleAudioComplete(audioBlob);
      });

      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
        type: 'ADD_AUDIO_JOB',
        payload: expect.objectContaining({
          status: 'processing'
        })
      }));

      expect(mockEnqueue).toHaveBeenCalledWith('uuid-1234', 'audio');
    });

    it('deve gerar relatório final para download', async () => {
      // Mock do Adapter Gemini
      vi.spyOn(GeminiAdapter, 'compileFinalReport').mockResolvedValue('# Markdown Report');

      // Mock do link de download
      // Usamos um elemento real para evitar problemas com Node types se algo tentar appendChild
      const realLink = document.createElement('a');
      vi.spyOn(realLink, 'click');
      // @ts-ignore
      vi.spyOn(document, 'createElement').mockReturnValue(realLink);

      const { result } = renderHook(() => useWorkspaceActions(mockSession.patient as any));

      await act(async () => {
        await result.current.downloadAll();
      });

      expect(GeminiAdapter.compileFinalReport).toHaveBeenCalled();
      expect(realLink.download).toContain('laudo_OS-TEST.md');
      expect(realLink.click).toHaveBeenCalled();
    });
  });
});