import React from "react";
import { Link } from "react-router-dom"; // Import Link for navigation
import { FaTrash } from "react-icons/fa"; // Import trash icon
import "./styles/BookCard.css";

function BookCard({ book, onDelete }) {
  const handleImageError = (e) => {
    e.target.src = "https://placehold.co/200x300?text=Image+Not+Found";
  };

  return (
    <Link to={`/reader/${book.id}`} className="library-card-link">
      <div className="library-card">
        <div className="library-cover">
          <img
            src={book.cover}
            alt={`${book.title} cover`}
            className="book-image"
            onError={handleImageError}
          />
          <div className="library-overlay">
            <h3>{book.title}</h3>
            <p className="author">{book.author}</p>
            <button
              className="delete-button"
              onClick={(e) => {
                e.preventDefault(); // Prevent Link navigation when clicking delete
                e.stopPropagation(); // Stop event from bubbling up to Link
                onDelete(book.id);
              }}
            >
              <FaTrash />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default BookCard;
