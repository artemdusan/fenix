import { JsonRow } from "../types";

const regex = /^"([^"]*)"\s*[,;:\t|]\s*"([^"]*)"\s*,?\s*$/;

export const extractRowsFromCSV = (csvText: string): JsonRow[] => {
  const lines = csvText.split("\n").map((line) => line.trim());

  const translations = lines
    .map((line) => {
      const match = line.match(regex);
      if (!match) {
        return null;
      }
      return {
        source: match[1] || "",
        translation: match[2] || "",
      };
    })
    .filter((row) => row !== null)
    .filter((row) => row.source !== "" || row.translation !== "");

  return translations;
};

export const validateTranslationLines = (csvText: string) => {
  const lines = csvText.split("\n");
  const errors: any[] = [];

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    const lineNumber = index + 1;

    if (!trimmedLine) return;

    const match = trimmedLine.match(regex);

    if (!match) {
      errors.push({
        lineNumber,
        content: trimmedLine,
        message:
          "Invalid format: Must have exactly 2 quoted columns with a valid separator (,;:\t|)",
      });
      return;
    }

    const [_, source, translation] = match;
    if (source === "" && translation === "") {
      errors.push({
        lineNumber,
        content: trimmedLine,
        message: "Warning: Both columns are empty",
      });
    }
  });

  return errors;
};

export const isValidTranslationCsv = (translation: string): boolean => {
  const cleanedTranslation = translation
    .replace(/\\n/g, "\n")
    .replace(/""/g, '"')
    .trim();

  const errors = validateTranslationLines(cleanedTranslation);
  return errors.length === 0;
};
