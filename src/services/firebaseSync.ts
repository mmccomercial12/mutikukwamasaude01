/**
 * firebaseSync.ts
 * Orchestrates bidirectional sync between localStorage (supabase.ts layer) and Firestore.
 *
 * Strategy:
 * 1. On startup: if Firestore has data → load into localStorage (Firestore wins)
 * 2. On startup: if Firestore is empty → push localStorage data to Firestore (seed)
 * 3. On write operations in supabase.ts: sync to Firestore in the background
 */

import {
  syncCollectionToFirestore,
  fetchCollectionFromFirestore,
} from './firebase';

// localStorage keys matching supabase.ts STORAGE_KEYS
const STORAGE_KEYS = {
  UNITS: 'mutikukwama_units_v1',
  PRODUCTS: 'mutikukwama_products_v1',
  SERVICES: 'mutikukwama_services_v1',
  EXAMS: 'mutikukwama_exams_v1',
  ORDERS: 'mutikukwama_orders_v1',
  USERS: 'mutikukwama_users_list_v1',
  LOGS: 'mutikukwama_logs_v1',
};

// Firestore collection names (matching firebase-blueprint.json)
const COLLECTIONS: { key: keyof typeof STORAGE_KEYS; name: string }[] = [
  { key: 'UNITS', name: 'unidades' },
  { key: 'PRODUCTS', name: 'produtos' },
  { key: 'SERVICES', name: 'servicos' },
  { key: 'EXAMS', name: 'exames' },
  { key: 'ORDERS', name: 'pedidos' },
  { key: 'USERS', name: 'usuarios' },
  { key: 'LOGS', name: 'logs_atividade' },
];

function getLocalItems<T>(storageKey: string): T[] {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function setLocalItems<T>(storageKey: string, items: T[]): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(items));
  } catch (err) {
    console.warn('[FirebaseSync] Erro ao guardar em localStorage:', err);
  }
}

let syncInitialized = false;

/**
 * Initializes the Firebase sync on app startup.
 * Call this once from main.tsx.
 */
export async function initFirebaseSync(): Promise<void> {
  if (syncInitialized) return;
  syncInitialized = true;

  console.log('[FirebaseSync] A inicializar sincronização com Firestore...');

  for (const { key, name } of COLLECTIONS) {
    try {
      // 1. Fetch from Firestore
      const firestoreItems = await fetchCollectionFromFirestore<{ id: string }>(name);

      if (firestoreItems.length > 0) {
        // Firestore has data → merge into localStorage (Firestore wins for existing IDs)
        const localItems = getLocalItems<{ id: string }>(STORAGE_KEYS[key]);
        const localMap = new Map(localItems.map((item) => [item.id, item]));

        // Firestore items overwrite local items with same ID
        for (const fsItem of firestoreItems) {
          localMap.set(fsItem.id, fsItem);
        }

        setLocalItems(STORAGE_KEYS[key], Array.from(localMap.values()));
        console.log(
          `[FirebaseSync] ${name}: ${firestoreItems.length} documentos carregados do Firestore → localStorage`
        );
      } else {
        // Firestore is empty → push local data as seed
        const localItems = getLocalItems<{ id: string }>(STORAGE_KEYS[key]);
        if (localItems.length > 0) {
          const synced = await syncCollectionToFirestore(name, localItems);
          console.log(
            `[FirebaseSync] ${name}: ${synced}/${localItems.length} documentos enviados do localStorage → Firestore`
          );
        }
      }
    } catch (err) {
      console.warn(`[FirebaseSync] Erro ao sincronizar colecção '${name}':`, err);
    }
  }

  console.log('[FirebaseSync] Sincronização inicial concluída.');
}

/**
 * Syncs a single item to Firestore after a write operation.
 * Call this after any create/update in supabase.ts.
 * Fire-and-forget — does not block UI.
 */
export function syncItemToFirestore<T extends { id: string }>(
  collectionName: string,
  item: T
): void {
  syncCollectionToFirestore(collectionName, [item]).catch((err) =>
    console.warn(`[FirebaseSync] Erro ao sincronizar item ${item.id}:`, err)
  );
}

/**
 * Syncs a full collection from localStorage to Firestore.
 * Call this after bulk operations.
 */
export function syncCollectionBackground<T extends { id: string }>(
  collectionName: string,
  items: T[]
): void {
  if (items.length === 0) return;
  syncCollectionToFirestore(collectionName, items).catch((err) =>
    console.warn(`[FirebaseSync] Erro ao sincronizar colecção ${collectionName}:`, err)
  );
}
