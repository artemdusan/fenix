import {
  deleteFromIndexedDB,
  CHAPTERS_STORE,
  SETTINGS_STORE,
  PROJECTS_STORE,
  saveToIndexedDB,
  getDBConnection,
} from "./databaseService";

import { ChapterData as Chapter, ProjectMetadata } from "./types";

export const saveChapterContent = async (
  chapter: Chapter,
  newContent: string,
  isTranslation: boolean = false
): Promise<Chapter> => {
  const updatedChapter: Chapter = {
    ...chapter,
    [isTranslation ? "translation" : "content"]: newContent,
    [isTranslation ? "isTranslationEdited" : "isEdited"]: true,
  };

  await saveToIndexedDB(CHAPTERS_STORE, updatedChapter);
  return updatedChapter;
};

export const saveChapterTranslation = async (
  chapter: Chapter,
  translation: string
): Promise<Chapter> => {
  const updatedChapter: Chapter = {
    ...chapter,
    translation: translation,
    originalTranslation: translation,
    isTranslationEdited: false,
  };

  await saveToIndexedDB(CHAPTERS_STORE, updatedChapter);
  return updatedChapter;
};

export const revertChapterToOriginal = async (
  chapter: Chapter
): Promise<Chapter> => {
  const updatedChapter: Chapter = {
    ...chapter,
    content: chapter.originalContent,
    isEdited: false,
  };

  await saveToIndexedDB(CHAPTERS_STORE, updatedChapter);
  return updatedChapter;
};

export const revertChapterTranslation = async (
  chapter: Chapter
): Promise<Chapter> => {
  const updatedChapter: Chapter = {
    ...chapter,
    translation: chapter.originalTranslation,
    isTranslationEdited: false,
  };

  await saveToIndexedDB(CHAPTERS_STORE, updatedChapter);
  return updatedChapter;
};

export const loadChaptersFromDB = async (
  bookId: string
): Promise<Chapter[]> => {
  const db: IDBDatabase = await getDBConnection();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHAPTERS_STORE], "readonly");
    const store = transaction.objectStore(CHAPTERS_STORE);
    const index = store.index("projectID");
    const request = index.getAll(bookId);

    request.onsuccess = () => {
      if (request.result) {
        const sortedChapters = (request.result as Chapter[]).sort(
          (a, b) => a.index - b.index
        );
        resolve(sortedChapters);
      } else {
        resolve([]);
      }
    };

    request.onerror = () => {
      console.error("Failed to load chapters:", request.error);
      reject(request.error);
    };
  });
};

export const toggleSelectAll = async (
  projectId: string,
  chapters: Chapter[],
  currentSelection: Set<string>
): Promise<Set<string>> => {
  let newSelectedChapters: Set<string>;

  if (currentSelection.size === chapters.length) {
    newSelectedChapters = new Set<string>();
  } else {
    newSelectedChapters = new Set<string>(
      chapters.map((chapter) => chapter.id)
    );
  }

  await saveSelectedChapters(projectId, newSelectedChapters);
  return newSelectedChapters;
};

export const toggleChapterSelection = async (
  bookId: string,
  chapterId: string,
  currentSelection: Set<string>
): Promise<Set<string>> => {
  const newSelectedChapters = new Set<string>(currentSelection);

  if (newSelectedChapters.has(chapterId)) {
    newSelectedChapters.delete(chapterId);
  } else {
    newSelectedChapters.add(chapterId);
  }

  await saveToIndexedDB(SETTINGS_STORE, {
    key: "selectedChapters",
    bookId,
    chapterIds: Array.from(newSelectedChapters),
    updatedAt: new Date().toISOString(),
  });

  return newSelectedChapters;
};

export const saveCurrentChapter = async (
  projectId: string,
  chapterId: string
): Promise<void> => {
  const projectMetadata: ProjectMetadata = await getDBConnection().then(
    (db) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([PROJECTS_STORE], "readonly");
        const store = transaction.objectStore(PROJECTS_STORE);
        const request = store.get(projectId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  );

  projectMetadata.currentChapterId = chapterId;
  return saveToIndexedDB(PROJECTS_STORE, projectMetadata);
};

export const getCurrentChapter = async (projectId: string): Promise<string> => {
  const projectMetadata: ProjectMetadata = await getDBConnection().then(
    (db) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([PROJECTS_STORE], "readonly");
        const store = transaction.objectStore(PROJECTS_STORE);
        const request = store.get(projectId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  );

  return projectMetadata.currentChapterId || "";
};

export const saveSelectedChapters = async (
  projectId: string,
  selectedChapters: Set<string>
): Promise<void> => {
  console.log("saveSelectedChapters", projectId, selectedChapters);
  const projectMetadata: ProjectMetadata = await getDBConnection().then(
    (db) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([PROJECTS_STORE], "readonly");
        const store = transaction.objectStore(PROJECTS_STORE);
        const request = store.get(projectId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  );
  projectMetadata.selectedChapterIds = selectedChapters;
  await saveToIndexedDB(PROJECTS_STORE, projectMetadata);
};

export const getSelectedChapters = async (
  projectId: string
): Promise<Set<string>> => {
  const projectMetadata: ProjectMetadata = await getDBConnection().then(
    (db) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([PROJECTS_STORE], "readonly");
        const store = transaction.objectStore(PROJECTS_STORE);
        const request = store.get(projectId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  );
  return projectMetadata.selectedChapterIds || new Set<string>();
};

export const getNumberOfChapters = async (
  projectId: string
): Promise<number> => {
  const db: IDBDatabase = await getDBConnection();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHAPTERS_STORE], "readonly");
    const store = transaction.objectStore(CHAPTERS_STORE);
    const index = store.index("projectID");
    const request = index.getAllKeys(projectId);

    request.onsuccess = () => resolve(request.result.length);
    request.onerror = () => reject(request.error);
  });
};

export const renameChapter = async (
  chapter: Chapter,
  newTitle: string
): Promise<Chapter> => {
  const updatedChapter: Chapter = {
    ...chapter,
    title: newTitle.trim(),
  };
  await saveToIndexedDB(CHAPTERS_STORE, updatedChapter);
  return updatedChapter;
};

export const moveChapterUp = async (
  chapters: Chapter[],
  chapterId: string
): Promise<Chapter[]> => {
  const currentIndex = chapters.findIndex((ch) => ch.id === chapterId);
  if (currentIndex === -1 || currentIndex === 0) return chapters;

  const updatedChapters = [...chapters];
  // Swap positions
  [updatedChapters[currentIndex], updatedChapters[currentIndex - 1]] = [
    updatedChapters[currentIndex - 1],
    updatedChapters[currentIndex],
  ];

  // Reassign indices based on new order
  updatedChapters.forEach((chapter, idx) => {
    chapter.index = idx;
  });

  // Persist to database
  await Promise.all(
    updatedChapters.map((chapter) => saveToIndexedDB(CHAPTERS_STORE, chapter))
  );

  return updatedChapters;
};

export const moveChapterDown = async (
  chapters: Chapter[],
  chapterId: string
): Promise<Chapter[]> => {
  const currentIndex = chapters.findIndex((ch) => ch.id === chapterId);
  if (currentIndex === -1 || currentIndex === chapters.length - 1)
    return chapters;

  const updatedChapters = [...chapters];
  // Swap positions
  [updatedChapters[currentIndex], updatedChapters[currentIndex + 1]] = [
    updatedChapters[currentIndex + 1],
    updatedChapters[currentIndex],
  ];

  // Reassign indices based on new order
  updatedChapters.forEach((chapter, idx) => {
    chapter.index = idx;
  });

  // Persist to database
  await Promise.all(
    updatedChapters.map((chapter) => saveToIndexedDB(CHAPTERS_STORE, chapter))
  );

  return updatedChapters;
};

export const deleteChapter = async (
  chapterId: string,
  projectId: string,
  chapters: Chapter[],
  currentChapterId: string,
  selectedChapters: Set<string>
): Promise<{
  updatedChapters: Chapter[];
  newCurrentChapterId: string | null;
  updatedSelectedChapters: Set<string>;
}> => {
  await deleteFromIndexedDB(CHAPTERS_STORE, chapterId);

  const updatedChapters = chapters.filter((ch) => ch.id !== chapterId);
  let newCurrentChapterId: string | null = currentChapterId;
  const updatedSelectedChapters = new Set(selectedChapters);
  updatedSelectedChapters.delete(chapterId);

  if (currentChapterId === chapterId) {
    const currentIndex = chapters.findIndex((ch) => ch.id === chapterId);
    if (currentIndex > 0) {
      newCurrentChapterId = updatedChapters[currentIndex - 1]?.id || null;
    } else if (updatedChapters.length > 0) {
      newCurrentChapterId = updatedChapters[0].id;
    } else {
      newCurrentChapterId = null;
    }

    if (projectId && newCurrentChapterId !== currentChapterId) {
      await saveCurrentChapter(projectId, newCurrentChapterId || "");
    }
  }

  await saveSelectedChapters(projectId, updatedSelectedChapters);
  return { updatedChapters, newCurrentChapterId, updatedSelectedChapters };
};

// New implementation of saveChaptersToDB
export const saveChaptersToDB = async (
  projectId: string,
  chapters: Chapter[]
): Promise<void> => {
  try {
    const db: IDBDatabase = await getDBConnection();
    const transaction = db.transaction([CHAPTERS_STORE], "readwrite");
    const store = transaction.objectStore(CHAPTERS_STORE);

    // Ensure all chapters have the correct projectID
    const updatedChapters = chapters.map((chapter) => ({
      ...chapter,
      projectID: projectId,
    }));

    // Save all chapters to the store
    await Promise.all(
      updatedChapters.map(
        (chapter) =>
          new Promise<void>((resolve, reject) => {
            const request = store.put(chapter); // 'put' updates or adds based on id
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          })
      )
    );

    // Wait for the transaction to complete
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    console.log(`Saved ${chapters.length} chapters for project ${projectId}`);
  } catch (error) {
    console.error("Failed to save chapters to DB:", error);
    throw error; // Re-throw to allow caller to handle
  }
};
