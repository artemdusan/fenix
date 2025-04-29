import React, { forwardRef } from "react";
import "./styles/SentenceSlider.css";

const SentenceSlider = forwardRef(
  ({ currentSentence, sentenceCount, onSentenceChange, isPlaying }, ref) => (
    <div className="sentence-slider__container" ref={ref}>
      <div className="sentence-slider__header">
        <button
          className="sentence-slider__button"
          onClick={() => onSentenceChange(Math.max(currentSentence - 1, 0))}
          disabled={isPlaying}
        >
          -
        </button>
        <span>Strona: {currentSentence + 1}</span>
        <button
          className="sentence-slider__button"
          onClick={() =>
            onSentenceChange(Math.min(currentSentence + 1, sentenceCount - 1))
          }
          disabled={isPlaying}
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
      />
    </div>
  )
);

export default SentenceSlider;
