import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import {
  saveToIndexedDB,
  SETTINGS_STORE,
  CURRENT_SCREEN,
} from "../services/editor/databaseService";
import { loadChaptersFromDB } from "../services/editor/chapterService";

// Extend the Window interface to include showToast
declare global {
  interface Window {
    showToast: (message: string, type?: string, duration?: number) => void;
  }
}
import { ProjectMetadata, Screen } from "../services/editor/types";

// Define types

interface EditorContextType {
  projectInfo: ProjectMetadata | null;
  setProjectInfo: (projectInfo: ProjectMetadata | null) => void;
  currentChapterId: string | null;
  setCurrentChapterId: (id: string | null) => void;
  selectedChapters: Set<string>;
  setSelectedChapters: (chapters: Set<string>) => void;
  currentScreen: number;
  setCurrentScreen: (screen: number) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  chapters: any[]; // Replace 'any' with your chapter type if known
  setChapters: (chapters: any[]) => void; // Replace 'any' with your chapter type if known
  showToast: (message: string, type?: string, duration?: number) => void;
}

// Create context with default value
const EditorContext = createContext<EditorContextType>({} as EditorContextType);

// Props type for EditorProvider
interface EditorProviderProps {
  children: ReactNode;
}

export const EditorProvider = ({ children }: EditorProviderProps) => {
  const [projectInfo, setProjectInfo] = useState<ProjectMetadata | null>(null);
  const [chapters, setChapters] = useState<any[]>([]); // Replace 'any' with your chapter type
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(
    new Set()
  );
  const [currentScreen, setCurrentScreen] = useState<number>(Screen.EDITOR);
  const [apiKey, setApiKey] = useState<string>("");

  const showToast = (message: string, type = "error", duration = 3000) => {
    window.showToast(message, type, duration);
  };

  useEffect(() => {
    const updateChapters = async () => {
      if (projectInfo) {
        const loadedChapters = await loadChaptersFromDB(projectInfo.id);
        setChapters(loadedChapters);
        setCurrentChapterId(
          loadedChapters.length > 0 ? loadedChapters[0].id : null
        );
      } else {
        setChapters([]);
        setCurrentChapterId(null);
      }
    };
    updateChapters();
  }, [projectInfo]);

  const updateCurrentScreen = (screen: number) => {
    setCurrentScreen(screen);
    saveToIndexedDB(SETTINGS_STORE, {
      id: CURRENT_SCREEN,
      value: screen,
    }).catch((error: Error) =>
      console.error("Failed to save screen state:", error)
    );
  };

  const value: EditorContextType = {
    projectInfo,
    setProjectInfo,
    currentChapterId,
    setCurrentChapterId,
    selectedChapters,
    setSelectedChapters,
    currentScreen,
    setCurrentScreen: updateCurrentScreen,
    apiKey,
    setApiKey,
    chapters,
    setChapters,
    showToast,
  };

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
};

export const useEditorContext = (): EditorContextType => {
  return useContext(EditorContext);
};

export default EditorContext;
