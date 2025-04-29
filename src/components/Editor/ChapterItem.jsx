import React, { useState, useEffect, useRef } from "react";
import "./styles/ChapterItem.css";
import { GoDotFill } from "react-icons/go";
import { isValidTranslationCsv } from "../../services/editor/translationService";

const ChapterItem = React.forwardRef(
  ({ chapter, isSelected, isChecked, onSelect, onToggle }, ref) => {
    const handleClick = (e) => {
      onSelect(e);
    };

    return (
      <div
        ref={ref}
        id={`chapter-${chapter.id}`}
        className={`chapter-item ${isSelected ? "chapter-item--selected" : ""}`}
        onClick={handleClick}
        tabIndex={0}
      >
        <div className="chapter-item__main">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="chapter-item__info">
            <span className="chapter-item__title">
              {chapter.title}
              {chapter.isEdited && chapter.originalContent && <span>*</span>}
            </span>
            <div className="chapter-item__actions">
              {chapter.translation &&
              isValidTranslationCsv(chapter.translation) ? (
                <span
                  className="chapter-item__translation-marker"
                  title="Translation Available"
                >
                  <GoDotFill />
                </span>
              ) : (
                <span
                  className="chapter-item__error-marker"
                  title="No Translation"
                >
                  <GoDotFill />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default ChapterItem;
