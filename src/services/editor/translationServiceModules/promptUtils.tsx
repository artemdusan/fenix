import { getApiKeyFromDb } from "../translationService";
import { loadTranslationGuidelines } from "./guidelinesUtils";

export const TRANSLATION_PROMPT_TEMPLATE = `
You are a professional translator.
Translate the following text into {languageName}.

Instructions:
- Split the text into logical fragments.
- Break at punctuation (e.g., periods, commas) or natural phrase boundaries.
- Aim for short fragments, approximately 7 words each, max 100 characters, for readability.
- Adjust fragment length slightly if even splitting isn’t possible.
- Preserve all punctuation, capitalization, and dialogue markers (e.g., quotes).
- {customInstructions}

Output Format, valid JSON array, your response will be parsed by the app:
[{"s": "source text", "t": "translated text in {languageName}"}, ...]
- Ensure the output is valid JSON.
- "s" and "t" can't be empty.
- Use double quotes for keys and values.
- dont enclose in \`\`\`json\`\`\`
`;

export const formatTranslationPrompt = (
  languageName: string,
  customInstructions: string
): string => {
  return TRANSLATION_PROMPT_TEMPLATE.replace(
    /\{languageName\}/g,
    languageName
  ).replace(/\{customInstructions\}/g, customInstructions);
};

export const translatePromptToLanguage = async (
  language: string
): Promise<string> => {
  const apiKey = await getApiKeyFromDb();

  if (!apiKey) {
    throw new Error("API key not found");
  }

  const customInstructions = await loadTranslationGuidelines();
  const propmptTotranslate = formatTranslationPrompt(
    language,
    customInstructions
  );
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: `translate this prompt for chat gpt to ${language}, i will use it to interact with chat gpt: ${propmptTotranslate}.`,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || "Translation API request failed"
      );
    }

    const data = await response.json();
    const translatedPrompt = data.choices[0].message.content.trim();

    return translatedPrompt;
  } catch (error) {
    console.error(`Error translating prompt to ${language}:`, error);
    throw new Error(`Failed to translate prompt: ${(error as Error).message}`);
  }
};
