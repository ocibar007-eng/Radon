import Dexie, { Table } from 'dexie';
import { AppSession } from '../types';
import { storage } from '../core/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll, StorageReference } from 'firebase/storage';

export interface PersistentSession extends AppSession {
  id: string;
  updatedAt: number;
}

export class RadonDatabase extends Dexie {
  sessions!: Table<PersistentSession>;

  constructor() {
    super('RadonDB');
    this.version(1).stores({
      sessions: 'id, updatedAt' // id é o patientId ou 'local-draft'
    });
  }
}

export const db = new RadonDatabase();

export const StorageService = {
  async saveSession(id: string, session: AppSession) {
    try {
      await db.sessions.put({
        ...session,
        id,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('[StorageService] Error saving to IndexedDB:', error);
    }
  },

  async loadSession(id: string): Promise<PersistentSession | undefined> {
    try {
      return await db.sessions.get(id);
    } catch (error) {
      console.error('[StorageService] Error loading from IndexedDB:', error);
      return undefined;
    }
  },

  // Returns all cached sessions (IndexedDB) for background recovery workflows.
  async listSessions(): Promise<PersistentSession[]> {
    try {
      return await db.sessions.toArray();
    } catch (error) {
      console.error('[StorageService] Error listing sessions from IndexedDB:', error);
      return [];
    }
  },

  async deleteSession(id: string) {
    await db.sessions.delete(id);
  },

  async deletePatientFiles(patientId: string) {
    if (!storage) return;

    const baseRef = ref(storage, `patients/${patientId}/attachments`);

    const removeFolder = async (folderRef: StorageReference) => {
      const listing = await listAll(folderRef);
      await Promise.all(listing.items.map(item => deleteObject(item)));
      await Promise.all(listing.prefixes.map(prefix => removeFolder(prefix)));
    };

    try {
      await removeFolder(baseRef);
    } catch (error: any) {
      const code = error?.code;
      const isNotFound = code === 'storage/object-not-found' || code === 'storage/path-not-found';
      if (!isNotFound) {
        console.error('[StorageService] Error deleting patient files:', error);
        throw error;
      }
    }
  },

  async deleteFileByUrl(url: string) {
    if (!storage || !url) return;

    try {
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
    } catch (error: any) {
      const code = error?.code;
      const isNotFound = code === 'storage/object-not-found' || code === 'storage/path-not-found';
      if (!isNotFound) {
        console.error('[StorageService] Error deleting file:', error);
        throw error;
      }
    }
  },

  /**
   * Upload file to Firebase Storage
   * @param patientId - Patient ID for folder organization
   * @param file - File to upload
   * @param customName - Optional custom filename
   * @returns Download URL of uploaded file
   */
  async uploadFile(patientId: string, file: File | Blob, customName?: string): Promise<string> {
    if (!storage) {
      throw new Error('Firebase Storage not initialized');
    }

    const filename = customName || (file instanceof File ? file.name : `file_${Date.now()}`);
    const path = `patients/${patientId}/attachments/${filename}`;
    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  }
};
