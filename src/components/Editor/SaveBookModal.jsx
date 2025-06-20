import React, { useState, useEffect } from "react";
import ConsoleLogComponent from "./ConsoleLogComponent";
import { isValidTranslationCsv } from "../../services/editor/translationService";
import { useEditorContext } from "../../context/EditorContext";
import {
  saveProjectAsJsonBook,
  getProjectInfo,
} from "../../services/editor/projectService";
import { saveBookToDB, openDB } from "../../services/Library/databaseService"; // Import database service functions
import "./styles/SaveBookModal.css";

const SaveBookModal = ({ isVisible, onClose, onDownload }) => {
  const [logs, setLogs] = useState([]);
  const [isDownloadEnabled, setIsDownloadEnabled] = useState(false);
  const { selectedChapters, chapters } = useEditorContext();

  const addLog = (message, color = "inherit") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prevLogs) => [
      ...prevLogs,
      { text: `[${timestamp}] ${message}`, color },
    ]);
  };

  useEffect(() => {
    if (!isVisible) return;

    setLogs([]);
    validateChapters();
  }, [isVisible, selectedChapters, chapters]);

  const validateChapters = () => {
    if (!selectedChapters?.size || !chapters?.length) {
      addLog("No chapters selected or available.");
      setIsDownloadEnabled(false);
      return;
    }

    const selectedChapterArray = chapters.filter((chapter) =>
      selectedChapters.has(chapter.id)
    );
    let allValid = true;

    selectedChapterArray.forEach((chapter) => {
      const hasTranslation =
        chapter.translation && isValidTranslationCsv(chapter.translation);
      if (hasTranslation) {
        addLog(`${chapter.title}: ok`, "var(--green)");
      } else {
        addLog(`${chapter.title}: no translation`, "var(--red)");
        allValid = false;
      }
    });

    setIsDownloadEnabled(allValid);
  };

  const handleCancel = () => {
    onClose();
  };

  const handleDownload = async () => {
    try {
      addLog("Download initiated...");
      const projectInfo = await getProjectInfo();
      const bookToSave = await saveProjectAsJsonBook(projectInfo);

      if (!bookToSave) {
        addLog("No book data available to download");
        return;
      }

      const jsonContent = JSON.stringify(bookToSave, null, 2);
      const blob = new Blob([jsonContent], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectInfo.title}_${projectInfo.sourceLanguage}_${projectInfo.targetLanguage}.json`;
      document.body.appendChild(a);
      a.click();

      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addLog("Download completed successfully");
      onDownload();
    } catch (error) {
      addLog(`Download failed: ${error.message}`);
      console.error("Download error:", error);
    }
  };

  const handleAddToLibrary = async () => {
    try {
      addLog("Saving to library...");
      const projectInfo = await getProjectInfo();
      const bookToSave = await saveProjectAsJsonBook(projectInfo);
      bookToSave.id = projectInfo.id;

      if (!bookToSave) {
        addLog("No book data available to save to library");
        return;
      }

      const db = await openDB();
      await saveBookToDB(db, bookToSave);
      db.close();

      addLog("Book successfully added to library", "var(--green)");
    } catch (error) {
      addLog(`Failed to add to library: ${error.message}`, "var(--red)");
      console.error("Library save error:", error);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="save-book-modal__overlay">
      <div
        className="save-book-modal__container"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="save-book-modal__title">Saving Book</h3>
        <div className="save-book-modal__content">
          <ConsoleLogComponent
            logs={logs.map((log) => log.text)}
            logColors={logs.map((log) => log.color)}
          />
        </div>
        <div className="save-book-modal__actions">
          <button
            className="save-book-modal__button save-book-modal__button--cancel"
            onClick={handleCancel}
          >
            Close
          </button>
          {isDownloadEnabled && (
            <>
              <button
                className="save-book-modal__button save-book-modal__button--library"
                onClick={handleAddToLibrary}
              >
                Save to Library
              </button>
              <button
                className="save-book-modal__button save-book-modal__button--download"
                onClick={handleDownload}
              >
                Download
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaveBookModal;
