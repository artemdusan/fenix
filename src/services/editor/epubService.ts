import { htmlToText } from "./utils";
import {
  EpubData,
  ChapterData,
  ProjectMetadata,
  ProcessingResult,
} from "./types";

import {
  clearDatabase,
  saveToIndexedDB,
  PROJECTS_STORE,
  CHAPTERS_STORE,
  CURRENT_PROJECT_ID,
  SETTINGS_STORE,
} from "./databaseService";

export const processEpubChapters = async (
  projectId: string,
  book: any,
  startIndex: number = 0
): Promise<{ chaptersData: ChapterData[]; processed: number }> => {
  let processed = startIndex;
  const chaptersData: ChapterData[] = [];

  // Load the TOC once for efficiency
  const navigation = await book.loaded.navigation;
  const toc = navigation.toc;
  const spine = book.spine;
  for (const item of spine.items) {
    try {
      const chapterHref: string = item.href;
      const chapterContent: Document | {} = await book.load(item.href);
      if (!(chapterContent instanceof Document)) {
        console.error(`Invalid chapter content for ${item.href}`);
        continue;
      }
      const textContent = htmlToText(chapterContent.body.innerHTML);
      if (!textContent) {
        console.error(`No text content found for ${item.href}`);
        continue;
      }

      // Try TOC first
      const tocEntry = toc.find(
        (entry: any) =>
          entry.href === chapterHref ||
          chapterHref.includes(entry.href.split("#")[0])
      );
      let chapterTitle = tocEntry ? tocEntry.label.trim() : item.label;

      const chapterId = crypto.randomUUID();

      const chapterData: ChapterData = {
        id: chapterId,
        projectID: projectId,
        title: chapterTitle,
        content: textContent,
        originalContent: textContent,
        translation: "",
        originalTranslation: "",
        isEdited: false,
        isTranslationEdited: false,
        index: processed,
      };

      await saveToIndexedDB(CHAPTERS_STORE, chapterData);
      chaptersData.push(chapterData);

      processed++;
    } catch (error) {
      console.error(`Error processing chapter ${item.href}:`, error);
    }
  }
  return { chaptersData, processed };
};

export const processEpubBook = async (
  newEpubData: EpubData
): Promise<ProcessingResult> => {
  console.log("Processing EPUB book data...", newEpubData);
  if (!newEpubData) {
    console.error("Missing book data");
    throw new Error("Missing book data");
  }

  try {
    const { spine, book } = newEpubData;
    const projectId = crypto.randomUUID();
    const { chaptersData, processed } = await processEpubChapters(
      projectId,
      book,
      0
    );
    const ProjectMetadata: ProjectMetadata = {
      id: projectId,
      title: newEpubData.title,
      author: newEpubData.author,
      coverBase64: newEpubData.coverBase64,
      sourceLanguage: newEpubData.sourceLanguage || "en",
      targetLanguage: newEpubData.targetLanguage || "es",
      currentChapterId: chaptersData[0].id,
    };

    console.log("Saving book metadata...");
    await saveToIndexedDB(PROJECTS_STORE, ProjectMetadata);
    await saveToIndexedDB(SETTINGS_STORE, {
      id: CURRENT_PROJECT_ID,
      value: projectId,
    });

    console.log(`Successfully processed ${processed} chapters.`);

    return {
      bookInfo: ProjectMetadata,
      chapters: chaptersData,
      processedCount: processed,
    };
  } catch (error) {
    console.error("Error processing EPUB:", error);
    throw new Error(`Failed to process EPUB file: ${(error as Error).message}`);
  }
};
