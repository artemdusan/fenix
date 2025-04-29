import React from "react";
import HeaderEditor from "./HeaderEditor";
import ChapterList from "./ChapterList";
import ChapterContent from "./ChapterContent";
import "./styles/EditorScreen.css";

const EditorScreen = () => {
  return (
    <div className="editor-screen">
      <HeaderEditor />
      <div className="editor-screen__content">
        <>
          <ChapterList />
          <ChapterContent />
        </>
      </div>
    </div>
  );
};

export default EditorScreen;
