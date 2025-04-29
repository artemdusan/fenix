import { countTokens } from "gpt-tokenizer";
import { ChapterData } from "../types";
import { CHAPTERS_STORE, loadFromIndexedDB } from "../databaseService";
import { TRANSLATION_PROMPT_TEMPLATE } from "./promptUtils";

export const estimateTokenCount = async (
  selectedChapters: Set<string>
): Promise<number> => {
  let totalTokens = 0;
  if (!selectedChapters || !(selectedChapters instanceof Set))
    return totalTokens;

  for (const chapterId of selectedChapters) {
    const chapter: ChapterData = await loadFromIndexedDB(
      CHAPTERS_STORE,
      chapterId
    );
    const text = chapter?.content || "";
    const chunks = Math.ceil(text.length / 3000);
    totalTokens += countTokens(TRANSLATION_PROMPT_TEMPLATE) * chunks;
    totalTokens += countTokens(text);
  }

  return totalTokens;
};
