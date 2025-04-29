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
    >
      <FaArrowLeft />
    </button>
    <button className="navigation-buttons__play" onClick={onPlay}>
      {isPlaying ? <FaPause /> : <FaPlay />}
    </button>
    <button
      className="navigation-buttons__sentence-nav"
      onClick={onNext}
      disabled={disabled}
    >
      <FaArrowRight />
    </button>
  </div>
);

export default NavigationButtons;
