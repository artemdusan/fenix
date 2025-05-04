import React, { useEffect, useState, useRef } from "react";
import { useEditorContext } from "../../context/EditorContext";
import BookMetadataModal from "./BookMetadataModal";
import ConfirmationDialogModal from "../common/ConfirmationDialogModal";
import SaveBookModal from "./SaveBookModal";
import { Link } from "react-router-dom";
import {
  clearDatabase,
  CURRENT_PROJECT_ID,
  CURRENT_SCREEN,
  saveToIndexedDB,
  SETTINGS_STORE,
} from "../../services/editor/databaseService";
import { FiEdit, FiLink, FiInfo, FiChevronDown } from "react-icons/fi";
import { IoIosArrowBack } from "react-icons/io";
import { FiBook } from "react-icons/fi";
import { LuFileJson } from "react-icons/lu";
import { FaRegSave } from "react-icons/fa";
import "./styles/HeaderEditor.css";
import {
  getNumberOfChapters,
  loadChaptersFromDB,
  saveChaptersToDB,
} from "../../services/editor/chapterService";
import {
  Screen,
  JsonBook,
  ChapterData,
  ProjectMetadata,
} from "../../services/editor/types";
import { processEpubChapters } from "../../services/editor/epubService";
import ePub from "epubjs";

const HeaderEditor: React.FC = () => {
  const {
    projectInfo,
    chapters,
    setChapters,
    setProjectInfo,
    selectedChapters,
    setCurrentScreen,
    showToast,
  } = useEditorContext();
  const [showMetadataModal, setShowMetadataModal] = useState<boolean>(false);
  const [showNewProjectDialog, setShowNewProjectDialog] =
    useState<boolean>(false);
  const [showSaveBookModal, setShowSaveBookModal] = useState<boolean>(false);
  const [numberOfChapters, setNumberOfChapters] = useState<number>(0);
  const [showProjectMenu, setShowProjectMenu] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const epubInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (projectInfo) {
      const fetchNumberOfChapters = async () => {
        const n = await getNumberOfChapters(projectInfo.id);
        setNumberOfChapters(n);
      };
      fetchNumberOfChapters();
    }
  }, [projectInfo, chapters]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProjectMenu(false);
      }
    };

    if (showProjectMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProjectMenu]);

  const handleNewProject = async (): Promise<void> => {
    console.log("New Project");
    await saveToIndexedDB(SETTINGS_STORE, {
      id: CURRENT_PROJECT_ID,
      value: "",
    });
    await saveToIndexedDB(SETTINGS_STORE, {
      id: CURRENT_SCREEN,
      value: Screen.EDITOR,
    });
    setProjectInfo(null);
    setShowProjectMenu(false);
  };

  const handleOpenProject = (): void => {
    setShowProjectMenu(false);
  };

  const handleAddEpub = (): void => {
    if (epubInputRef.current) {
      epubInputRef.current.click();
    }
    setShowProjectMenu(false);
  };

  const handleAddJson = (): void => {
    if (jsonInputRef.current) {
      jsonInputRef.current.click();
    }
    setShowProjectMenu(false);
  };

  const handleSaveBook = (): void => {
    console.log("Save Book");
    setShowSaveBookModal(true);
    setShowProjectMenu(false);
  };

  // In HeaderEditor.jsx, update these functions:

  const handleEpubFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile || !selectedFile.name.endsWith(".epub")) return;
    const arrayBuffer = await selectedFile.arrayBuffer();
    const book = ePub(arrayBuffer);
    await book.loaded.metadata;
    await book.ready;
    const startingIndex = await getNumberOfChapters(projectInfo.id);

    await processEpubChapters(projectInfo.id, book, startingIndex);
    const updatedChapters = await loadChaptersFromDB(projectInfo.id);
    setChapters(updatedChapters);
    console.log("Book added");
    showToast("EPUB book added successfully", "success", 3000); // Add success toast
    event.target.value = ""; // Reset input
  };

  const handleJsonFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile || !selectedFile.name.endsWith(".json")) return;

    try {
      const text = await selectedFile.text();
      const jsonBook: JsonBook = JSON.parse(text);

      // Validate the JSON structure
      if (!jsonBook.chapters || !Array.isArray(jsonBook.chapters)) {
        showToast("Invalid JSON book format: Missing or invalid chapters");
        return;
      }

      // Convert JsonBook chapters to ChapterData format
      const startingIndex = await getNumberOfChapters(projectInfo.id);
      const newChapters: ChapterData[] = jsonBook.chapters.map(
        (jsonChapter, index) => {
          const content = jsonChapter.content
            .map((row) => `${row.source}`)
            .join(" ");
          const translations = jsonChapter.content
            .map((row) => `"${row.source}","${row.translation}"`)
            .join("\n");
          return {
            id: crypto.randomUUID(),
            projectID: projectInfo.id,
            title: jsonChapter.title,
            content,
            originalContent: content,
            translation: translations,
            originalTranslation: translations,
            isEdited: false,
            isTranslationEdited: false,
            index: startingIndex + index,
          };
        }
      );

      // Merge with existing chapters and save to DB
      const updatedChapters: ChapterData[] = [...chapters, ...newChapters];
      await saveChaptersToDB(projectInfo.id, updatedChapters);
      setChapters(updatedChapters);
      console.log("JSON book added successfully");
      showToast("JSON book added successfully", "success", 3000); // Add success toast

      // Optionally update project metadata if provided in JSON
      if (
        jsonBook.title ||
        jsonBook.author ||
        jsonBook.cover ||
        jsonBook.notes
      ) {
        setProjectInfo({
          ...projectInfo,
          title: jsonBook.title || projectInfo.title,
          author: jsonBook.author || projectInfo.author,
          coverBase64: jsonBook.cover || projectInfo.coverBase64,
          notes: jsonBook.notes || projectInfo.notes,
        });
      }
    } catch (error) {
      showToast("Failed to process JSON file:" + error);
    } finally {
      event.target.value = ""; // Reset input
    }
  };

  return (
    <header className="editor-header">
      <div className="editor-header__content">
        <div className="editor-header__actions">
          <div className="editor-header__project-menu" ref={menuRef}>
            <button
              className="editor-header__button"
              onClick={() => setShowProjectMenu(!showProjectMenu)}
            >
              Actions
              <FiChevronDown size={18} />
            </button>
            {showProjectMenu && (
              <div className="editor-header__dropdown">
                <Link to="/fenix" className="editor-header__dropdown-item">
                  {" "}
                  <IoIosArrowBack size={18} />
                  Back to Library
                </Link>
                <button
                  className="editor-header__dropdown-item"
                  onClick={handleNewProject}
                  title="Create a new project"
                >
                  <FiEdit size={18} /> Manage Projects
                </button>
                <button
                  className="editor-header__dropdown-item"
                  onClick={handleAddEpub}
                  title="Add an EPUB file"
                >
                  <FiBook size={18} /> Add Epub
                </button>
                <button
                  className="editor-header__dropdown-item"
                  onClick={handleAddJson}
                  title="Add a JSON file"
                >
                  <LuFileJson size={18} /> Add Json
                </button>
                <button
                  className="editor-header__dropdown-item"
                  onClick={handleSaveBook}
                  title="Save the book"
                >
                  <FaRegSave size={18} /> Save Book
                </button>
              </div>
            )}
          </div>
          <button
            className="editor-header__button"
            onClick={() => setCurrentScreen(Screen.TRANSLATION)}
          >
            <FiLink size={18} />
            Translate {selectedChapters.size}/{numberOfChapters}
          </button>
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

      {/* EPUB File Input */}
      <input
        type="file"
        ref={epubInputRef}
        onChange={handleEpubFileSelect}
        accept=".epub"
        style={{ display: "none" }}
      />

      {/* JSON File Input */}
      <input
        type="file"
        ref={jsonInputRef}
        onChange={handleJsonFileSelect}
        accept=".json"
        style={{ display: "none" }}
      />

      <BookMetadataModal
        isOpen={showMetadataModal}
        bookData={projectInfo}
        isNewBook={false}
        onClose={() => setShowMetadataModal(false)}
      />

      <ConfirmationDialogModal
        dialogTitle="Start New Project?"
        dialogText={`This will remove the current book from the database. Your changes will be lost. 
          Are you sure you want to continue?`}
        onCancel={() => setShowNewProjectDialog(false)}
        showDialog={showNewProjectDialog}
        onConfirm={async () => {
          try {
            await clearDatabase();
            setProjectInfo(null);
          } catch (error) {
            showToast("Failed to clear project:" + error);
            alert("Failed to clear project. Please try again.");
          } finally {
            setShowNewProjectDialog(false);
          }
        }}
      />

      <SaveBookModal
        isVisible={showSaveBookModal}
        onClose={() => setShowSaveBookModal(false)}
        onDownload={() => {}}
      />
    </header>
  );
};

export default HeaderEditor;
