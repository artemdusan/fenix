import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BookCard from "./BookCard";
import Login from "./Login";
import ConfirmationDialogModal from "../common/ConfirmationDialogModal";
import {
  openDB,
  saveBookToDB,
  getAllBooks,
  deleteBookFromDB,
  getSessionInfo,
  getDeletedBookIds,
  getAllReadingLocations,
  saveReadingLocation,
} from "../../services/Library/databaseService";
import { syncBooks } from "../../services/Library/syncBooksService";
import {
  CURRENT_PROJECT_ID,
  SETTINGS_STORE,
  PROJECTS_STORE,
  saveToIndexedDB,
  loadFromIndexedDB,
} from "../../services/editor/databaseService";
import { saveChaptersToDB } from "../../services/editor/chapterService";
import { getReadingLocation } from "../../services/Library/databaseService";
import "./styles/Library.css";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";

function Library() {
  const [books, setBooks] = useState([]);
  const [currentBookIndex, setCurrentBookIndex] = useState(0);
  const [filterText, setFilterText] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [hasValidToken, setHasValidToken] = useState(false);
  const [animationState, setAnimationState] = useState({
    direction: "",
    isAnimating: false,
    prevBookIndex: null,
  });
  const [currentChapter, setCurrentChapter] = useState(1);
  const [totalChapters, setTotalChapters] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const filtered = filteredBooksList();
    if (filtered.length > 0) {
      if (currentBookIndex < 0 || currentBookIndex >= filtered.length) {
        setCurrentBookIndex(0);
      }
      const book = filtered[currentBookIndex];
      const chaptersCount = book?.chapters?.length || 0;
      setTotalChapters(chaptersCount);
      getReadingLocation(book?.id)
        .then((readingLocation) => {
          const chapterId =
            readingLocation?.chapterId !== undefined
              ? readingLocation.chapterId + 1
              : 1;
          setCurrentChapter(chapterId);
        })
        .catch((error) => {
          console.error(
            `Error fetching reading location for book ${book?.id}:`,
            error
          );
          setCurrentChapter(1);
        });
    } else {
      setCurrentBookIndex(-1);
      setTotalChapters(0);
      setCurrentChapter(1);
    }
  }, [books, filterText, currentBookIndex]);

  const checkTokenValidity = async () => {
    try {
      const sessionInfo = await getSessionInfo();
      const now = Date.now();
      if (sessionInfo && sessionInfo.token && sessionInfo.expiresAt > now) {
        console.log("Valid token found, expires at:", sessionInfo.expiresAt);
        setHasValidToken(true);
      } else {
        console.log("No valid token or token expired");
        setHasValidToken(false);
      }
    } catch (error) {
      console.error("Error checking session info:", error);
      setHasValidToken(false);
    }
  };

  const fetchBooks = async () => {
    try {
      const [storedBooks, deletedBookIds, readingLocations] = await Promise.all(
        [getAllBooks(), getDeletedBookIds(), getAllReadingLocations()]
      );

      const readingLocationMap = new Map(
        readingLocations.map((loc) => [loc.bookId, loc])
      );

      const validBooks = storedBooks
        .filter((book) => !deletedBookIds.includes(book.id))
        .map((book) => {
          const readingLocation = readingLocationMap.get(book.id);
          return {
            ...book,
            readingLastModified: readingLocation
              ? readingLocation.lastModified
              : 0,
          };
        })
        .sort((a, b) => b.readingLastModified - a.readingLastModified);

      setBooks(validBooks);
      console.log("Fetched books:", validBooks.length);
      if (currentBookIndex >= validBooks.length) {
        setCurrentBookIndex(validBooks.length > 0 ? 0 : -1);
      }
    } catch (error) {
      console.error(
        "Error loading books or reading locations from IndexedDB:",
        error
      );
      window.showToast("Failed to load books", "error");
    }
  };

  useEffect(() => {
    fetchBooks();
    checkTokenValidity();

    const handleBooksSynced = (event) => {
      console.log(
        "Received booksSynced event with newBookIds:",
        event.detail.newBookIds
      );
      fetchBooks();
      if (event.detail.newBookIds.length > 0) {
        window.showToast(
          `${event.detail.newBookIds.length} new book(s) synced`,
          "success"
        );
      }
    };

    window.addEventListener("booksSynced", handleBooksSynced);
    return () => {
      window.removeEventListener("booksSynced", handleBooksSynced);
    };
  }, []);

  const handleUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const bookData = JSON.parse(e.target.result);
            const db = await openDB();
            const id = await saveBookToDB(db, bookData);

            const readingLocation = {
              bookId: id,
              chapterId: 0,
              sentenceId: 0,
              lastModified: Date.now(),
            };
            await saveReadingLocation(db, readingLocation);

            await fetchBooks();
            window.showToast("Book uploaded successfully", "success");

            const sessionInfo = await getSessionInfo();
            if (sessionInfo?.token && navigator.onLine) {
              const syncResult = await syncBooks();
              if (syncResult.success) {
                window.showToast("Book synced to server", "success");
              } else {
                window.showToast(
                  `Failed to sync book: ${syncResult.error}`,
                  "error"
                );
              }
            } else {
              window.showToast(
                "Book saved locally, sync when online and logged in",
                "warning"
              );
            }
          } catch (error) {
            console.error("Error processing uploaded book:", error);
            window.showToast("Invalid json file or upload failed", "error");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleDeleteRequest = (id) => {
    setBookToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleEditRequest = async (book_id) => {
    try {
      const projectInfo = {
        id: currentBook.id,
        title: currentBook.title,
        author: currentBook.author,
        coverBase64: currentBook.cover,
        notes: currentBook.notes,
        sourceLanguage: currentBook.sourceLanguage,
        targetLanguage: currentBook.targetLanguage,
      };

      // Convert JSON book chapters into ChapterData format
      const newChapters = currentBook.chapters.map((jsonChapter, index) => {
        const content = jsonChapter.content
          .map((row) => `${row.source}`)
          .join(" ");

        const translations = jsonChapter.content
          .map((row) => `"${row.source}","${row.translation}"`)
          .join("\n");

        return {
          id: crypto.randomUUID(),
          projectID: currentBook.id,
          title: jsonChapter.title,
          content,
          originalContent: content,
          translation: translations,
          originalTranslation: translations,
          isEdited: false,
          isTranslationEdited: false,
          index: index,
        };
      });
      const projectExists = await loadFromIndexedDB(
        PROJECTS_STORE,
        currentBook.id
      );

      await saveToIndexedDB(SETTINGS_STORE, {
        id: CURRENT_PROJECT_ID,
        value: currentBook.id,
      });

      if (!projectExists) {
        await saveChaptersToDB(currentBook.id, newChapters);
        // Save metadata to IndexedDB
        await saveToIndexedDB(PROJECTS_STORE, projectInfo);
      }
      navigate("/editor");
    } catch (error) {
      console.error("Error handling edit request:", error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (bookToDelete) {
      try {
        const db = await openDB();
        await deleteBookFromDB(db, bookToDelete);
        setBooks((prevBooks) =>
          prevBooks.filter((book) => book.id !== bookToDelete)
        );
        setShowDeleteDialog(false);
        setBookToDelete(null);
        window.showToast("Book deleted successfully", "success");

        const filteredBooks = filteredBooksList();
        if (filteredBooks.length === 0) {
          setCurrentBookIndex(-1);
        } else if (currentBookIndex >= filteredBooks.length) {
          setCurrentBookIndex(filteredBooks.length - 1);
        }

        const sessionInfo = await getSessionInfo();
        if (sessionInfo?.token && navigator.onLine) {
          const syncResult = await syncBooks();
          if (syncResult.success) {
            window.showToast("Deletion synced to server", "success");
          } else {
            window.showToast(
              `Failed to sync deletion: ${syncResult.error}`,
              "error"
            );
          }
        } else {
          window.showToast(
            "Deletion saved locally, sync when online and logged in",
            "warning"
          );
        }
      } catch (error) {
        console.error("Error deleting book from IndexedDB:", error);
        window.showToast("Failed to delete book", "error");
      }
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setBookToDelete(null);
  };

  const handleSyncClick = () => {
    setShowLoginModal(true);
  };

  const handleCloseModal = () => {
    setShowLoginModal(false);
    checkTokenValidity();
  };

  const filteredBooksList = () => {
    if (!filterText.trim()) return books;
    return books.filter(
      (book) =>
        book.title.toLowerCase().includes(filterText.toLowerCase()) ||
        book.author.toLowerCase().includes(filterText.toLowerCase())
    );
  };

  const handlePrevBook = () => {
    if (animationState.isAnimating) return;
    const filteredBooks = filteredBooksList();
    const prevIndex =
      currentBookIndex <= 0 ? filteredBooks.length - 1 : currentBookIndex - 1;
    setAnimationState({
      direction: "to-right",
      isAnimating: true,
      prevBookIndex: currentBookIndex,
    });
    setCurrentBookIndex(prevIndex);
    setTimeout(() => {
      setAnimationState({
        direction: "",
        isAnimating: false,
        prevBookIndex: null,
      });
    }, 300);
  };

  const handleNextBook = () => {
    if (animationState.isAnimating) return;
    const filteredBooks = filteredBooksList();
    const nextIndex =
      currentBookIndex >= filteredBooks.length - 1 ? 0 : currentBookIndex + 1;
    setAnimationState({
      direction: "to-left",
      isAnimating: true,
      prevBookIndex: currentBookIndex,
    });
    setCurrentBookIndex(nextIndex);
    setTimeout(() => {
      setAnimationState({
        direction: "",
        isAnimating: false,
        prevBookIndex: null,
      });
    }, 300);
  };

  const filteredBooks = filteredBooksList();
  const currentBook = filteredBooks[currentBookIndex];
  const prevBook =
    animationState.prevBookIndex !== null
      ? filteredBooks[animationState.prevBookIndex]
      : null;

  return (
    <div className="library-container">
      <div className="button-container">
        <button
          className="library-button"
          aria-label="Open editor"
          onClick={() => navigate("/editor")}
        >
          Editor
        </button>
        <button
          className="library-button"
          onClick={handleUpload}
          aria-label="Upload book"
        >
          Upload
        </button>
        <button
          className="library-button"
          onClick={handleSyncClick}
          aria-label={hasValidToken ? "Sync books" : "Login to sync"}
        >
          {hasValidToken ? "Sync" : "Login"}
        </button>
      </div>
      <div className="library-grid">
        <div className="book-display">
          {filteredBooks.length === 0 ? (
            <p className="no-books">No books found</p>
          ) : (
            <div className="book-navigation">
              <button
                className="nav-button nav-button-left"
                onClick={handlePrevBook}
                disabled={
                  filteredBooks.length <= 1 || animationState.isAnimating
                }
                aria-label="Previous book"
              >
                <FaArrowLeft className="nav-icon" />
              </button>
              <div className="book-container">
                {animationState.isAnimating && prevBook && (
                  <div
                    className={`book-wrapper book-wrapper-prev ${animationState.direction}`}
                  >
                    <BookCard book={prevBook} onDelete={handleDeleteRequest} />
                  </div>
                )}
                {currentBook && (
                  <div
                    className={`book-wrapper book-wrapper-current ${animationState.direction}`}
                  >
                    <BookCard
                      book={currentBook}
                      onDelete={handleDeleteRequest}
                      onEdit={handleEditRequest}
                    />
                  </div>
                )}
              </div>
              <button
                className="nav-button nav-button-right"
                onClick={handleNextBook}
                disabled={
                  filteredBooks.length <= 1 || animationState.isAnimating
                }
                aria-label="Next book"
              >
                <FaArrowRight className="nav-icon" />
              </button>
            </div>
          )}
        </div>
        {currentBook && (
          <div className="book-info-container">
            <h3>{currentBook.title}</h3>
            <p className="author">{currentBook.author}</p>
            <p className="chapter-info">
              {totalChapters === 0
                ? "No chapters"
                : `Chapter ${currentChapter}/${totalChapters}`}
            </p>
          </div>
        )}
        <div className="filter-container">
          <input
            type="text"
            className="filter-input"
            placeholder="Filter by title or author..."
            value={filterText}
            onChange={(e) => {
              const newFilterText = e.target.value;
              setFilterText(newFilterText);
              const filteredBooks = newFilterText.trim()
                ? books.filter(
                    (book) =>
                      book.title
                        .toLowerCase()
                        .includes(newFilterText.toLowerCase()) ||
                      book.author
                        .toLowerCase()
                        .includes(newFilterText.toLowerCase())
                  )
                : books;
              setCurrentBookIndex(filteredBooks.length > 0 ? 0 : -1);
            }}
          />
        </div>
      </div>
      <ConfirmationDialogModal
        showDialog={showDeleteDialog}
        dialogTitle="Delete Book"
        dialogText="Are you sure you want to delete this book? This action cannot be undone."
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
      {showLoginModal && <Login onClose={handleCloseModal} />}
    </div>
  );
}

export default Library;
