import React, { forwardRef } from "react";
import { FaTimes } from "react-icons/fa";
import "./styles/SentenceSlider.css";

const SentenceSlider = forwardRef(
  (
    { currentSentence, sentenceCount, onSentenceChange, isPlaying, onClose },
    ref
  ) => (
    <div className="sentence-slider__container" ref={ref}>
      <div className="sentence-slider__header">
        <button
          className="sentence-slider__button"
          onClick={() => onSentenceChange(Math.max(currentSentence - 1, 0))}
          disabled={isPlaying}
          aria-label="Previous page"
        >
          -
        </button>
        <span>Page: {currentSentence + 1}</span>
        <button
          className="sentence-slider__button"
          onClick={() =>
            onSentenceChange(Math.min(currentSentence + 1, sentenceCount - 1))
          }
          disabled={isPlaying}
          aria-label="Next page"
        >
          +
        </button>
      </div>
      <input
        className="sentence-slider__input"
        type="range"
        min="0"
        max={sentenceCount - 1}
        value={currentSentence}
        onChange={(e) => onSentenceChange(parseInt(e.target.value))}
        disabled={isPlaying}
        aria-label={`Select page ${currentSentence + 1} of ${sentenceCount}`}
      />
    </div>
  )
);

export default SentenceSlider;
