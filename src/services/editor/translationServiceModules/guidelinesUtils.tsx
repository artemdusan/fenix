import {
  SETTINGS_STORE,
  saveToIndexedDB,
  loadFromIndexedDB,
} from "../databaseService";

const TRANSLATION_GUIDELINES = `translationGuidelines`;

export const saveTranslationGuidelines = async (
  guidelines: string
): Promise<void> => {
  try {
    await saveToIndexedDB(SETTINGS_STORE, {
      id: TRANSLATION_GUIDELINES,
      value: guidelines,
    });
    console.log("Translation guidelines saved successfully.");
  } catch (error) {
    console.error("Error saving translation guidelines:", error);
    throw new Error(
      `Failed to save translation guidelines: ${(error as Error).message}`
    );
  }
};

export const loadTranslationGuidelines = async (): Promise<string> => {
  try {
    const guidelines: any = await loadFromIndexedDB(
      SETTINGS_STORE,
      TRANSLATION_GUIDELINES
    );
    return guidelines?.value || "";
  } catch (error) {
    console.error("Error loading translation guidelines:", error);
    throw new Error(
      `Failed to load translation guidelines: ${(error as Error).message}`
    );
  }
};
