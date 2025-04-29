import React from "react";
import "./styles/SettingsModal.css";

const SettingsModal = ({
  show,
  voices,
  sourceVoice,
  targetVoice,
  sourceLanguage,
  targetLanguage,
  onChange,
  onClose,
  readingOrder,
  sourceSpeed = 1.0,
  targetSpeed = 1.0,
  sourceEnabled = true,
  targetEnabled = true,
}) => (
  <div
    className={`settings-modal__overlay ${
      show ? "settings-modal__overlay--active" : ""
    }`}
  >
    <div className="settings-modal__container">
      <h3 className="settings-modal__title">Settings</h3>
      <div className="settings-modal__content">
        <div className="settings__option">
          <label className="settings__label">
            <input
              type="checkbox"
              name="sourceEnabled"
              checked={sourceEnabled}
              onChange={onChange}
            />
            Source:
          </label>
          <select
            name="ttsSourceVoice"
            className="settings__select"
            value={sourceVoice}
            onChange={onChange}
          >
            <option value="" disabled>
              Select voice
            </option>
            {voices
              .filter((voice) => voice.lang.startsWith(sourceLanguage))
              .map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
          </select>
          <select
            name="sourceSpeed"
            className="settings__select settings__select--speed"
            value={sourceSpeed}
            onChange={onChange}
          >
            <option value="0.25">0.25x</option>
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1.0">1x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2.0">2x</option>
          </select>
        </div>

        <div className="settings__option">
          <label className="settings__label">
            <input
              type="checkbox"
              name="targetEnabled"
              checked={targetEnabled}
              onChange={onChange}
            />
            Target:
          </label>
          <select
            name="ttsTargetVoice"
            className="settings__select"
            value={targetVoice}
            onChange={onChange}
          >
            <option value="" disabled>
              Select voice
            </option>
            {voices
              .filter((voice) => voice.lang.startsWith(targetLanguage))
              .map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
          </select>
          <select
            name="targetSpeed"
            className="settings__select settings__select--speed"
            value={targetSpeed}
            onChange={onChange}
          >
            <option value="0.25">0.25x</option>
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1.0">1x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2.0">2x</option>
          </select>
        </div>

        <div className="settings__option settings__option--reading-order">
          <label className="settings__label">Order:</label>
          <select
            name="readingOrder"
            className="settings__select"
            value={readingOrder}
            onChange={onChange}
          >
            <option value="source-target">Source → Target</option>
            <option value="target-source">Target → Source</option>
          </select>
        </div>
      </div>
      <div className="settings-modal__actions">
        <button
          className="settings-modal__button settings-modal__button--close"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

export default SettingsModal;
