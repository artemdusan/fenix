import React, { useState, useEffect, use } from "react";
import { useEditorContext } from "../../context/EditorContext";
import { getLanguageNameFromCode } from "../../services/editor/utils";
import {
  fetchAvailableModels,
  estimateTokenCount,
  saveTranslationGuidelines,
  loadTranslationGuidelines,
  formatTranslationPrompt,
} from "../../services/editor/translationService";
import {
  saveModelsToDb,
  getModelsFromDb,
  saveCurrentModelToDb,
  getCurrentModelFromDb,
} from "../../services/editor/translationService";
import { FiRefreshCw, FiPlayCircle, FiInfo, FiCopy } from "react-icons/fi";
import "./styles/TranslationSetup.css";

const TranslationSetup = ({ setIsTranslating }) => {
  const DEFAULT_MODELS = [{ id: "gpt-4o-mini", name: "GPT 4o-mini" }];
  const { projectInfo, apiKey, selectedChapters } = useEditorContext();
  const [availableModels, setAvailableModels] = useState([]);
  const [currentModel, setCurrentModel] = useState("");
  const [translationInstructions, setTranslationInstructions] = useState("");
  const [estimatedTokens, setEstimatedTokens] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      console.log("Fetching translation guidelines...");
      loadTranslationGuidelines().then((guidelines) =>
        setTranslationInstructions(guidelines)
      );
    }
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      getModelsFromDb().then((models) =>
        setAvailableModels(models || DEFAULT_MODELS)
      );
      getCurrentModelFromDb().then((m) => {
        const modelToSet = m || DEFAULT_MODELS[0].id; // "gpt-4o-mini" if m is falsy
        setCurrentModel(modelToSet);
        if (!m) {
          saveCurrentModelToDb(modelToSet); // Save the default model to the database
        }
      });
      estimateTokenCount(selectedChapters || new Set()).then(
        setEstimatedTokens
      );
    }
    return () => {
      isMounted = false;
    };
  }, [selectedChapters]);

  const handleRefreshModels = async () => {
    setIsRefreshing(true);
    try {
      const models = await fetchAvailableModels(apiKey);
      setAvailableModels(models);
      saveModelsToDb(models);
    } catch (error) {
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  };
  const handleCopy = async () => {
    const customInstructions = await loadTranslationGuidelines();
    const languagName = getLanguageNameFromCode(projectInfo.targetLanguage);
    const prompt = formatTranslationPrompt(languagName, customInstructions);

    navigator.clipboard
      .writeText(prompt)
      .then(() => {
        alert("ChatGPT prompt copied to clipboard!");
      })
      .catch((error) => {
        console.error("Failed to copy content:", error);
        alert("Failed to copy content.");
      });
  };

  return (
    <section className="translation-setup">
      <h2 className="translation-setup__heading">Translation Setup</h2>
      <p className="translation-setup__info">
        Translate {selectedChapters.size} chapters from{" "}
        {getLanguageNameFromCode(projectInfo.sourceLanguage)} to{" "}
        {getLanguageNameFromCode(projectInfo.targetLanguage)}
      </p>

      <div className="translation-setup__field">
        <div className="translation-setup__label-container">
          <label className="translation-setup__label" htmlFor="model-select">
            AI Model
          </label>
          <button
            className="translation-setup__refresh"
            onClick={handleRefreshModels}
            title="Refresh AI Models"
            disabled={isRefreshing}
          >
            <FiRefreshCw className={isRefreshing ? "spinning" : ""} />
          </button>
        </div>
        <select
          id="model-select"
          className="translation-setup__control translation-setup__control--select"
          value={currentModel}
          onChange={(e) => {
            saveCurrentModelToDb(e.target.value);
            setCurrentModel(e.target.value);
          }}
        >
          <option value="" disabled>
            Choose Model
          </option>
          {availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
        <a
          href="https://openai.com/api/pricing/"
          target="_blank"
          rel="noopener noreferrer"
          className="translation-setup__pricing-link"
        >
          <FiInfo className="translation-setup__pricing-icon" />
          View Model Pricing
        </a>
        <div className="translation-setup__token-info">
          <span className="translation-setup__token-heading">
            Estimated Token Count
          </span>
          <div className="translation-setup__token-row">
            <span className="translation-setup__token-label">Input</span>
            <span className="translation-setup__token-value">
              {Math.round(estimatedTokens).toLocaleString()}
            </span>
          </div>
          <div className="translation-setup__token-row">
            <span className="translation-setup__token-label">Output</span>
            <span className="translation-setup__token-value">
              {Math.round(estimatedTokens * 2.05).toLocaleString()}
            </span>
          </div>
          <div className="translation-setup__token-row">
            <span className="translation-setup__token-label">Total</span>
            <span className="translation-setup__token-value">
              {(
                Math.round(estimatedTokens * 2.05) + Math.round(estimatedTokens)
              ).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="translation-setup__field">
        <label className="translation-setup__label" htmlFor="instructions">
          Translation Guidelines{" "}
          <button
            className="translation-setup__refresh"
            onClick={handleCopy}
            title="Copy Prompt"
          >
            <FiCopy className={isRefreshing ? "spinning" : ""} />
          </button>
        </label>
        <textarea
          id="instructions"
          className="translation-setup__control translation-setup__control--textarea"
          value={translationInstructions}
          onChange={(e) => {
            setTranslationInstructions(e.target.value);
            saveTranslationGuidelines(e.target.value);
          }}
          placeholder="e.g., 'Use simple grammar and vocabulary'"
        />
      </div>

      <div className="translation-setup__actions">
        <button
          className={`translation-setup__action ${
            selectedChapters.size === 0 || !apiKey
              ? "translation-setup__action--disabled"
              : ""
          }`}
          disabled={selectedChapters.size === 0 || !apiKey}
          onClick={() => {
            setIsTranslating(true);
          }}
        >
          <FiPlayCircle style={{ marginRight: "0.5rem" }} />
          Start Translation
        </button>
        {!apiKey && (
          <span className="translation-setup__notice">API Key Required</span>
        )}
      </div>
    </section>
  );
};

export default TranslationSetup;
