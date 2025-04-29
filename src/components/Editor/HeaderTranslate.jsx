// HeaderTranslate.jsx
import React from "react";
import { useState, useEffect } from "react";
import { useEditorContext } from "../../context/EditorContext";
import { FiArrowLeft, FiKey, FiInfo } from "react-icons/fi";
import ApiKeyModal from "./ApiKeyModal";
import BookMetadataModal from "./BookMetadataModal";
import { getNumberOfChapters } from "../../services/editor/chapterService";
import "./styles/HeaderEditor.css";
import { Screen } from "../../services/editor/types";

function HeaderTranslate() {
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const { projectInfo, selectedChapters, setCurrentScreen, SCREEN } =
    useEditorContext();

  const [numberOfChapters, setNumberOfChapters] = useState(0);

  useEffect(() => {
    console.log("number of chapters......");
    if (projectInfo) {
      setNumberOfChapters(getNumberOfChapters(projectInfo.id));
    }
  }, [projectInfo]);

  return (
    <header className="editor-header">
      <div className="editor-header__content">
        <div className="editor-header__actions">
          <button
            className="editor-header__button"
            onClick={() => setCurrentScreen(Screen.EDITOR)}
          >
            <FiArrowLeft size={18} />
            Back
          </button>
          <button
            className="editor-header__button"
            onClick={() => setShowApiKeyModal(true)}
          >
            <FiKey size={18} />
            Api Key
          </button>
          <div className="editor-header__selected-count">
            {selectedChapters.size}/{numberOfChapters}
          </div>
        </div>
        <button
          className="editor-header__button"
          onClick={() => setShowMetadataModal(true)}
          title="Show Book Details"
        >
          <FiInfo size={18} />
          <div className="editor-header__book-info">
            <span className="editor-header__book-title">
              {projectInfo.title}
            </span>
          </div>
        </button>
      </div>
      {/* modals */}
      <ApiKeyModal
        isVisible={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
      />
      <BookMetadataModal
        isOpen={showMetadataModal}
        bookData={projectInfo}
        isNewBook={false}
        onClose={() => setShowMetadataModal(false)}
      />
    </header>
  );
}

export default HeaderTranslate;
