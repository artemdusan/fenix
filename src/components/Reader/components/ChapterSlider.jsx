import React, { forwardRef } from "react";
import "./styles/ChapterSlider.css";

const ChapterSlider = forwardRef(
  ({ currentChapter, chapterCount, onChapterChange, isPlaying }, ref) => (
    <div className="chapter-slider__container" ref={ref}>
      <div className="chapter-slider__header">
        <button
          className="chapter-slider__button"
          onClick={() => onChapterChange(Math.max(currentChapter - 1, 0))}
          disabled={isPlaying}
        >
          -
        </button>
        <span>Rozdział: {currentChapter + 1}</span>
        <button
          className="chapter-slider__button"
          onClick={() =>
            onChapterChange(Math.min(currentChapter + 1, chapterCount - 1))
          }
          disabled={isPlaying}
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
      />
    </div>
  )
);

export default ChapterSlider;
