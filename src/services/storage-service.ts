import Dexie, { Table } from 'dexie';
import { AppSession } from '../types';

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

  async deleteSession(id: string) {
    await db.sessions.delete(id);
  }
};
