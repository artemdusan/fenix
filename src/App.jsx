import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Library from "./components/Library/Library";
import Editor from "./components/Editor/Editor";
import Reader from "./components/Reader/Reader";
import { syncBooks } from "./services/Library/syncBooksService";
import { ToastContainer, toast } from "react-toastify";
import "./Theme.css";

window.showToast = (message, type = "default") => {
  toast[type](message);
};

const App = () => {
  useEffect(() => {
    syncBooks().then((result) => {
      if (result.success) {
        console.log(
          "Initial book sync completed, newBookIds:",
          result.newBookIds
        );
        const event = new CustomEvent("booksSynced", {
          detail: { newBookIds: result.newBookIds },
        });
        window.dispatchEvent(event);
      } else {
        console.error("Initial book sync failed:", result.error);
      }
    });
  }, []);

  // Format the build date for display
  const buildDate = new Date(__BUILD_DATE__).toLocaleString();

  return (
    <BrowserRouter basename="/fenix">
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/reader/:bookId" element={<Reader />} />
      </Routes>
      <footer className="footer">Build Date: {buildDate}</footer>
    </BrowserRouter>
  );
};

export default App;
