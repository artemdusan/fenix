import React, { useState, useEffect, useRef } from "react";
import {
  loadChaptersFromDB,
  saveCurrentChapter,
  getCurrentChapter,
  getSelectedChapters,
  saveSelectedChapters,
} from "../../services/editor/chapterService"; // Removed unused imports
import ChapterItem from "./ChapterItem";
import { useEditorContext } from "../../context/EditorContext";
import { FaPlus } from "react-icons/fa";
import "./styles/ChapterList.css";
import {
  CHAPTERS_STORE,
  saveToIndexedDB,
} from "../../services/editor/databaseService";

function ChapterList() {
  const [projectId, setProjectId] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const currentChapterRef = useRef(null);
  const {
    projectInfo,
    currentChapterId,
    setCurrentChapterId,
    selectedChapters,
    setSelectedChapters,
    chapters,
    setChapters,
  } = useEditorContext();

  useEffect(() => {
    initComponent();
  }, []);

  const initComponent = async () => {
    setProjectId(projectInfo.id);

    const chapters = await loadChaptersFromDB(projectInfo.id);
    setChapters(chapters);

    const selectedChaptersArray = await getSelectedChapters(projectInfo.id);
    setSelectedChapters(selectedChaptersArray);

    const currentChapterId = await getCurrentChapter(projectInfo.id);
    setCurrentChapterId(currentChapterId);

    setIsInitialized(true);
  };

  const scrollToItem = () => {
    try {
      if (!currentChapterRef && !currentChapterRef.current) return;
      currentChapterRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    } catch (error) {
      console.log("Error while scrolling to item:", error);
    }
  };

  useEffect(() => {
    scrollToItem();
  }, [chapters]);

  useEffect(() => {
    if (isInitialized && currentChapterId && currentChapterRef.current) {
      scrollToItem();
    }
  }, [isInitialized, currentChapterId]);

  const handleToggleChapter = async (chapterId) => {
    const newSelectedChapters = new Set(selectedChapters);
    if (newSelectedChapters.has(chapterId)) {
      newSelectedChapters.delete(chapterId);
    } else {
      newSelectedChapters.add(chapterId);
    }
    setSelectedChapters(newSelectedChapters);
    await saveSelectedChapters(projectInfo.id, newSelectedChapters);
  };

  const handleToggleSelectAll = async (event) => {
    const isChecked = event.target.checked;
    let newSelectedChapters;
    if (isChecked) {
      newSelectedChapters = new Set(chapters.map((chapter) => chapter.id));
    } else {
      newSelectedChapters = new Set();
    }
    setSelectedChapters(newSelectedChapters);
    await saveSelectedChapters(projectInfo.id, newSelectedChapters);
  };

  const handleSelectChapter = async (chapter) => {
    setCurrentChapterId(chapter.id);
    if (projectId) {
      await saveCurrentChapter(projectId, chapter.id);
    }
  };

  const handleAddChapter = () => {
    const newChapter = {
      id: crypto.randomUUID(),
      title: `New Chapter ${chapters.length + 1}`,
      isEdited: false,
      translatedContent: false,
      projectID: projectId,
      index: chapters.length,
    };
    const updatedChapters = [...chapters, newChapter];
    setChapters(updatedChapters);
    setCurrentChapterId(newChapter.id);
    saveToIndexedDB(CHAPTERS_STORE, newChapter);
    saveCurrentChapter(projectId, newChapter.id);
    console.log("Added dummy chapter:", newChapter);
  };

  return (
    <div className="chapter-list">
      <div className="chapter-list__header">
        <div className="chapter-list__title-group">
          <input
            type="checkbox"
            className="chapter-list__select-all"
            checked={
              selectedChapters.size === chapters.length && chapters.length > 0
            }
            onChange={handleToggleSelectAll}
          />
          <h2 className="chapter-list__header-title">Chapters</h2>
        </div>
        <button
          className="chapter-list__add-button"
          onClick={handleAddChapter}
          title="Add Chapter"
        >
          <FaPlus />
        </button>
      </div>
      <div className="chapter-list__content">
        {chapters.length > 0 ? (
          chapters.map((chapter) => (
            <ChapterItem
              key={chapter.id}
              chapter={chapter}
              isSelected={currentChapterId === chapter.id}
              isChecked={Array.from(selectedChapters).includes(chapter.id)}
              onSelect={() => handleSelectChapter(chapter)}
              onToggle={() => handleToggleChapter(chapter.id)}
              ref={chapter.id === currentChapterId ? currentChapterRef : null}
            />
          ))
        ) : (
          <div className="chapter-list__empty">No chapters found</div>
        )}
      </div>
    </div>
  );
}

export default ChapterList;
