import {
  PROJECTS_STORE,
  SETTINGS_STORE,
  CURRENT_PROJECT_ID,
  getDBConnection,
  loadFromIndexedDB,
  CHAPTERS_STORE,
} from "./databaseService";
import {
  ProjectMetadata,
  JsonBook,
  JsonChapter,
  ChapterData,
  JsonRow,
} from "./types";
import { extractRowsFromCSV } from "./translationService";

export const loadCurrentProject = async (): Promise<ProjectMetadata | null> => {
  const db: IDBDatabase = await getDBConnection();
  const currentProjectId: { key: string; value: string } | null =
    await loadFromIndexedDB(SETTINGS_STORE, CURRENT_PROJECT_ID);

  if (!currentProjectId) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], "readonly");
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.get(currentProjectId.value);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result as ProjectMetadata);
      } else {
        resolve(null);
      }
    };

    request.onerror = () => reject(request.error);
  });
};

export const getProjectInfo = async (): Promise<ProjectMetadata | null> => {
  try {
    const db: IDBDatabase = await getDBConnection();
    const currentProjectId: { id: string; value: string } | null =
      await loadFromIndexedDB(SETTINGS_STORE, CURRENT_PROJECT_ID);

    if (!currentProjectId) {
      console.warn("No current project ID found in settings store.");
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE], "readonly");
      const store = transaction.objectStore(PROJECTS_STORE);
      const request = store.get(currentProjectId.value);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result as ProjectMetadata);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(
      "Failed to load project metadata by current project ID:",
      error
    );
    return null;
  }
};

export const saveProjectAsJsonBook = async (
  project: ProjectMetadata
): Promise<JsonBook | null> => {
  try {
    // Validate project input
    if (!project || !project.title || !project.author) {
      console.error("Invalid project metadata:", project);
      return null;
    }

    // Check if there are chapters to process
    if (!project.selectedChapterIds || project.selectedChapterIds.size === 0) {
      console.warn("No chapters selected for export");
      return {
        title: project.title,
        author: project.author,
        cover: project.coverBase64 || "",
        notes: project.notes || "",
        sourceLanguage: project.sourceLanguage || "",
        targetLanguage: project.targetLanguage || "",
        chapters: [],
      }; // Return empty book instead of null
    }

    const chapters: JsonChapter[] = [];
    for (const chapterId of project.selectedChapterIds) {
      const chapterData: ChapterData = await loadFromIndexedDB(
        CHAPTERS_STORE,
        chapterId
      );
      if (!chapterData) {
        console.warn(`Chapter not found in IndexedDB: ${chapterId}`);
        continue;
      }

      const rows: JsonRow[] = extractRowsFromCSV(chapterData.translation);
      if (!rows || rows.length === 0) {
        console.warn(`No valid rows extracted for chapter: ${chapterId}`);
      }

      const jsonChapter: JsonChapter = {
        title: chapterData.title || `Chapter ${chapterId}`,
        content: rows || [],
      };
      chapters.push(jsonChapter);
    }

    const jsonBook: JsonBook = {
      title: project.title,
      author: project.author,
      cover: project.coverBase64 || "",
      notes: project.notes || "",
      sourceLanguage: project.sourceLanguage || "",
      targetLanguage: project.targetLanguage || "",
      chapters: chapters,
    };

    // Log the result for debugging
    console.log("Generated JSON book:", jsonBook);

    return jsonBook;
  } catch (error) {
    console.error("Failed to save project as JSON book:", error);
    return null;
  }
};
