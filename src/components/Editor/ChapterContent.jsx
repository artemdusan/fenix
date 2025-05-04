import React, { useState, useEffect, useRef } from "react";
import {
  CHAPTERS_STORE,
  loadFromIndexedDB,
} from "../../services/editor/databaseService";
import {
  saveChapterContent,
  revertChapterToOriginal,
  revertChapterTranslation,
  loadChaptersFromDB,
  renameChapter,
  moveChapterUp,
  moveChapterDown,
  deleteChapter,
} from "../../services/editor/chapterService";
import ConfirmationDialogModal from "../common/ConfirmationDialogModal";
import { getLanguageNameFromCode } from "../../services/editor/utils";
import { useEditorContext } from "../../context/EditorContext";
import HeaderChapter from "./HeaderChapter";
import "./styles/ChapterContent.css";
import {
  validateTranslationLines,
  extractRowsFromCSV,
} from "../../services/editor/translationService";

function ChapterContent() {
  const [chapter, setChapter] = useState(null);
  const [viewTranslation, setViewTranslation] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [csvErrors, setCsvErrors] = useState([]);
  const chapterContentRef = useRef(null);
  const editorRef = useRef(null);
  const {
    currentChapterId,
    chapters,
    setChapters,
    projectInfo,
    setCurrentChapterId,
    selectedChapters,
    setSelectedChapters,
  } = useEditorContext();

  useEffect(() => {
    if (viewTranslation && chapter && chapter.translation) {
      const errors = validateTranslationLines(chapter.translation);
      setCsvErrors(errors);
    } else {
      setCsvErrors([]);
    }
  }, [viewTranslation, chapter]);

  useEffect(() => {
    const loadInitialChapter = async () => {
      if (chapters.length > 0) await loadChapterData(currentChapterId);
    };
    loadInitialChapter();
  }, [currentChapterId]);

  const loadChapterData = async (chapterId) => {
    const chapterData = await loadFromIndexedDB(CHAPTERS_STORE, chapterId);
    if (chapterData) {
      setChapter(chapterData);
      if (!chapterData.translation) setViewTranslation(false);
      setEditContent(
        viewTranslation && chapterData.translation
          ? chapterData.translation
          : chapterData.content
      );
    }
  };

  useEffect(() => {
    if (chapterContentRef.current) chapterContentRef.current.scrollTop = 0;
  }, [chapter]);

  useEffect(() => {
    if (chapter)
      setEditContent(viewTranslation ? chapter.translation : chapter.content);
  }, [chapter, viewTranslation]);

  const handleSave = async () => {
    if (!chapter) return;
    const updatedChapter = await saveChapterContent(
      chapter,
      editContent,
      viewTranslation
    );
    const chaptersList = await loadChaptersFromDB(projectInfo.id);
    setChapters([...chaptersList]);
    setChapter(updatedChapter);
    setEditMode(false);
  };

  const handleCancel = () => {
    setEditContent(viewTranslation ? chapter.translation : chapter.content);
    setEditMode(false);
  };

  const handleRevert = async () => {
    if (!chapter) return;
    const updatedChapter = viewTranslation
      ? await revertChapterTranslation(chapter)
      : await revertChapterToOriginal(chapter);
    const chaptersList = await loadChaptersFromDB(projectInfo.id);
    setChapters(chaptersList);
    setChapter(updatedChapter);
    setEditContent(
      viewTranslation ? updatedChapter.translation : updatedChapter.content
    );
  };

  const handleRenameSubmit = async () => {
    if (!chapter || !newTitle.trim()) return;
    const updatedChapter = await renameChapter(chapter, newTitle.trim());
    setChapter(updatedChapter);
    const updatedChapters = chapters.map((ch) =>
      ch.id === chapter.id ? updatedChapter : ch
    );
    setChapters(updatedChapters);
    setIsRenaming(false);
  };

  const handleMoveUp = async () => {
    if (!chapter) return;
    const updatedChapters = await moveChapterUp(chapters, chapter.id);
    setChapters(updatedChapters);
    setCurrentChapterId(chapter.id);
  };

  const handleMoveDown = async () => {
    if (!chapter) return;
    const updatedChapters = await moveChapterDown(chapters, chapter.id);
    setChapters(updatedChapters);
    setCurrentChapterId(chapter.id);
  };

  const handleDelete = () => {
    if (!chapter) return;
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!chapter) return;
    const { updatedChapters, newCurrentChapterId, updatedSelectedChapters } =
      await deleteChapter(
        chapter.id,
        projectInfo.id,
        chapters,
        currentChapterId,
        selectedChapters
      );
    setChapters(updatedChapters);
    setCurrentChapterId(newCurrentChapterId);
    setSelectedChapters(updatedSelectedChapters);
    if (newCurrentChapterId) await loadChapterData(newCurrentChapterId);
    else setChapter(null);
    setShowDeleteDialog(false);
  };

  const cancelDelete = () => setShowDeleteDialog(false);

  const handleErrorClick = (lineNumber) => {
    if (!chapter || !chapter.translation) return;

    setEditMode(true);
    setViewTranslation(true);
    setEditContent(chapter.translation);

    setTimeout(() => {
      if (editorRef.current) {
        const lines = chapter.translation.split("\n");
        const targetLineIndex = lineNumber - 1;
        if (targetLineIndex < 0 || targetLineIndex >= lines.length) return;

        let startPos = 0;
        for (let i = 0; i < targetLineIndex; i++) {
          startPos += lines[i].length + 1;
        }
        const endPos = startPos + lines[targetLineIndex].length;

        editorRef.current.focus();
        editorRef.current.setSelectionRange(startPos, endPos);

        const lineHeight = 28;
        const scrollPosition = targetLineIndex * lineHeight;
        editorRef.current.scrollTop = scrollPosition;
      }
    }, 0);
  };

  const renderTranslationTable = () => {
    if (!chapter?.translation) return null;

    if (csvErrors.length > 0) {
      return (
        <div className="chapter-content__empty-state">
          <p className="chapter-content__error-header">
            Not valid CSV, errors found:
          </p>
          <div className="chapter-content__error-container">
            {csvErrors.map((error, index) => (
              <div
                key={index}
                className="chapter-content__error"
                onClick={() => handleErrorClick(error.lineNumber)}
                style={{ cursor: "pointer" }}
              >
                <span style={{ fontWeight: "bold" }}>
                  Line {error.lineNumber}:
                </span>{" "}
                <span style={{ fontStyle: "italic" }}>"{error.content}"</span> —{" "}
                {error.message}
              </div>
            ))}
          </div>
        </div>
      );
    }

    const translations = extractRowsFromCSV(chapter.translation);

    return (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>{getLanguageNameFromCode(projectInfo.sourceLanguage)}</th>
            <th>{getLanguageNameFromCode(projectInfo.targetLanguage)}</th>
          </tr>
        </thead>
        <tbody>
          {translations.map((row, index) => (
            <tr key={index}>
              <td>{row.source}</td>
              <td>{row.translation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  if (!chapter) {
    return (
      <>
        <div className="chapter-content">
          <div className="chapter-content__empty-state">
            Select a chapter to read
          </div>
        </div>
        <div className="chapter-content__info-message">
          Chapter content is not visible. Please rotate your device.
        </div>
      </>
    );
  }

  return (
    <>
      <div className="chapter-content">
        <HeaderChapter
          chapter={chapter}
          isRenaming={isRenaming}
          setIsRenaming={setIsRenaming}
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          viewTranslation={viewTranslation}
          setViewTranslation={setViewTranslation}
          editMode={editMode}
          setEditMode={setEditMode}
          handleRenameSubmit={handleRenameSubmit}
          handleMoveUp={handleMoveUp}
          handleMoveDown={handleMoveDown}
          handleDelete={handleDelete}
          handleRevert={handleRevert}
          handleSave={handleSave}
          handleCancel={handleCancel}
        />
        <div
          className="chapter-content__scroll-container"
          ref={chapterContentRef}
        >
          {editMode ? (
            <textarea
              ref={editorRef}
              className="chapter-content__editor"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
            />
          ) : viewTranslation ? (
            renderTranslationTable()
          ) : (
            <div className="chapter-content__text">{chapter.content}</div>
          )}
        </div>
        <ConfirmationDialogModal
          showDialog={showDeleteDialog}
          dialogTitle="Delete Chapter"
          dialogText={`Are you sure you want to delete "${chapter.title}"? This action cannot be undone.`}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />
      </div>
      <div className="chapter-content__info-message">
        Chapter content is not visible. Please rotate your device.
      </div>
    </>
  );
}

export default ChapterContent;
