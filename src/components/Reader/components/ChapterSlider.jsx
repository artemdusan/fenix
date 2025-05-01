import React, { forwardRef } from "react";
import { FaTimes } from "react-icons/fa";
import "./styles/ChapterSlider.css";

const ChapterSlider = forwardRef(
  (
    { currentChapter, chapterCount, onChapterChange, isPlaying, onClose },
    ref
  ) => (
    <div className="chapter-slider__container" ref={ref}>
      <div className="chapter-slider__header">
        <button
          className="chapter-slider__button"
          onClick={() => onChapterChange(Math.max(currentChapter - 1, 0))}
          disabled={isPlaying}
          aria-label="Previous chapter"
        >
          -
        </button>
        <span>Chapter: {currentChapter + 1}</span>
        <button
          className="chapter-slider__button"
          onClick={() =>
            onChapterChange(Math.min(currentChapter + 1, chapterCount - 1))
          }
          disabled={isPlaying}
          aria-label="Next chapter"
        >
          +
        </button>
      </div>
      <input
        className="chapter-slider__input"
        type="range"
        min="1"
        max={chapterCount}
        value={currentChapter + 1}
        onChange={(e) => onChapterChange(e.target.value - 1)}
        disabled={isPlaying}
        aria-label={`Select chapter ${currentChapter + 1} of ${chapterCount}`}
      />
    </div>
  )
);

export default ChapterSlider;
