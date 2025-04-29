// App.jsx
import { useEffect } from "react";
import { loadCurrentProject } from "../../services/editor/projectService";
import {
  loadFromIndexedDB,
  CURRENT_SCREEN,
  SETTINGS_STORE,
} from "../../services/editor/databaseService";
import { EditorProvider, useEditorContext } from "../../context/EditorContext";

// components
import EditorScreen from "./EditorScreen";
import BookUpload from "./BookUpload";
import TranslationScreen from "./TranslationScreen";

function AppContent() {
  const { projectInfo, setProjectInfo, currentScreen, setCurrentScreen } =
    useEditorContext();

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        // Load existing book
        const existingBook = await loadCurrentProject();
        if (existingBook && isMounted) {
          setProjectInfo(existingBook);
        }

        // Load saved screen state
        const savedScreen = await loadFromIndexedDB(
          SETTINGS_STORE,
          CURRENT_SCREEN
        );
        console.log("Saved screen:", savedScreen.value);
        if (savedScreen !== undefined && isMounted) {
          setCurrentScreen(savedScreen.value); // Use .value since we save an object
        }
      } catch (error) {
        console.error("Failed to initialize:", error);
      }
    };

    init();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      {projectInfo ? (
        currentScreen === 0 ? (
          <EditorScreen />
        ) : (
          <TranslationScreen />
        )
      ) : (
        <BookUpload />
      )}
    </>
  );
}

function Editor() {
  return (
    <EditorProvider>
      <AppContent />
    </EditorProvider>
  );
}

export default Editor;
