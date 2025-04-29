import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
} from "../../services/Library/databaseService";
import { syncBooks } from "../../services/Library/syncBooksService";
import "./styles/Library.css";

function Library() {
  const [books, setBooks] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [hasValidToken, setHasValidToken] = useState(false);

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
      const storedBooks = await getAllBooks();
      const deletedBookIds = await getDeletedBookIds();
      // Filter out deleted books
      const validBooks = storedBooks.filter(
        (book) => !deletedBookIds.includes(book.id)
      );
      setBooks(validBooks);
      console.log("Fetched books:", validBooks.length);
    } catch (error) {
      console.error("Error loading books from IndexedDB:", error);
      window.showToast("Failed to load books", "error");
    }
  };

  useEffect(() => {
    // Initial book fetch
    fetchBooks();
    // Initial token validity check
    checkTokenValidity();

    // Listen for booksSynced event
    const handleBooksSynced = (event) => {
      console.log(
        "Received booksSynced event with newBookIds:",
        event.detail.newBookIds
      );
      fetchBooks(); // Re-fetch all books to update UI
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
            await fetchBooks(); // Update UI with new book
            window.showToast("Book uploaded successfully", "success");

            // Sync new book to server if authenticated
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
            window.showToast("Invalid book file or upload failed", "error");
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

        // Sync deleted book ID to server if authenticated
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
    // Re-check token validity after modal closes to update button label
    checkTokenValidity();
  };

  return (
    <div className="library-container">
      <main className="library-grid">
        {books.map((book) => (
          <div className="book-wrapper" key={book.id}>
            <BookCard book={book} onDelete={handleDeleteRequest} />
          </div>
        ))}
      </main>
      <div className="button-container">
        <Link to="/editor" className="library-button">
          Editor
        </Link>
        <button className="library-button" onClick={handleUpload}>
          Upload
        </button>
        <button className="library-button" onClick={handleSyncClick}>
          {hasValidToken ? "Sync" : "Login"}
        </button>
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
