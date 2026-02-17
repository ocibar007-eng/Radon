
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, setDoc, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY?.replace(/"/g, ''),
  authDomain: process.env.FIREBASE_AUTH_DOMAIN?.replace(/"/g, ''),
  projectId: process.env.FIREBASE_PROJECT_ID?.replace(/"/g, ''),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET?.replace(/"/g, ''),
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID?.replace(/"/g, ''),
  appId: process.env.FIREBASE_APP_ID?.replace(/"/g, '')
};

const firebaseConfigOk = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.authDomain
);

console.log('[Firebase] Initializing with config:', {
  apiKeyPresent: !!firebaseConfig.apiKey,
  projectIdPresent: !!firebaseConfig.projectId,
  authDomainPresent: !!firebaseConfig.authDomain,
  enabled: firebaseConfigOk
});

const app = firebaseConfigOk
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null;

const enablePersistence = firebaseConfigOk && process.env.FIREBASE_PERSISTENCE === '1';

export const db = app ? (() => {
  if (!enablePersistence) {
    return getFirestore(app);
  }
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  } catch (e: any) {
    console.warn('[Firebase] Persistência indisponível, usando modo padrão:', e?.message || e);
    return getFirestore(app);
  }
})() : null;

export const storage = app ? getStorage(app) : null;

export const isFirebaseEnabled = () => !!db && !!storage;

// PATCH #4: Health Check - Valida se Firestore Rules estão permitindo escrita
if (db) {
  const testDocRef = doc(db, '_health_check', 'startup_test');
  setDoc(testDocRef, { ts: Date.now(), status: 'ok' }, { merge: true })
    .then(() => console.log('✅ Firestore: Rules OK, escrita permitida'))
    .catch(e => console.error('❌ Firestore: Rules BLOQUEANDO escrita!', e.message));
}
