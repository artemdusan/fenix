import { Book } from "epubjs";

export type JsonBook = {
  title: string;
  author: string;
  cover: string;
  notes: string;
  sourceLanguage: string;
  targetLanguage: string;
  chapters: JsonChapter[];
};

export type JsonChapter = {
  title: string;
  content: JsonRow[];
};

export type JsonRow = {
  source: string;
  translation: string;
};

export interface ProjectMetadata {
  id: string;
  title: string;
  author: string;
  notes?: string;
  coverBase64: string | null;
  sourceLanguage: string;
  targetLanguage: string;
  currentChapterId?: string;
  selectedChapterIds?: Set<string>;
}

export interface ChapterData {
  id: string;
  projectID: string;
  title: string;
  content: string;
  originalContent: string;
  translation: string;
  originalTranslation: string;
  isEdited: boolean;
  isTranslationEdited: boolean;
  index: number;
}

export interface EpubData {
  id: string;
  title: string;
  author: string;
  coverBase64: string | null;
  spine: any;
  book: Book;
  sourceLanguage?: string;
  targetLanguage?: string;
}

export interface ProcessingResult {
  bookInfo: ProjectMetadata;
  chapters: ChapterData[];
  processedCount: number;
}

export interface Language {
  code: string;
  name: string;
}

export enum Screen {
  EDITOR = 0,
  TRANSLATION = 1,
}
