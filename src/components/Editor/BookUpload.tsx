import React, { useRef, useState, useEffect } from "react";
import { FaTrash } from "react-icons/fa";
import { IoCloseSharp } from "react-icons/io5";
import BookMetadataModal from "./BookMetadataModal";
import ConfirmationDialogModal from "../common/ConfirmationDialogModal";
import ePub from "epubjs";
import { blobToBase64 } from "../../services/editor/utils";
import { Link } from "react-router-dom";
import {
  getDBConnection,
  loadFromIndexedDB,
  saveToIndexedDB,
  PROJECTS_STORE,
  SETTINGS_STORE,
  CURRENT_PROJECT_ID,
  CHAPTERS_STORE,
} from "../../services/editor/databaseService";
import {
  ProjectMetadata,
  EpubData,
  JsonBook,
  ChapterData,
} from "../../services/editor/types";
import "./styles/BookUpload.css";
import { useEditorContext } from "../../context/EditorContext";
import {
  saveChaptersToDB,
  getNumberOfChapters,
  loadChaptersFromDB,
} from "../../services/editor/chapterService";

function BookUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] =
    useState<ProjectMetadata | null>(null);
  const [bookData, setBookData] = useState<ProjectMetadata | EpubData | null>(
    null
  );
  const [projects, setProjects] = useState<any[]>([]);
  const { setProjectInfo, chapters, setChapters, showToast } =
    useEditorContext();

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const db = await getDBConnection();
        const transaction = db.transaction([PROJECTS_STORE], "readonly");
        const store = transaction.objectStore(PROJECTS_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
          setProjects(request.result);
        };
      } catch (error) {
        showToast("Error loading projects:" + error);
      }
    };
    loadProjects();
  }, []);

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleJsonUploadClick = () => {
    if (jsonInputRef.current) {
      jsonInputRef.current.click();
    }
  };

  const handleCreateEmptyProject = async () => {
    try {
      setBookData(null);
      setShowMetadataModal(true);
    } catch (error) {
      showToast("Error creating empty project:" + error);
    }
  };

  const handleDeleteProjectClick = (project: ProjectMetadata) => {
    setProjectToDelete(project);
    setShowDeleteDialog(true);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      const db = await getDBConnection();
      const transaction1 = db.transaction([PROJECTS_STORE], "readwrite");
      const transaction2 = db.transaction([CHAPTERS_STORE], "readwrite");
      const projects_store = transaction1.objectStore(PROJECTS_STORE);
      const chapters_store = transaction2.objectStore(CHAPTERS_STORE);
      projects_store.delete(projectToDelete.id);
      const chapterIndex = chapters_store.index("projectID");
      const chapterRequest = chapterIndex.getAllKeys(projectToDelete.id);

      chapterRequest.onsuccess = () => {
        const chapterKeys = chapterRequest.result;
        chapterKeys.forEach((key) => chapters_store.delete(key));
      };

      setProjects(
        projects.filter((project) => project.id !== projectToDelete.id)
      );
      setShowDeleteDialog(false);
      setProjectToDelete(null);
    } catch (error) {
      showToast("Error deleting project:" + error);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setProjectToDelete(null);
  };

  const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith(".epub")) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const book = ePub(arrayBuffer);
      await book.ready;

      const metadata = await book.loaded.metadata;
      const bookId = crypto.randomUUID();
      const title = metadata.title || file.name.replace(".epub", "");
      const author = metadata.creator || "Unknown Author";

      let coverBase64 = null;
      try {
        const coverUrl = await book.coverUrl();
        if (coverUrl) {
          const response = await fetch(coverUrl);
          const blob = await response.blob();
          coverBase64 = await blobToBase64(blob);
        }
      } catch (error) {
        console.log("No cover image found or error converting:", error);
      }

      const bookData = {
        id: bookId,
        title,
        author,
        coverBase64,
        spine: book.spine,
        book,
      };
      setBookData(bookData);
      setShowMetadataModal(true);
    } catch (error) {
      showToast("Error processing EPUB:" + error);
    }
  };

  const onJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith(".json")) return;

    try {
      const text = await file.text();
      const jsonBook: JsonBook = JSON.parse(text);

      // Validate the JSON structure
      if (!jsonBook.chapters || !Array.isArray(jsonBook.chapters)) {
        showToast("Invalid JSON book format: Missing or invalid chapters");
        return;
      }

      const projectId = crypto.randomUUID(); // New project ID
      const projectInfo: ProjectMetadata = {
        id: projectId,
        title: jsonBook.title || file.name.replace(".json", ""),
        author: jsonBook.author || "Unknown Author",
        coverBase64: jsonBook.cover || null,
        notes: jsonBook.notes || "",
        sourceLanguage: jsonBook.sourceLanguage, // Default or could be inferred if provided in JSON
        targetLanguage: jsonBook.targetLanguage, // Default or could be inferred if provided in JSON
      };

      // Convert JsonBook chapters to ChapterData format
      const startingIndex = await getNumberOfChapters(projectId);
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
            projectID: projectId,
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
      const updatedChapters: ChapterData[] = [...newChapters];
      await saveChaptersToDB(projectId, updatedChapters);
      setChapters(updatedChapters);

      // Save project metadata to IndexedDB
      await saveToIndexedDB(PROJECTS_STORE, projectInfo);
      await saveToIndexedDB(SETTINGS_STORE, {
        id: CURRENT_PROJECT_ID,
        value: projectId,
      });
      setProjectInfo(projectInfo);
      setProjects([...projects, projectInfo]); // Update projects list

      console.log("JSON book added successfully");
    } catch (error) {
      showToast("Failed to process JSON file:" + error);
    } finally {
      if (jsonInputRef.current) {
        jsonInputRef.current.value = ""; // Reset input
      }
    }
  };

  const handleOpenProject = async (
    e: React.MouseEvent<HTMLLIElement>,
    project: ProjectMetadata
  ) => {
    e.preventDefault();
    if (!project) return;
    saveToIndexedDB(SETTINGS_STORE, {
      id: CURRENT_PROJECT_ID,
      value: project.id,
    });
    setProjectInfo(project);
  };

  return (
    <div className="book-upload">
      <div className="book-upload__content">
        <h2 className="book-upload__title">Editor</h2>

        <Link to="/" className="book-upload__back-button">
          <IoCloseSharp />
        </Link>

        <div className="book-upload__button-group">
          <button className="book-upload__button" onClick={handleUploadClick}>
            EPUB File
          </button>
          <button
            className="book-upload__button"
            onClick={handleJsonUploadClick}
          >
            JSON File
          </button>
          <button
            className="book-upload__button"
            onClick={handleCreateEmptyProject}
          >
            Empty Project
          </button>
        </div>
        <input
          type="file"
          id="epub-upload"
          accept=".epub"
          onChange={onFileUpload}
          className="book-upload__input"
          ref={fileInputRef}
        />
        <input
          type="file"
          id="json-upload"
          accept=".json"
          onChange={onJsonUpload}
          className="book-upload__input"
          ref={jsonInputRef}
        />
        <div className="book-upload__projects">
          <h3 className="book-upload__projects-heading">Saved Projects</h3>
          {projects.length === 0 ? (
            <p className="book-upload__projects-empty">No projects yet</p>
          ) : (
            <ul className="book-upload__projects-list">
              {projects.map((project) => (
                <li
                  key={project.id}
                  className="book-upload__projects-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenProject(e, project);
                  }}
                >
                  <span>
                    {project.title} - {project.author}
                  </span>
                  <div>
                    <span className="book-upload__projects-date">
                      {project.sourceLanguage} - {project.targetLanguage}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(), handleDeleteProjectClick(project);
                      }}
                      className="book-upload__delete-button"
                      title="Delete project"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <BookMetadataModal
        isOpen={showMetadataModal}
        bookData={bookData}
        isNewBook={true}
        onClose={() => {
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          setShowMetadataModal(false);
        }}
      />
      <ConfirmationDialogModal
        showDialog={showDeleteDialog}
        dialogTitle={`${projectToDelete?.title || ""}-${
          projectToDelete?.author
        }-${projectToDelete?.sourceLanguage || ""}-${
          projectToDelete?.targetLanguage || ""
        }`}
        dialogText={`Are you sure you want to delete this project?`}
        onCancel={handleCancelDelete}
        onConfirm={handleDeleteProject}
      />
    </div>
  );
}

export default BookUpload;
