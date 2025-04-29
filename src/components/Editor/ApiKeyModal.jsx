// ApiKeyModal.jsx
import React, { useEffect } from "react";
import "./styles/ApiKeyModal.css";
import { useEditorContext } from "../../context/EditorContext";
import { saveApiKeyToDb } from "../../services/editor/translationService";

const ApiKeyModal = ({ isVisible, onClose }) => {
  const [tempApiKey, setTempApiKey] = React.useState("");
  const { apiKey, setApiKey } = useEditorContext();

  useEffect(() => {
    let isMounted = true;
    if (apiKey) {
      setTempApiKey(apiKey);
    }
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setTempApiKey(apiKey);
  }, [apiKey]);

  if (!isVisible) return null;

  const handleInputChange = (e) => {
    setTempApiKey(e.target.value);
  };

  const handleSaveApiKey = () => {
    console.log("Saving API key:", tempApiKey);
    saveApiKeyToDb(tempApiKey)
      .then(() => {
        setApiKey(tempApiKey);
        onClose();
      })
      .catch((error) => console.error("Failed to save API key:", error));
  };

  return (
    <div className="api-key-modal__overlay" onClick={() => onClose()}>
      <div
        className="api-key-modal__container"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="api-key-modal__title">OpenAI API Key</h3>
        <div className="api-key-modal__content">
          <p>
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="api-key-modal__link"
            >
              Get API Key
            </a>
          </p>
          <input
            type="password"
            className="api-key-modal__input"
            value={tempApiKey}
            onChange={handleInputChange}
            placeholder="Paste your OpenAI API key here"
          />
          <p className="api-key-modal__note">
            Note: Your API key is stored locally. Disable it after use.
          </p>
        </div>
        <div className="api-key-modal__actions">
          <button
            className="api-key-modal__button api-key-modal__button--cancel"
            onClick={() => {
              setTempApiKey(apiKey);
              onClose();
            }}
          >
            Cancel
          </button>
          <button
            className="api-key-modal__button api-key-modal__button--confirm"
            onClick={handleSaveApiKey}
          >
            Save API Key
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
