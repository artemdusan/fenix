import React, { useState, useEffect } from "react";
import { getLanguageNameFromCode } from "../../services/editor/utils";
import { blobToBase64 } from "../../services/editor/utils";
import { languages } from "../../constants";
import { processEpubBook } from "../../services/editor/epubService";
import { useEditorContext } from "../../context/EditorContext";
import {
  PROJECTS_STORE,
  SETTINGS_STORE,
  saveToIndexedDB,
  CURRENT_PROJECT_ID,
} from "../../services/editor/databaseService";
import "./styles/BookMetadataModal.css";
import { Language, ProjectMetadata } from "../../services/editor/types";

interface BookMetadataModalProps {
  isOpen?: boolean;
  bookData?: any & { notes?: string };
  isNewBook?: boolean;
  onClose?: () => void;
}

const BookMetadataModal: React.FC<BookMetadataModalProps> = ({
  isOpen = false,
  bookData = null,
  isNewBook = false,
  onClose = () => {},
}) => {
  const [title, setTitle] = useState<string>("");
  const [author, setAuthor] = useState<string>("");
  const [notes, setNotes] = useState<string>(""); // Added notes state
  const [sourceLanguage, setSourceLanguage] = useState<string>("en");
  const [targetLanguage, setTargetLanguage] = useState<string>("es");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const { setProjectInfo } = useEditorContext();

  // Initialize state when the modal opens or bookData changes
  useEffect(() => {
    if (isOpen && bookData && !initialized) {
      setTitle(bookData.title || "");
      setAuthor(bookData.author || "");
      setNotes(bookData.notes || ""); // Initialize notes
      setSourceLanguage(bookData.sourceLanguage || "en");
      setTargetLanguage(bookData.targetLanguage || "es");
      setCoverPreview(bookData.coverBase64 || null);
      setIsEditing(isNewBook);
      setInitialized(true);
    } else if (!isOpen) {
      // Reset state when modal closes
      setTitle("");
      setAuthor("");
      setNotes(""); // Reset notes
      setSourceLanguage("en");
      setTargetLanguage("es");
      setIsEditing(false);
      setInitialized(false);
      setCoverFile(null);
      setCoverPreview(null);
    }

    if (isOpen && bookData === null && isNewBook && !initialized) {
      setTitle("Untitled Project");
      setAuthor("Author");
      setNotes(""); // Initialize notes for new book
      setSourceLanguage("en");
      setTargetLanguage("es");
      setIsEditing(true);
      setInitialized(true);
    }
  }, [isOpen, bookData, isNewBook]);

  // Handle cover image upload with blobToBase64
  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      try {
        const base64String = await blobToBase64(file);
        setCoverPreview(base64String);
      } catch (error) {
        console.error("Failed to convert image to Base64:", error);
        alert("Failed to process the cover image. Please try again.");
      }
    }
  };

  const handleSave = async (): Promise<void> => {
    try {
      if (bookData) {
        bookData.title = title;
        bookData.author = author;
        bookData.notes = notes; // Save notes
        bookData.sourceLanguage = sourceLanguage;
        bookData.targetLanguage = targetLanguage;
        if (coverPreview) {
          bookData.coverBase64 = coverPreview;
        }

        if (isNewBook) {
          const response = await processEpubBook(bookData);
          setProjectInfo(response.bookInfo);
        } else {
          await saveToIndexedDB(PROJECTS_STORE, bookData);
          setProjectInfo(bookData);
        }
      } else if (bookData === null && isNewBook) {
        const emptyProject: ProjectMetadata = {
          id: crypto.randomUUID(),
          title: title,
          author: author,
          notes: notes, // Include notes
          coverBase64: coverPreview,
          sourceLanguage: sourceLanguage,
          targetLanguage: targetLanguage,
        };
        await saveToIndexedDB(PROJECTS_STORE, emptyProject);
        await saveToIndexedDB(SETTINGS_STORE, {
          id: CURRENT_PROJECT_ID,
          value: emptyProject.id,
        });
        setProjectInfo(emptyProject);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save book metadata:", error);
      alert("Failed to save book metadata. Please try again.");
    }
  };

  const handleClose = (): void => {
    onClose();
  };

  const toggleEditMode = (): void => {
    setIsEditing(!isEditing);
  };

  return isOpen ? (
    <div className="book-metadata-modal__overlay" onClick={handleClose}>
      <div
        className="book-metadata-modal__container book-metadata-modal__container--large"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <h3 className="book-metadata-modal__title">
          {isNewBook ? "New Book Details" : "Book Details"}
        </h3>
        <div className="book-metadata-modal__content">
          <div className="book-metadata-modal__cover-section">
            {coverPreview ? (
              <img
                src={coverPreview}
                alt="Book cover"
                className="book-metadata-modal__cover-preview"
              />
            ) : (
              <div className="book-metadata-modal__cover-placeholder">
                No cover available
              </div>
            )}
            {isEditing && (
              <div className="book-metadata-modal__cover-upload">
                <input
                  type="file"
                  accept="image/*"
                  id="cover-upload"
                  style={{ display: "none" }}
                  onChange={handleCoverChange}
                />
                <label
                  htmlFor="cover-upload"
                  className="book-metadata-modal__button book-metadata-modal__button--upload"
                >
                  Change Cover
                </label>
              </div>
            )}
          </div>

          <div className="book-metadata-modal__details-section">
            <div className="book-metadata-modal__field">
              <label
                htmlFor="book-title"
                className="book-metadata-modal__field-label"
              >
                Title:
              </label>
              {isEditing ? (
                <input
                  id="book-title"
                  type="text"
                  value={title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setTitle(e.target.value)
                  }
                  className="book-metadata-modal__input"
                />
              ) : (
                <div className="book-metadata-modal__static-value">{title}</div>
              )}
            </div>

            <div className="book-metadata-modal__field">
              <label
                htmlFor="book-author"
                className="book-metadata-modal__field-label"
              >
                Author:
              </label>
              {isEditing ? (
                <input
                  id="book-author"
                  type="text"
                  value={author}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAuthor(e.target.value)
                  }
                  className="book-metadata-modal__input"
                />
              ) : (
                <div className="book-metadata-modal__static-value">
                  {author}
                </div>
              )}
            </div>

            <div className="book-metadata-modal__field">
              <label
                htmlFor="book-notes"
                className="book-metadata-modal__field-label"
              >
                Notes:
              </label>
              {isEditing ? (
                <textarea
                  id="book-notes"
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNotes(e.target.value)
                  }
                  className="book-metadata-modal__input"
                  rows={4}
                  placeholder="Enter notes about the book..."
                />
              ) : (
                <div className="book-metadata-modal__static-value">
                  {notes || "No notes available"}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="book-metadata-modal__language-section">
          <h4 className="book-metadata-modal__language-heading">
            Language Settings
          </h4>
          <div className="book-metadata-modal__language-row">
            <div className="book-metadata-modal__language-column">
              <label
                htmlFor="book-source-lang"
                className="book-metadata-modal__field-label"
              >
                Source Language:
              </label>
              {isEditing ? (
                <select
                  id="book-source-lang"
                  className="book-metadata-modal__language-select"
                  value={sourceLanguage}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setSourceLanguage(e.target.value)
                  }
                >
                  {languages.map((lang: Language) => (
                    <option key={`book-source-${lang.code}`} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="book-metadata-modal__static-value">
                  {getLanguageNameFromCode(sourceLanguage)}
                </div>
              )}
            </div>

            <div className="book-metadata-modal__language-column">
              <label
                htmlFor="book-target-lang"
                className="book-metadata-modal__field-label"
              >
                Target Language:
              </label>
              {isEditing ? (
                <select
                  id="book-target-lang"
                  className="book-metadata-modal__language-select"
                  value={targetLanguage}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setTargetLanguage(e.target.value)
                  }
                >
                  {languages.map((lang: Language) => (
                    <option key={`book-target-${lang.code}`} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="book-metadata-modal__static-value">
                  {getLanguageNameFromCode(targetLanguage)}
                </div>
              )}
            </div>
          </div>
          {isEditing && (
            <p className="book-metadata-modal__language-note">
              These settings will be used for translation.
            </p>
          )}
        </div>

        <div className="book-metadata-modal__actions">
          <button
            className="book-metadata-modal__button book-metadata-modal__button--cancel"
            onClick={handleClose}
          >
            {isEditing ? "Cancel" : "Close"}
          </button>
          {!isNewBook && !isEditing && (
            <button
              className="book-metadata-modal__button book-metadata-modal__button--edit"
              onClick={toggleEditMode}
            >
              Edit
            </button>
          )}
          {isEditing && (
            <button
              className="book-metadata-modal__button book-metadata-modal__button--confirm"
              onClick={handleSave}
            >
              {isNewBook ? "Continue" : "Save Changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  ) : null;
};

export default BookMetadataModal;
