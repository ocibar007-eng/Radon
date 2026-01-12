
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, isFirebaseEnabled } from '../core/firebase';
import { StorageUploadResult } from '../types/patient';

export const StorageService = {
  /**
   * Faz upload de um arquivo (File ou Blob) para o diretório do paciente.
   * Retorna metadados do arquivo salvo.
   */
  async uploadFile(patientId: string, file: File | Blob, fileName?: string): Promise<StorageUploadResult> {
    const docId = crypto.randomUUID();
    const name = fileName || (file as File).name || `doc_${Date.now()}.jpg`;
    const mimeType = file.type || 'application/octet-stream';
    
    // Caminho lógico: patients/{id}/docs/{docId}_{nome}
    // Adicionamos docId no nome para garantir unicidade e facilitar ordenação/busca visual no bucket
    const storagePath = `patients/${patientId}/docs/${docId}_${name}`;

    // 1. Caminho Online (Firebase Storage)
    if (isFirebaseEnabled() && storage) {
      try {
        const storageRef = ref(storage, storagePath);
        
        // Upload dos bytes
        await uploadBytes(storageRef, file);
        
        // Obter URL pública (assinada ou pública dependendo da regra de segurança)
        const downloadUrl = await getDownloadURL(storageRef);

        return {
          docId,
          storagePath,
          downloadUrl,
          mimeType
        };
      } catch (error) {
        console.error("Storage Upload Error:", error);
        throw new Error("Falha ao enviar arquivo para a nuvem.");
      }
    }

    // 2. Caminho Offline (Blob Local)
    // Simula um upload bem-sucedido para não travar a UI em desenvolvimento
    console.warn(`[Offline Mode] Simulando upload de ${name} para ${storagePath}`);
    return {
      docId,
      storagePath: `memory://${storagePath}`,
      downloadUrl: URL.createObjectURL(file), // URL temporária do navegador
      mimeType
    };
  },

  /**
   * Remove um arquivo do storage.
   */
  async deleteFile(storagePath: string): Promise<void> {
    if (isFirebaseEnabled() && storage && !storagePath.startsWith('memory://')) {
      try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
      } catch (error) {
        console.warn("Erro ao deletar arquivo (pode já ter sido removido):", error);
      }
    }
    // Se for memória, não precisamos fazer nada, o GC do browser cuida eventualmente
    // ou URL.revokeObjectURL deve ser chamado por quem criou.
  }
};
