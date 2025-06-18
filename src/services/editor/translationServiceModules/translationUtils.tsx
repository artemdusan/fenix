import { getProjectInfo } from "../projectService";
import {
  getApiKeyFromDb,
  getCurrentModelFromDb,
  getFallbackModelFromDb,
} from "./apiUtils";
import { loadTranslationGuidelines } from "./guidelinesUtils";

const MAX_CHUNK_SIZE = 2000;
const BATCH_SIZE = 30;
const BATCH_DELAY_MS = 200;

interface TranslationResult {
  translatedJson: string;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
  };
}

interface TranslationChunk {
  content: string;
  total_input_tokens: number;
  total_output_tokens: number;
  index: number;
}

export const translateText = async (
  text: string,
  prompt: string,
  addLog: (message: string) => void
): Promise<TranslationResult> => {
  // Validation and setup
  if (!text?.trim()) {
    throw new Error("Input text cannot be empty");
  }

  const [metadata, apiKey, model, fallbackModel] = await Promise.all([
    getProjectInfo(),
    getApiKeyFromDb(),
    getCurrentModelFromDb(),
    getFallbackModelFromDb(),
  ]);

  validateSetup(metadata, apiKey || "", model || "");

  // Processing
  const chunks = splitIntoChunks(text);
  const translatedChunks = await processChunksInBatches(
    chunks,
    prompt,
    apiKey || "",
    model || "",
    fallbackModel || "gpt-4o",
    addLog
  );
  const sortedTranslations = translatedChunks.sort((a, b) => a.index - b.index);

  // Results compilation
  const tokenUsage = calculateTokenUsage(translatedChunks);
  const translatedJson = convertToCsv(sortedTranslations.map((t) => t.content));

  return { translatedJson, tokenUsage };
};

// Helper functions
const validateSetup = (metadata: any, apiKey: string, model: string) => {
  if (!metadata?.targetLanguage) {
    throw new Error("Target language not found in project metadata");
  }
  if (!apiKey || !model) {
    throw new Error("Missing required settings: API key or model not found");
  }
};

const splitIntoChunks = (input: string): string[] => {
  const paragraphs = input.split("\n").filter((p) => p.trim());
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  paragraphs.forEach((paragraph) => {
    if (paragraph.length > MAX_CHUNK_SIZE) {
      if (currentChunk.length) {
        chunks.push(currentChunk.join("\n"));
        currentChunk = [];
        currentLength = 0;
      }
      splitLongParagraph(paragraph, chunks);
    } else if (currentLength + paragraph.length + 1 <= MAX_CHUNK_SIZE) {
      currentChunk.push(paragraph);
      currentLength += paragraph.length + 1;
    } else {
      chunks.push(currentChunk.join("\n"));
      currentChunk = [paragraph];
      currentLength = paragraph.length;
    }
  });

  if (currentChunk.length) chunks.push(currentChunk.join("\n"));
  return chunks;
};

const splitLongParagraph = (paragraph: string, chunks: string[]) => {
  const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
  let sentenceChunk = "";

  sentences.forEach((sentence) => {
    if ((sentenceChunk + sentence).length <= MAX_CHUNK_SIZE) {
      sentenceChunk += sentence;
    } else {
      if (sentenceChunk) chunks.push(sentenceChunk);
      if (sentence.length > MAX_CHUNK_SIZE) {
        splitByPunctuation(sentence, chunks);
      } else {
        chunks.push(sentence);
      }
      sentenceChunk = "";
    }
  });

  if (sentenceChunk) chunks.push(sentenceChunk);
};

const splitByPunctuation = (sentence: string, chunks: string[]) => {
  const parts = sentence.split(/([,;:])/).filter(Boolean);
  let partChunk = "";

  parts.forEach((part) => {
    if ((partChunk + part).length <= MAX_CHUNK_SIZE) {
      partChunk += part;
    } else {
      chunks.push(partChunk);
      partChunk = part;
    }
  });

  if (partChunk) chunks.push(partChunk);
};

const translateChunk = async (
  chunk: string,
  index: number,
  prompt: string,
  apiKey: string,
  model: string,
  fallbackModel: string,
  addLog: (message: string) => void,
  maxRetries: number = 3
): Promise<TranslationChunk> => {
  let attempts = 0;

  while (attempts <= maxRetries) {
    try {
      const timestamp = new Date().toISOString();
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: attempts === 0 ? model : fallbackModel,
            messages: [
              { role: "system", content: `[${timestamp}] ${prompt}` },
              { role: "user", content: chunk },
            ],
            temperature: 0.2 + attempts * 0.05,
            max_tokens: 10000,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error?.message || "Translation API request failed"
        );

      const jsonResponse = data.choices[0].message.content.trim();
      const parsedResponse = JSON.parse(jsonResponse);

      if (!isValidTranslationResponse(parsedResponse)) {
        throw new Error("Invalid JSON response format");
      }
      if (attempts > 0) {
        addLog(
          `Retry successful for chunk ${index + 1}, used ${fallbackModel}`
        );
      }

      return {
        content: jsonResponse,
        total_input_tokens: data.usage?.prompt_tokens || 0,
        total_output_tokens: data.usage?.completion_tokens || 0,
        index,
      };
    } catch (error) {
      attempts++;
      addLog(
        `Error translating chunk ${
          index + 1
        }, retrying... ${attempts}/${maxRetries}`
      );
      if (attempts === maxRetries) {
        throw new Error(
          `Failed to translate chunk ${index + 1} after ${maxRetries}`
        );
      }
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempts) * 1000)
      );
    }
  }

  throw new Error("Unexpected error in translation retry logic");
};

const processChunksInBatches = async (
  chunks: string[],
  prompt: string,
  apiKey: string,
  model: string,
  fallbackModel: string,
  addLog: (message: string) => void
): Promise<TranslationChunk[]> => {
  const translations: TranslationChunk[] = [];

  for (
    let batchStart = 0;
    batchStart < chunks.length;
    batchStart += BATCH_SIZE
  ) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, chunks.length);
    const currentBatch = chunks.slice(batchStart, batchEnd);

    const batchPromises = currentBatch.map((chunk, batchIndex) =>
      new Promise((resolve) => setTimeout(resolve, batchIndex * BATCH_DELAY_MS))
        .then(() =>
          translateChunk(
            chunk,
            batchStart + batchIndex,
            prompt,
            apiKey,
            model,
            fallbackModel,
            addLog
          )
        )
        .then((result) => ({ ...result }))
        .catch((error) =>
          Promise.reject(new Error(`Batch translation error: ${error}`))
        )
    );

    const batchResults = await Promise.all(batchPromises);
    translations.push(...batchResults);
  }

  return translations;
};

const isValidTranslationResponse = (response: any): boolean =>
  Array.isArray(response) &&
  response.every(
    (item: any) =>
      item.hasOwnProperty("s") &&
      item.hasOwnProperty("t") &&
      item.s &&
      item.t &&
      item.s.length < 100
  );

const calculateTokenUsage = (translations: TranslationChunk[]) =>
  translations.reduce(
    (acc, t) => ({
      promptTokens: acc.promptTokens + t.total_input_tokens,
      completionTokens: acc.completionTokens + t.total_output_tokens,
    }),
    { promptTokens: 0, completionTokens: 0 }
  );

const convertToCsv = (jsonStrings: string[]): string => {
  let csv = "";

  jsonStrings.forEach((jsonStr) => {
    try {
      const cleanedStr = jsonStr.trim();
      if (!cleanedStr) return;

      const parsedData = JSON.parse(cleanedStr);
      if (!Array.isArray(parsedData)) {
        throw new Error("Input must be an array of objects");
      }

      parsedData.forEach((obj: any) => {
        if (!obj.hasOwnProperty("s") || !obj.hasOwnProperty("t")) {
          throw new Error("Objects must contain both s and t properties");
        }
        csv += `"${String(obj.s).replace(/"/g, "`")}", "${String(obj.t).replace(
          /"/g,
          "`"
        )}"\n`;
      });
    } catch (error: any) {
      throw new Error(`Invalid JSON format: ${error.message}`);
    }
  });

  return csv;
};
