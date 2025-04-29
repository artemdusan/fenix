// components/TranslationScreen.jsx
import React from "react";
import { useEffect, useState } from "react";
import HeaderEditor from "./HeaderTranslate";
import TranslationSetup from "./TranslationSetup";
import TranslationProgress from "./TranslationProgressModal";
import { useEditorContext } from "../../context/EditorContext";
import "./styles/TranslationScreen.css";
import { getApiKeyFromDb } from "../../services/editor/translationService";

const TranslationScreen = () => {
  const { setApiKey } = useEditorContext();
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getApiKeyFromDb().then((apiKey) => {
      if (isMounted && apiKey) {
        setApiKey(apiKey);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [setApiKey]);

  return (
    <div className="translation-screen">
      <HeaderEditor />
      <main className="translation-screen__main">
        <TranslationProgress
          isVisible={isTranslating}
          onClose={() => setIsTranslating(false)}
        />
        <div className="translation-screen__container">
          <TranslationSetup setIsTranslating={setIsTranslating} />
        </div>
      </main>
    </div>
  );
};

export default TranslationScreen;
