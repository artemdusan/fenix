import React from "react";
import { FaArrowLeft, FaMinus, FaPlus, FaExpand, FaCog } from "react-icons/fa";
import "./styles/StatusBar.css";

const StatusBar = ({
  book,
  navigate,
  toggleChapterSlider,
  toggleSentenceSlider,
  chapterCount,
  currentChapter,
  sentenceCount,
  currentSentence,
  increaseFontSize,
  decreaseFontSize,
  toggleTtsSettings,
}) => (
  <div className="status-bar">
    <button
      className="status-bar__icon-button"
      onClick={() => {
        speechSynthesis.cancel();
        document.fullscreenElement
          ? document.exitFullscreen().then(() => navigate("/"))
          : navigate("/");
      }}
    >
      <FaArrowLeft />
    </button>
    <span className="status-bar__info">
      <span className="status-bar__info-label">{book?.title} | </span>
      <span className="status-bar__info-label">Rozdział: </span>
      <span
        onClick={toggleChapterSlider}
        className="status-bar__chapter-toggle"
      >
        {currentChapter}/{chapterCount}
      </span>
      {" | "}
      <span className="status-bar__info-label"> Strona: </span>
      <span
        onClick={toggleSentenceSlider}
        className="status-bar__sentence-toggle"
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
      >
        <FaExpand />
      </button>
      <button className="status-bar__icon-button" onClick={decreaseFontSize}>
        <FaMinus />
      </button>
      <button className="status-bar__icon-button" onClick={increaseFontSize}>
        <FaPlus />
      </button>
      <button className="status-bar__icon-button" onClick={toggleTtsSettings}>
        <FaCog />
      </button>
    </div>
  </div>
);

export default StatusBar;
