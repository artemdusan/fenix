import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom"; // Import Link for navigation
import { FaEllipsisV, FaTrash, FaDownload } from "react-icons/fa"; // Import icons
import "./styles/BookCard.css";

function BookCard({ book, onDelete }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleImageError = (e) => {
    // Use a responsive placeholder size to match container
    e.target.src = "https://placehold.co/100x150?text=Image+Not+Found";
  };

  const toggleMenu = (e) => {
    e.preventDefault(); // Prevent Link navigation
    e.stopPropagation(); // Stop event bubbling
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
    // Dummy download action
    console.log(`Download book: ${book.title}`);
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

  // Use actual book data if available, fallback to dummy values
  const currentChapter = book.currentChapter || 2;
  const totalChapters = book.totalChapters || 23;

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
              Chapter {currentChapter}/{totalChapters}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default BookCard;
