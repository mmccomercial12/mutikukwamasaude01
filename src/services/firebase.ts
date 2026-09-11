import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  limit,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';

import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// CRITICAL: The app must specify firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    // Testing connection to test/connection document
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firestore] Conectado com sucesso ao banco:', firebaseConfig.firestoreDatabaseId);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firestore] O cliente está offline ou a base de dados ainda não tem o documento de teste.');
    } else {
      console.log('[Firestore] Teste de conectividade concluído.');
    }
    return false;
  }
}

// Auto-run connection test safely in background
if (typeof window !== 'undefined') {
  testFirestoreConnection().catch(() => {});
}

/**
 * Cloud Firestore Data Sync Helpers
 * Allows persisting and loading records between local storage cache and Firestore
 */
export async function syncCollectionToFirestore<T extends { id: string }>(
  collectionName: string,
  items: T[]
): Promise<number> {
  let count = 0;
  for (const item of items) {
    if (!item.id) continue;
    try {
      const docRef = doc(db, collectionName, String(item.id));
      await setDoc(docRef, item, { merge: true });
      count++;
    } catch (err) {
      console.warn(`[Firestore] Falha ao sincronizar item ${item.id} na colecao ${collectionName}:`, err);
    }
  }
  return count;
}

export async function fetchCollectionFromFirestore<T>(collectionName: string): Promise<T[]> {
  try {
    const q = query(collection(db, collectionName), limit(200));
    const snap = await getDocs(q);
    const results: T[] = [];
    snap.forEach((d) => {
      results.push(d.data() as T);
    });
    return results;
  } catch (err) {
    console.warn(`[Firestore] Erro ao obter dados de ${collectionName}:`, err);
    return [];
  }
}

/**
 * Listen to a Firestore collection in real-time.
 * Returns an unsubscribe function to stop listening.
 */
export function listenToCollection<T>(
  collectionName: string,
  onChange: (items: T[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, collectionName), limit(500));
  return onSnapshot(
    q,
    (snap) => {
      const results: T[] = [];
      snap.forEach((d) => results.push(d.data() as T));
      onChange(results);
    },
    (err) => {
      console.warn(`[Firestore] Erro ao ouvir ${collectionName}:`, err);
      onError?.(err);
    }
  );
}

/**
 * Delete a single document from Firestore.
 */
export async function deleteDocFromFirestore(collectionName: string, id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (err) {
    console.warn(`[Firestore] Erro ao eliminar ${id} de ${collectionName}:`, err);
  }
}

