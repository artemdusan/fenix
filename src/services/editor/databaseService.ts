export const DB_NAME = "fenixEpubDB";
export const DB_VERSION = 1;
export const CHAPTERS_STORE = "Chapters";
export const PROJECTS_STORE = "Projects";
export const SETTINGS_STORE = "Settings"; // apikey, currentScreen, currentProjectId, models
export const API_KEY = "apiKey";
export const CURRENT_SCREEN = "currentScreen";
export const CURRENT_PROJECT_ID = "currentProjectId";
export const CURRENT_CHAPTER_ID = "currentChapterId";
export const TRANSLATION_GUIDELINES = `translationGuidelines`;
export const MODELS = "models";
import { Screen } from "./types";

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () =>
      reject(new Error(`Database error: ${request.error}`));
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      if (!db.objectStoreNames.contains(CHAPTERS_STORE)) {
        // Create store and index in one go
        const chapterStore = db.createObjectStore(CHAPTERS_STORE, {
          keyPath: "id",
        });
        chapterStore.createIndex("projectID", "projectID", { unique: false });
      }

      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        const projectsStore = db.createObjectStore(PROJECTS_STORE, {
          keyPath: "id",
        });
        projectsStore.createIndex("id", "id", { unique: false });
      }

      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: "id" });
      }
      saveToIndexedDB(SETTINGS_STORE, {
        id: CURRENT_SCREEN,
        value: Screen.EDITOR,
      }).catch((error: Error) =>
        console.error("Failed to save screen state:", error)
      );
    };
  });
};

export const getDBConnection = async (): Promise<IDBDatabase> => {
  try {
    return await initDB();
  } catch (error) {
    console.error("Failed to connect to database:", error);
    throw error;
  }
};

const performTransaction = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest
): Promise<T> => {
  const database = await getDBConnection();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], mode);
    const storeDb = transaction.objectStore(storeName);
    const request = operation(storeDb);

    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
};

export const deleteFromIndexedDB = (
  storeName: string,
  id: string
): Promise<void> => {
  return performTransaction(storeName, "readwrite", (store) =>
    store.delete(id)
  );
};

export const saveToIndexedDB = (storeName: string, data: any): Promise<void> =>
  performTransaction(storeName, "readwrite", (store) => store.put(data));

export const loadFromIndexedDB = <T>(
  storeName: string,
  id: string
): Promise<T> =>
  performTransaction<T>(storeName, "readonly", (store) => store.get(id));

export const clearStore = (storeName: string): Promise<void> =>
  performTransaction(storeName, "readwrite", (store) => store.clear());

export const clearDatabase = async (): Promise<void> => {
  await Promise.all([clearStore(PROJECTS_STORE), clearStore(CHAPTERS_STORE)]);
};
