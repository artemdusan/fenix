import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FaEllipsisV, FaTrash, FaDownload } from "react-icons/fa";
import { getReadingLocation } from "../../services/Library/databaseService";
import "./styles/BookCard.css";

function BookCard({ book, onDelete }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(1); // Default to Chapter 1
  const [totalChapters, setTotalChapters] = useState(0); // Default to 0
  const menuRef = useRef(null);

  // Fetch reading location and set chapter information
  useEffect(() => {
    // Calculate total chapters from book.chapters
    const chaptersCount = book.chapters?.length || 0;
    setTotalChapters(chaptersCount);

    // Fetch reading location for current chapter
    getReadingLocation(book.id)
      .then((readingLocation) => {
        // Use chapterId from reading location, default to 1 if not found
        const chapterId =
          readingLocation?.chapterId !== undefined
            ? readingLocation.chapterId + 1
            : 1;
        setCurrentChapter(chapterId);
      })
      .catch((error) => {
        console.error(
          `Error fetching reading location for book ${book.id}:`,
          error
        );
        setCurrentChapter(1); // Fallback to Chapter 1 on error
      });
  }, [book.id, book.chapters]);

  const handleImageError = (e) => {
    e.target.src = "https://placehold.co/100x150?text=Image+Not+Found";
  };

  const toggleMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(book.id);
    setIsMenuOpen(false);
  };

  const handleDownload = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Create book object excluding id and lastModified
    const bookData = {
      title: book.title,
      author: book.author,
      cover: book.cover,
      notes: book.notes,
      sourceLanguage: book.sourceLanguage,
      targetLanguage: book.targetLanguage,
      chapters: book.chapters,
    };

    // Convert to JSON string with indentation for readability
    const jsonString = JSON.stringify(bookData, null, 2);

    // Create a Blob with the JSON data
    const blob = new Blob([jsonString], { type: "application/json" });

    // Create a temporary URL for the Blob
    const url = URL.createObjectURL(blob);

    // Create a temporary <a> element to trigger the download
    const link = document.createElement("a");
    link.href = url;
    // Use book title for filename, replacing invalid characters and adding .json extension
    const safeFileName =
      (book.title || "book").replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 50) +
      ".json";
    link.download = safeFileName;
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`Downloaded book: ${book.title}`);
    setIsMenuOpen(false);
  };

  // Handle clicks outside the menu to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <Link to={`/reader/${book.id}`} className="library-card-link">
      <div className="library-card">
        <div className="library-cover">
          <button className="menu-button" onClick={toggleMenu}>
            <FaEllipsisV />
          </button>
          {isMenuOpen && (
            <div className="menu" ref={menuRef}>
              <button className="menu-item" onClick={handleDownload}>
                <FaDownload style={{ marginRight: "0.5rem" }} /> Download
              </button>
              <button
                className="menu-item delete-menu-item"
                onClick={handleDelete}
              >
                <FaTrash style={{ marginRight: "0.5rem" }} /> Delete
              </button>
            </div>
          )}
          <img
            src={book.cover}
            alt={`${book.title} cover`}
            className="book-image"
            onError={handleImageError}
          />
          <div className="library-overlay">
            <h3>{book.title}</h3>
            <p className="author">{book.author}</p>
            <p className="chapter-info">
              {totalChapters === 0
                ? "No chapters"
                : `Chapter ${currentChapter}/${totalChapters}`}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default BookCard;
