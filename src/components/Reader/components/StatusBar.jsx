import React from "react";
import { FaArrowLeft, FaMinus, FaPlus, FaExpand, FaCog } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./styles/StatusBar.css";

const StatusBar = ({
  book,
  toggleChapterSlider,
  toggleSentenceSlider,
  chapterCount,
  currentChapter,
  sentenceCount,
  currentSentence,
  increaseFontSize,
  decreaseFontSize,
  toggleTtsSettings,
}) => {
  const navigate = useNavigate();
  return (
    <div className="status-bar">
      <button
        className="status-bar__icon-button"
        onClick={async () => {
          speechSynthesis.cancel();
          if (document.fullscreenElement) {
            await document.exitFullscreen();
          }
          navigate("/");
        }}
        aria-label="Back to library"
        title="Back"
      >
        <FaArrowLeft />
      </button>
      <span className="status-bar__info">
        <span className="status-bar__info-label">{book?.title} | </span>
        <span className="status-bar__info-label">Chapter: </span>
        <span
          onClick={toggleChapterSlider}
          className="status-bar__chapter-toggle"
          role="button"
          tabIndex={0}
          aria-label={`Select chapter ${currentChapter} of ${chapterCount}`}
        >
          {currentChapter}/{chapterCount}
        </span>
        {" | "}
        <span className="status-bar__info-label">Page: </span>
        <span
          onClick={toggleSentenceSlider}
          className="status-bar__sentence-toggle"
          role="button"
          tabIndex={0}
          aria-label={`Select page ${currentSentence} of ${sentenceCount}`}
        >
          {currentSentence}/{sentenceCount}
        </span>
      </span>
      <div className="status-bar__font-size-controls">
        <button
          className="status-bar__icon-button"
          onClick={() =>
            document.fullscreenElement
              ? document.exitFullscreen()
              : document.documentElement.requestFullscreen()
          }
          aria-label="Toggle fullscreen"
          title="Fullscreen"
        >
          <FaExpand />
        </button>
        <button
          className="status-bar__icon-button"
          onClick={decreaseFontSize}
          aria-label="Decrease font size"
          title="Decrease Font"
        >
          <FaMinus />
        </button>
        <button
          className="status-bar__icon-button"
          onClick={increaseFontSize}
          aria-label="Increase font size"
          title="Increase Font"
        >
          <FaPlus />
        </button>
        <button
          className="status-bar__icon-button"
          onClick={toggleTtsSettings}
          aria-label="Open TTS settings"
          title="Settings"
        >
          <FaCog />
        </button>
      </div>
    </div>
  );
};

export default StatusBar;
