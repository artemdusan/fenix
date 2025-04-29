import React, { useState, useEffect, useCallback, useRef } from "react";
import ConsoleLogComponent from "./ConsoleLogComponent";
import { getLanguageNameFromCode } from "../../services/editor/utils";
import { getCurrentModelFromDb } from "../../services/editor/translationService";
import {
  fetchAvailableModels,
  translateText,
  translatePromptToLanguage,
} from "../../services/editor/translationService";
import { getApiKeyFromDb } from "../../services/editor/translationService";
import {
  loadChaptersFromDB,
  saveChapterTranslation,
} from "../../services/editor/chapterService";
import "./styles/TranslationProgressModal.css";
import { useEditorContext } from "../../context/EditorContext";

const TranslationProgressModal = ({ isVisible, onClose }) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [logs, setLogs] = useState([]);
  const [isApiTested, setIsApiTested] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isCompletedOrCancelled, setIsCompletedOrCancelled] = useState(false);
  const [tokenTotals, setTokenTotals] = useState({
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  });
  const { selectedChapters, projectInfo } = useEditorContext();
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const isCancelledRef = useRef(false);

  // State to manage wake lock
  // This is a workaround for the wake lock API not being available in all browsers
  const [wakeLock, setWakeLock] = useState(null);

  // Function to request wake lock
  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        const lock = await navigator.wakeLock.request("screen");
        setWakeLock(lock);
        console.log("Wake Lock is active");
      } else {
        console.log("Wake Lock API not supported in this browser");
      }
    } catch (err) {
      console.error("Failed to acquire wake lock:", err);
    }
  };

  // Function to release wake lock
  const releaseWakeLock = async () => {
    if (wakeLock) {
      await wakeLock.release();
      setWakeLock(null);
      console.log("Wake Lock released");
    }
  };

  const MAX_RETRIES = 2; // Configurable max retry attempts
  const RETRY_DELAY = 1000; // Configurable delay between retries (in milliseconds)

  const addLog = useCallback((message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prevLogs) => [...prevLogs, `[${timestamp}] ${message}`]);
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    console.log("Timer starting");
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedTime(elapsed);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      console.log("Timer stopped");
    }
  }, []);

  const testApiConnection = useCallback(async () => {
    addLog("Testing OpenAI API connection...");
    try {
      const apiKey = await getApiKeyFromDb();
      if (!apiKey) {
        throw new Error("No API key found in database");
      }
      await fetchAvailableModels(apiKey);
      addLog("OpenAI API connection successful.");
      setIsApiTested(true);
      return true;
    } catch (error) {
      addLog(`Error: Failed to connect to OpenAI API - ${error.message}`);
      setIsCompletedOrCancelled(true);
      return false;
    }
  }, [addLog]);

  const processTranslations = useCallback(async () => {
    requestWakeLock(); // Request wake lock when translation starts
    if (!selectedChapters?.size) {
      addLog("No chapters selected for translation.");
      return;
    }
    console.log(
      "Process translations started, selectedChapters:",
      selectedChapters
    );
    isCancelledRef.current = false;
    setIsTranslating(true);

    const targetLanguage = projectInfo?.targetLanguage || "Unknown";
    const model = await getCurrentModelFromDb();
    const lang = getLanguageNameFromCode(targetLanguage);
    addLog(`Target language: ${lang}`);
    addLog(`Model: ${model}`);
    addLog("Generating prompt for translation...");
    const prompt = await translatePromptToLanguage(lang);
    console.log("Prompt:", prompt);

    try {
      const chapters = await loadChaptersFromDB(projectInfo.id);
      const chaptersToTranslate = chapters.filter((chapter) =>
        selectedChapters.has(chapter.id)
      );
      const totalChapters = chaptersToTranslate.length;
      let processedChapters = 1;
      let errors = 0;

      for (const chapter of chaptersToTranslate) {
        if (isCancelledRef.current) {
          addLog("Translation cancelled.");
          break;
        }
        let attempts = 0;
        let success = false;

        while (attempts < MAX_RETRIES && !success && !isCancelledRef.current) {
          try {
            addLog(
              `Translating ${processedChapters}/${totalChapters}: ${
                chapter.title
              } (Attempt ${attempts + 1}/${MAX_RETRIES})`
            );
            const { translatedJson, tokenUsage } = await translateText(
              chapter.content,
              prompt,
              addLog
            );
            await saveChapterTranslation(chapter, translatedJson);

            setTokenTotals((prev) => ({
              inputTokens: prev.inputTokens + tokenUsage.promptTokens,
              outputTokens: prev.outputTokens + tokenUsage.completionTokens,
              totalTokens:
                prev.totalTokens +
                tokenUsage.promptTokens +
                tokenUsage.completionTokens,
            }));

            setProgress(Math.floor((processedChapters / totalChapters) * 100));
            addLog(`Completed: ${chapter.title}`);
            success = true; // Mark as successful to exit retry loop
            processedChapters++;
          } catch (error) {
            attempts++;
            if (attempts === MAX_RETRIES) {
              errors++;
              processedChapters++;
            }
            if (attempts === MAX_RETRIES) {
              addLog(
                `Failed to translate chapter ${chapter.title} after ${MAX_RETRIES} attempts: ${error.message}`
              );
            } else {
              addLog(
                `Error translating chapter ${chapter.title}: ${error.message}. Retrying...`
              );
              await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY)); // Wait before retrying
            }
          }
        }
      }

      if (!isCancelledRef.current) {
        setProgress(100);
        addLog("Translation process completed.");
        addLog(`Chapters with errors: ${errors}`);
      }
    } catch (error) {
      addLog(`Translation process failed: ${error.message}`);
    } finally {
      setIsTranslating(false);
      setIsCompletedOrCancelled(true);
      releaseWakeLock(); // Release wake lock when translation ends
    }
  }, [selectedChapters, projectInfo, addLog]);

  const initializeTranslation = useCallback(async () => {
    console.log("Initializing translation...");
    if (!isApiTested) {
      const apiSuccess = await testApiConnection();
      if (!apiSuccess) return;
    }
    if (!isTranslating && !isCompletedOrCancelled) {
      await processTranslations();
    }
  }, [
    isApiTested,
    isTranslating,
    isCompletedOrCancelled,
    testApiConnection,
    processTranslations,
  ]);

  useEffect(() => {
    console.log("Effect running, isVisible:", isVisible);
    if (!isVisible) {
      stopTimer();
      return;
    }

    startTimer();
    initializeTranslation();

    return () => stopTimer();
  }, [isVisible, initializeTranslation, startTimer, stopTimer]);

  useEffect(() => {
    if (isCompletedOrCancelled) {
      stopTimer();
    }
  }, [isCompletedOrCancelled, stopTimer]);

  const handleCancel = () => {
    addLog("Translation cancelled by user.");
    isCancelledRef.current = true;
    setIsTranslating(false);
    setIsCompletedOrCancelled(true);
    stopTimer();
  };

  const handleClose = () => {
    if (isTranslating) {
      isCancelledRef.current = true;
    }
    stopTimer();
    onClose();
    setIsCompletedOrCancelled(false);
    setLogs([]);
    setProgress(0);
    setElapsedTime(0);
    setTokenTotals({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
    setIsApiTested(false);
    setIsTranslating(false);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  if (!isVisible) return null;

  return (
    <div className="translation-progress-modal__overlay">
      <div
        className="translation-progress-modal__container"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="translation-progress-modal__title">
          Translating Chapters
        </h3>
        <div className="translation-progress-modal__content">
          <div className="translation-progress-modal__progress-container">
            <div
              className="translation-progress-modal__bar"
              style={{ width: `${progress}%` }}
            >
              {progress}%
            </div>
          </div>
          <div className="translation-progress-modal__timer">
            Elapsed Time: {formatTime(elapsedTime)}
            <div className="translation-progress-modal__token-totals">
              Input: {tokenTotals.inputTokens.toLocaleString()} | Output:{" "}
              {tokenTotals.outputTokens.toLocaleString()} | Total:{" "}
              {tokenTotals.totalTokens.toLocaleString()}
            </div>
          </div>
          <ConsoleLogComponent logs={logs} />
        </div>
        <div className="translation-progress-modal__actions">
          {!isCompletedOrCancelled && (
            <button
              className="translation-progress-modal__button translation-progress-modal__button--cancel"
              onClick={handleCancel}
              disabled={!isApiTested || !isTranslating}
            >
              Cancel Translation
            </button>
          )}
          {isCompletedOrCancelled && (
            <button
              className="translation-progress-modal__button translation-progress-modal__button--close"
              onClick={handleClose}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranslationProgressModal;
