
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, setDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY?.replace(/"/g, ''),
  authDomain: process.env.FIREBASE_AUTH_DOMAIN?.replace(/"/g, ''),
  projectId: process.env.FIREBASE_PROJECT_ID?.replace(/"/g, ''),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET?.replace(/"/g, ''),
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID?.replace(/"/g, ''),
  appId: process.env.FIREBASE_APP_ID?.replace(/"/g, '')
};

console.log('[Firebase] Initializing with config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  apiKeyPresent: !!firebaseConfig.apiKey
});

const app = !getApps().length && firebaseConfig.apiKey
  ? initializeApp(firebaseConfig)
  : (getApps().length ? getApp() : null);

// PATCH #7: Prevent Double Initialization (HMR Safe)
import { getFirestore } from 'firebase/firestore';

export const db = app ? (() => {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  } catch (e: any) {
    if (e.code === 'failed-precondition' || e.message?.includes('already been called')) {
      return getFirestore(app);
    }
    throw e;
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
