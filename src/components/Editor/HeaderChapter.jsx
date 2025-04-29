import React, { useRef, useEffect } from "react";
import {
  FaTrash,
  FaArrowUp,
  FaArrowDown,
  FaEdit,
  FaCheck,
} from "react-icons/fa";
import "./styles/HeaderChapter.css";

function HeaderChapter({
  chapter,
  isRenaming,
  setIsRenaming,
  newTitle,
  setNewTitle,
  viewTranslation,
  setViewTranslation,
  editMode,
  setEditMode,
  handleRenameSubmit,
  handleMoveUp,
  handleMoveDown,
  handleDelete,
  handleRevert,
  handleSave,
  handleCancel,
}) {
  const renameFormRef = useRef(null);
  const inputRef = useRef(null);

  // Handle click outside to exit renaming mode
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isRenaming &&
        renameFormRef.current &&
        !renameFormRef.current.contains(event.target)
      ) {
        setIsRenaming(false);
        setNewTitle("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isRenaming, setIsRenaming, setNewTitle]);

  // Focus and select input when renaming starts
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const startRenaming = () => {
    setIsRenaming(true);
    setNewTitle(chapter.title);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleRenameSubmit();
    }
  };

  if (!chapter) return null;

  return (
    <div className="chapter-content__header">
      <div className="chapter-content__title-section">
        {isRenaming ? (
          <div ref={renameFormRef} className="chapter-content__rename-form">
            <input
              ref={inputRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="chapter-content__rename-input"
            />
            <button
              className="chapter-content__icon-button chapter-content__icon-button--accept"
              onClick={handleRenameSubmit}
              title="Accept"
            >
              <FaCheck />
            </button>
          </div>
        ) : (
          <>
            <span className="chapter-content__filename">{chapter.title}</span>
            <div className="chapter-content__title-actions">
              <button
                className="chapter-content__icon-button"
                onClick={startRenaming}
                title="Rename"
              >
                <FaEdit />
              </button>
              <button
                className="chapter-content__icon-button"
                onClick={handleMoveUp}
                title="Move Up"
              >
                <FaArrowUp />
              </button>
              <button
                className="chapter-content__icon-button"
                onClick={handleMoveDown}
                title="Move Down"
              >
                <FaArrowDown />
              </button>
              <button
                className="chapter-content__icon-button"
                onClick={handleDelete}
                title="Delete"
              >
                <FaTrash />
              </button>
            </div>
          </>
        )}
        {!editMode && (
          <button
            className="chapter-content__button chapter-content__button--toggle"
            onClick={() => setViewTranslation(!viewTranslation)}
          >
            {viewTranslation ? "Translation" : "Source"}
          </button>
        )}
      </div>
      <div className="chapter-content__actions">
        {((viewTranslation &&
          chapter.isTranslationEdited &&
          chapter.originalTranslation) ||
          (!viewTranslation && chapter.isEdited && chapter.originalContent)) &&
          !editMode && (
            <button
              className="chapter-content__button chapter-content__button--revert"
              onClick={handleRevert}
            >
              Revert Changes
            </button>
          )}
        {!editMode ? (
          <button
            className="chapter-content__button chapter-content__button--edit"
            onClick={() => setEditMode(true)}
          >
            Edit
          </button>
        ) : (
          <>
            <button
              className="chapter-content__button chapter-content__button--save"
              onClick={handleSave}
            >
              Save
            </button>
            <button
              className="chapter-content__button chapter-content__button--cancel"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default HeaderChapter;
