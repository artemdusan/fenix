import React from "react";
import { FaArrowLeft, FaArrowRight, FaPlay, FaPause } from "react-icons/fa";
import "./styles/NavigationButtons.css";

const NavigationButtons = ({
  onPrevious,
  onNext,
  onPlay,
  isPlaying,
  disabled,
}) => (
  <div className="navigation-buttons">
    <button
      className="navigation-buttons__sentence-nav"
      onClick={onPrevious}
      disabled={disabled}
      aria-label="Previous page"
      title="Previous"
    >
      <FaArrowLeft />
    </button>
    <button
      className="navigation-buttons__play"
      onClick={onPlay}
      aria-label={isPlaying ? "Pause reading" : "Play reading"}
      title={isPlaying ? "Pause" : "Play"}
    >
      {isPlaying ? <FaPause /> : <FaPlay />}
    </button>
    <button
      className="navigation-buttons__sentence-nav"
      onClick={onNext}
      disabled={disabled}
      aria-label="Next page"
      title="Next"
    >
      <FaArrowRight />
    </button>
  </div>
);

export default NavigationButtons;
