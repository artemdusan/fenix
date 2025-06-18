import {
  saveToIndexedDB,
  loadFromIndexedDB,
  SETTINGS_STORE,
  API_KEY,
} from "../databaseService";

export const saveApiKeyToDb = async (apiKey: string): Promise<void> => {
  try {
    await saveToIndexedDB(SETTINGS_STORE, { id: API_KEY, value: apiKey });
    console.log("API key saved successfully.");
  } catch (error) {
    console.error("Failed to save API key:", error);
    throw error;
  }
};

export const getApiKeyFromDb = async (): Promise<string | null> => {
  try {
    const result: any = await loadFromIndexedDB(SETTINGS_STORE, API_KEY);
    if (result) {
      console.log("API key retrieved successfully.");
      return result.value as string;
    } else {
      console.log("No API key found.");
      return null;
    }
  } catch (error) {
    console.error("Failed to retrieve API key:", error);
    throw error;
  }
};

export const saveModelsToDb = async (models: string[]): Promise<void> => {
  try {
    await saveToIndexedDB(SETTINGS_STORE, { id: "models", value: models });
    console.log("Models saved successfully.");
  } catch (error) {
    console.error("Failed to save models:", error);
    throw error;
  }
};

export const getModelsFromDb = async (): Promise<string[] | null> => {
  try {
    const result: any = await loadFromIndexedDB(SETTINGS_STORE, "models");
    if (result) {
      console.log("Models retrieved successfully.");
      return result.value as string[];
    } else {
      console.log("No models found.");
      return null;
    }
  } catch (error) {
    console.error("Failed to retrieve models:", error);
    throw error;
  }
};

export const saveCurrentModelToDb = async (
  currentModel: string
): Promise<void> => {
  try {
    await saveToIndexedDB(SETTINGS_STORE, {
      id: "currentModel",
      value: currentModel,
    });
    console.log("Current model saved successfully.");
  } catch (error) {
    console.error("Failed to save current model:", error);
    throw error;
  }
};

export const getCurrentModelFromDb = async (): Promise<string | null> => {
  try {
    const result: any = await loadFromIndexedDB(SETTINGS_STORE, "currentModel");
    if (result) {
      console.log("Current model retrieved successfully.");
      return result.value as string;
    } else {
      console.log("No current model found.");
      return null;
    }
  } catch (error) {
    console.error("Failed to retrieve current model:", error);
    throw error;
  }
};

export const saveFallbackModelToDb = async (
  fallbackModel: string
): Promise<void> => {
  try {
    await saveToIndexedDB(SETTINGS_STORE, {
      id: "fallbackModel",
      value: fallbackModel,
    });
    console.log("Fallback model saved successfully.");
  } catch (error) {
    console.error("Failed to save fallback model:", error);
    throw error;
  }
};

export const getFallbackModelFromDb = async (): Promise<string | null> => {
  try {
    const result: any = await loadFromIndexedDB(
      SETTINGS_STORE,
      "fallbackModel"
    );
    if (result) {
      console.log("Fallback model retrieved successfully.");
      return result.value as string;
    } else {
      console.log("No fallback model found.");
      return null;
    }
  } catch (error) {
    console.error("Failed to retrieve fallback model:", error);
    throw error;
  }
};

interface Model {
  id: string;
  name: string;
}

export const fetchAvailableModels = async (
  apiKey: string
): Promise<Model[]> => {
  if (!apiKey) return [];

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    const chatModels: Model[] = data.data
      .filter((model: any) => model.id.includes("gpt"))
      .map((model: any) => ({
        id: model.id,
        name: model.id.replace("gpt-", "GPT ").replace(/-([0-9])/, " $1"),
      }))
      .sort((a: Model, b: Model) => a.id.localeCompare(b.id));

    return chatModels;
  } catch (error) {
    console.error("Error fetching models:", error);
    throw new Error(`Failed to fetch models: ${(error as Error).message}`);
  }
};
