import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FaEllipsisV, FaTrash, FaDownload, FaEdit } from "react-icons/fa";

import "./styles/BookCard.css";

function BookCard({ book, onDelete, onEdit }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

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

  const handleEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit(book.id);
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

    // Use book title for filename, replacing invalid characters and adding .json extension
    const safeFileName =
      (book.title || "book").replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 50) +
      ".json";
    const link = document.createElement("a");
    link.href = url;
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
              <button className="menu-item" onClick={handleEdit}>
                <FaEdit style={{ marginRight: "0.5rem" }} /> Edit
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
        </div>
      </div>
    </Link>
  );
}

export default BookCard;
