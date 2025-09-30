import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { textVide } from "text-vide";
import axios from "axios";
import {
  openDB,
  getAllBooks,
  getReadingLocation,
  saveReadingLocation,
  getLoginInfo,
  getSessionInfo,
} from "../../services/Library/databaseService";
import StatusBar from "./components/StatusBar";
import ChapterSlider from "./components/ChapterSlider";
import SentenceSlider from "./components/SentenceSlider";
import SettingsModal from "./components/SettingsModal";
import BookContent from "./components/BookContent";
import silentAudio from "../../assets/silent-1m.ogg";
import "./Reader.css";

const Reader = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [readingLocation, setReadingLocation] = useState({
    chapterId: 0,
    sentenceId: 0,
  });
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [theme, setTheme] = useState("solarized");
  const [showChapterSlider, setShowChapterSlider] = useState(false);
  const [showSentenceSlider, setShowSentenceSlider] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isReadingSource, setIsReadingSource] = useState(true);
  const [showTtsSettings, setShowTtsSettings] = useState(false);
  const [sourceVoice, setSourceVoice] = useState("");
  const [targetVoice, setTargetVoice] = useState("");
  const [voices, setVoices] = useState([]);
  const [readingOrder, setReadingOrder] = useState("source-target");
  const [sourceSpeed, setSourceSpeed] = useState("1.0");
  const [targetSpeed, setTargetSpeed] = useState("1.0");
  const [sourceEnabled, setSourceEnabled] = useState(true);
  const [targetEnabled, setTargetEnabled] = useState(true);
  const [wakeLock, setWakeLock] = useState(null);
  const chapterSliderRef = useRef(null);
  const sentenceSliderRef = useRef(null);
  const audioRef = useRef(null); // Nowy ref dla ukrytego audio

  // Function to request wake lock
  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        const lock = await navigator.wakeLock.request("screen");
        setWakeLock(lock);
        console.log("Wake Lock is active");
      } else {
        console.log("Wake Lock API not supported in this browser");
      }
    } catch (err) {
      console.error("Failed to acquire wake lock:", err);
    }
  };

  // Function to release wake lock
  const releaseWakeLock = async () => {
    if (wakeLock) {
      await wakeLock.release();
      setWakeLock(null);
      console.log("Wake Lock released");
    }
  };

  //theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "solarized";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const handleThemeChange = (e) => {
    const selectedTheme = e.target.value;
    setTheme(selectedTheme);
    document.documentElement.setAttribute("data-theme", selectedTheme);
    localStorage.setItem("theme", selectedTheme);
  };

  // Fetch voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
      const savedSourceVoice = localStorage.getItem("ttsSourceVoice");
      const savedTargetVoice = localStorage.getItem("ttsTargetVoice");
      if (
        savedSourceVoice &&
        availableVoices.some((v) => v.name === savedSourceVoice)
      ) {
        setSourceVoice(savedSourceVoice);
      }
      if (
        savedTargetVoice &&
        availableVoices.some((v) => v.name === savedTargetVoice)
      ) {
        setTargetVoice(savedTargetVoice);
      }
    };
    speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Fetch book data and reading location
  const fetchBookData = async () => {
    setLoading(true);
    try {
      const books = await getAllBooks();
      const selectedBook = books.find((b) => b.id === bookId);
      if (!selectedBook) {
        console.error(`Book with ID ${bookId} not found in IndexedDB`);
        navigate("/");
        return;
      }

      const normalizedBook = {
        ...selectedBook,
        chapters: selectedBook.chapters || [],
        sourceLanguage: selectedBook.sourceLanguage || "pl",
        targetLanguage: selectedBook.targetLanguage || "en",
      };
      setBook(normalizedBook);

      let readingLoc = await getReadingLocation(bookId);
      if (!readingLoc) {
        readingLoc = {
          bookId,
          chapterId: 0,
          sentenceId: 0,
          lastModified: Date.now(),
        };
        const db = await openDB();
        await saveReadingLocation(db, readingLoc);
      }

      // Validate reading location
      const chapterIndex =
        readingLoc.chapterId < normalizedBook.chapters.length
          ? readingLoc.chapterId
          : 0;
      const chapter = normalizedBook.chapters[chapterIndex] || null;
      const sentenceIndex =
        chapter && readingLoc.sentenceId < chapter.content.length
          ? readingLoc.sentenceId
          : 0;

      setReadingLocation({
        chapterId: chapterIndex,
        sentenceId: sentenceIndex,
      });
      setChapter(chapter);
      setCurrentSentenceIndex(sentenceIndex);
      console.log(
        "Fetched book:",
        normalizedBook.title,
        "Chapter:",
        chapterIndex,
        "Sentence:",
        sentenceIndex
      );
      document.title = normalizedBook.title || "Untitled Book";
    } catch (error) {
      console.error(
        "Error fetching book or reading location from IndexedDB:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookData();
  }, [bookId, navigate]);

  // Listen for booksSynced event to update book data
  useEffect(() => {
    const handleBooksSynced = async () => {
      await fetchBookData();
    };

    window.addEventListener("booksSynced", handleBooksSynced);
    return () => {
      window.removeEventListener("booksSynced", handleBooksSynced);
    };
  }, [bookId]);

  // Sync chapter state with readingLocation.chapterId
  useEffect(() => {
    if (book && readingLocation.chapterId < book.chapters.length) {
      const newChapter = book.chapters[readingLocation.chapterId] || null;
      if (newChapter !== chapter) {
        setChapter(newChapter);
        console.log("Updated chapter to:", readingLocation.chapterId);
      }
    }
  }, [book, readingLocation.chapterId, chapter]);

  // Sync currentSentenceIndex with readingLocation.sentenceId
  useEffect(() => {
    if (!isPlaying) {
      setCurrentSentenceIndex(readingLocation.sentenceId);
      console.log(
        "Updated currentSentenceIndex to:",
        readingLocation.sentenceId
      );
    }
  }, [readingLocation.sentenceId, isPlaying]);

  // Handle clicks outside sliders
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        chapterSliderRef.current &&
        !chapterSliderRef.current.contains(event.target)
      ) {
        setShowChapterSlider(false);
        syncReadingLocationOnClose();
      }
      if (
        sentenceSliderRef.current &&
        !sentenceSliderRef.current.contains(event.target)
      ) {
        setShowSentenceSlider(false);
        syncReadingLocationOnClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Load saved settings
  useEffect(() => {
    const savedFontSize = localStorage.getItem("fontSize");
    if (savedFontSize) setFontSize(parseInt(savedFontSize, 10));
    const savedReadingOrder =
      localStorage.getItem("readingOrder") || "source-target";
    setReadingOrder(savedReadingOrder);
    const savedSourceSpeed = localStorage.getItem("sourceSpeed") || "1.0";
    setSourceSpeed(savedSourceSpeed);
    const savedTargetSpeed = localStorage.getItem("targetSpeed") || "1.0";
    setTargetSpeed(savedTargetSpeed);
    const savedSourceEnabled = localStorage.getItem("sourceEnabled");
    setSourceEnabled(savedSourceEnabled !== "false");
    const savedTargetEnabled = localStorage.getItem("targetEnabled");
    setTargetEnabled(savedTargetEnabled !== "false");
  }, []);

  // Manage wake lock based on isPlaying state
  useEffect(() => {
    if (isPlaying) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => {
      releaseWakeLock();
    };
  }, [isPlaying]);

  // OPTIONAL IMPROVEMENT: Handle backgrounding/foregrounding to resume playback
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isPlaying) {
        // Resume TTS and audio if backgrounded
        playSentence(currentSentenceIndex); // Assumes playSentence is accessible; adjust if needed
        if (audioRef.current) {
          audioRef.current.play().catch(console.warn);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isPlaying, currentSentenceIndex]);

  const updateReadingLocationInDB = async (
    chapterId,
    sentenceId,
    isSyncing = true
  ) => {
    try {
      const db = await openDB();
      const newReadingLocation = {
        bookId,
        chapterId,
        sentenceId,
        lastModified: Date.now(),
      };
      await saveReadingLocation(db, newReadingLocation);
      setReadingLocation({ chapterId, sentenceId });
      console.log(
        "Updated reading location: Chapter",
        chapterId,
        "Sentence",
        sentenceId
      );

      const loginInfo = await getLoginInfo();
      if (!loginInfo?.serverAddress) {
        console.warn("No server address found, skipping server sync");
        return;
      }

      let serverAddress = loginInfo.serverAddress;
      if (!serverAddress.startsWith("http")) {
        serverAddress = `https://${serverAddress}`;
      }
      serverAddress = serverAddress.endsWith("/")
        ? serverAddress
        : `${serverAddress}/`;

      const sessionInfo = await getSessionInfo();
      const token = sessionInfo?.token;
      if (!token) {
        console.warn("No session token found, skipping server sync");
        return;
      }

      if (!isSyncing) {
        return;
      }

      await axios.post(
        `${serverAddress}reading-locations`,
        { readingLocations: [newReadingLocation] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Successfully synced reading location to server");
    } catch (error) {
      console.error("Error updating reading location:", error);
      console.warn(
        "Failed to sync reading location to server. Changes saved locally."
      );
    }
  };

  // Sync reading location when sliders are closed
  const syncReadingLocationOnClose = async () => {
    const rL = await getReadingLocation(bookId);
    updateReadingLocationInDB(rL.chapterId, rL.sentenceId, true);
  };

  const onPreviousSentence = () => {
    if (!book || !chapter) return;
    let newSentenceId = readingLocation.sentenceId - 1;
    let newChapterId = readingLocation.chapterId;
    if (newSentenceId < 0) {
      newChapterId = readingLocation.chapterId - 1;
      if (newChapterId < 0) {
        newChapterId = 0;
        newSentenceId = 0;
      } else {
        newSentenceId = book.chapters[newChapterId].content.length - 1;
        setChapter(book.chapters[newChapterId]);
      }
    }
    updateReadingLocationInDB(newChapterId, newSentenceId);
  };

  const onNextSentence = () => {
    if (!book || !chapter) return;
    let newSentenceId = readingLocation.sentenceId + 1;
    let newChapterId = readingLocation.chapterId;
    if (newSentenceId >= chapter.content.length) {
      newChapterId = readingLocation.chapterId + 1;
      if (newChapterId < book.chapters.length) {
        newSentenceId = 0;
        setChapter(book.chapters[newChapterId]);
      } else {
        newChapterId = readingLocation.chapterId;
        newSentenceId = readingLocation.sentenceId;
      }
    }
    updateReadingLocationInDB(newChapterId, newSentenceId);
  };

  // Helper function for playSentence (extracted for reuse in visibilitychange handler)
  const playSentence = (sentenceIndex) => {
    if (sentenceIndex >= chapter.content.length) {
      setIsPlaying(false);
      setCurrentSentenceIndex(readingLocation.sentenceId);
      setIsReadingSource(true);
      // Save location on completion
      updateReadingLocationInDB(
        readingLocation.chapterId,
        readingLocation.sentenceId
      );
      return;
    }

    const sentence = chapter.content[sentenceIndex];

    const topLanguage = readingOrder === "source-target" ? "source" : "target";
    const bottomLanguage =
      readingOrder === "source-target" ? "target" : "source";

    const sourceUtterance = sourceEnabled
      ? new SpeechSynthesisUtterance(sentence.source)
      : null;
    if (sourceUtterance) {
      sourceUtterance.lang = book.sourceLanguage;
      sourceUtterance.voice =
        voices.find((v) => v.name === sourceVoice) || null;
      sourceUtterance.rate = parseFloat(sourceSpeed);
    }

    const targetUtterance = targetEnabled
      ? new SpeechSynthesisUtterance(sentence.translation)
      : null;
    if (targetUtterance) {
      targetUtterance.lang = book.targetLanguage;
      targetUtterance.voice =
        voices.find((v) => v.name === targetVoice) || null;
      targetUtterance.rate = parseFloat(targetSpeed);
    }

    const topUtterance =
      topLanguage === "source" ? sourceUtterance : targetUtterance;
    const bottomUtterance =
      bottomLanguage === "source" ? sourceUtterance : targetUtterance;

    const nextSentence = () => {
      const newSentenceIndex = sentenceIndex + 1;
      if (newSentenceIndex < chapter.content.length) {
        playSentence(newSentenceIndex);
        setCurrentSentenceIndex(newSentenceIndex);
        updateReadingLocationInDB(
          readingLocation.chapterId,
          newSentenceIndex,
          false
        );
      } else {
        setIsPlaying(false);
        setCurrentSentenceIndex(readingLocation.sentenceId);
        setIsReadingSource(true);
        // Save location on completion
        updateReadingLocationInDB(readingLocation.chapterId, sentenceIndex);
      }
    };

    setCurrentSentenceIndex(sentenceIndex);
    setIsReadingSource(true);

    const proceedToBottom = () => {
      setIsReadingSource(false);
      // FIXED: Skip bottom if disabled, no delay
      if (bottomUtterance) {
        bottomUtterance.onend = nextSentence;
        speechSynthesis.speak(bottomUtterance);
      } else {
        nextSentence(); // Immediate skip
      }
    };

    // FIXED: Skip top if disabled, no delay
    if (topUtterance) {
      topUtterance.onend = proceedToBottom;
      speechSynthesis.speak(topUtterance);
    } else {
      proceedToBottom(); // Immediate skip
    }
  };

  // FIXED: Updated handlePlay with silent audio resumption and tighter pause sync
  const handlePlay = () => {
    if (isPlaying) {
      speechSynthesis.cancel();
      setIsPlaying(false);
      setCurrentSentenceIndex(readingLocation.sentenceId);
      setIsReadingSource(true);
      // Save location on pause
      updateReadingLocationInDB(
        readingLocation.chapterId,
        currentSentenceIndex
      );
      // Pause the silent audio on stop
      if (audioRef.current) {
        audioRef.current.pause();
      }
      return;
    }

    if (!chapter || !book) return;

    playSentence(readingLocation.sentenceId);
    setIsPlaying(true);

    // FIXED: Always initialize/resume silent audio on play (not just once)
    if (audioRef.current) {
      if (!audioRef.current.src) {
        // First-time setup only
        audioRef.current.src = silentAudio;
        audioRef.current.loop = true;
        audioRef.current.volume = 0;
      }
      // Always attempt to play/resume (safe for looped audio)
      audioRef.current
        .play()
        .then(() => {
          console.log("Silent audio resumed");
        })
        .catch((e) => {
          console.warn("Silent audio play failed (may be policy-related):", e);
          // Fallback: Don't break TTS if audio fails
        });
    }
  };

  // Integracja z Media Session API
  useEffect(() => {
    if ("mediaSession" in navigator && book && chapter) {
      const mediaSession = navigator.mediaSession;

      // Metadane dla notyfikacji (dynamiczne na podstawie książki i rozdziału)
      mediaSession.metadata = new MediaMetadata({
        title: book.title || "Untitled Book",
        artist: `${readingLocation.sentenceId}/${chapter.content.length}`,
        album: chapter.title || `Chapter ${readingLocation.chapterId + 1}`,
        artwork: book.cover
          ? [
              // Dodaj okładkę, jeśli dostępna
              { src: book.cover, sizes: "96x96", type: "image/jpeg" },
              { src: book.cover, sizes: "128x128", type: "image/jpeg" },
            ]
          : [],
      });

      // Handler dla play (z MediaSession – np. przycisk na słuchawkach lub notyfikacja)
      const handleMediaPlay = () => {
        if (!isPlaying) {
          handlePlay();
        }
      };

      // Handler dla pause
      const handleMediaPause = () => {
        if (isPlaying) {
          handlePlay(); // handlePlay toggle'uje, więc zadziała jako pause
        }
      };

      // Podwójne kliknięcie na słuchawkach – zazwyczaj mapuje na nexttrack
      const handleMediaNext = () => {
        onNextSentence();
      };

      const handleMediaPrevious = () => {
        onPreviousSentence();
      };

      mediaSession.setActionHandler("play", handleMediaPlay);
      mediaSession.setActionHandler("pause", handleMediaPause);
      // ADDED: Enable next/previous track functionality for media controls
      mediaSession.setActionHandler("nexttrack", () => {
        handleMediaPause();
        handleMediaNext();
      });
      mediaSession.setActionHandler("previoustrack", () => {
        handleMediaPause();
        handleMediaPrevious();
      });

      // Aktualizuj stan odtwarzania w MediaSession (dla notyfikacji)
      mediaSession.playbackState = isPlaying ? "playing" : "paused";

      // Cleanup
      return () => {
        mediaSession.setActionHandler("play", null);
        mediaSession.setActionHandler("pause", null);
        mediaSession.setActionHandler("nexttrack", null);
        mediaSession.setActionHandler("previoustrack", null);
      };
    }
  }, [
    isPlaying,
    book,
    chapter,
    readingLocation,
    handlePlay,
    onNextSentence,
    onPreviousSentence,
  ]);

  // Dodatkowy effect do aktualizacji playbackState na zmianę isPlaying
  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }
  }, [isPlaying]);

  // Aktualizacja metadanych na zmianę rozdziału lub książki
  useEffect(() => {
    if ("mediaSession" in navigator && book && chapter) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: book.title || "Untitled Book",
        artist: book.author || "Unknown Author",
        album: chapter.title || `Chapter ${readingLocation.chapterId + 1}`,
        artwork: book.coverUrl
          ? [
              { src: book.coverUrl, sizes: "96x96", type: "image/jpeg" },
              { src: book.coverUrl, sizes: "128x128", type: "image/jpeg" },
            ]
          : [],
      });
    }
  }, [book, chapter, readingLocation]);

  // OPTIONAL IMPROVEMENT: Add Media Position Updates for smoother notifications
  useEffect(() => {
    if ("mediaSession" in navigator && isPlaying && chapter) {
      const totalDuration = chapter.content.length * 10; // Rough est. (5s per sentence)
      navigator.mediaSession.setPositionState({
        duration: totalDuration,
        position: currentSentenceIndex * 5,
      });
    }
  }, [isPlaying, currentSentenceIndex, chapter]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === "Space") {
        event.preventDefault();
        handlePlay();
      } else if (event.code === "ArrowLeft" && !isPlaying) {
        event.preventDefault();
        onPreviousSentence();
      } else if (event.code === "ArrowRight" && !isPlaying) {
        event.preventDefault();
        onNextSentence();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handlePlay, onPreviousSentence, onNextSentence, isPlaying]);

  const increaseFontSize = () => {
    setFontSize((prev) => {
      const newSize = Math.min(prev + 2, 48);
      localStorage.setItem("fontSize", newSize);
      return newSize;
    });
  };

  const decreaseFontSize = () => {
    setFontSize((prev) => {
      const newSize = Math.max(prev - 2, 12);
      localStorage.setItem("fontSize", newSize);
      return newSize;
    });
  };

  const toggleChapterSlider = () => {
    setShowChapterSlider((prev) => !prev);
  };

  const toggleSentenceSlider = () => {
    setShowSentenceSlider((prev) => !prev);
  };

  const handleChapterChange = (newChapterId) => {
    if (book && newChapterId < book.chapters.length) {
      setChapter(book.chapters[newChapterId] || null);
      updateReadingLocationInDB(newChapterId, 0, false);
      console.log("Chapter changed to:", newChapterId);
    }
  };

  const handleSentenceChange = (newSentenceId) => {
    if (chapter && newSentenceId < chapter.content.length) {
      updateReadingLocationInDB(
        readingLocation.chapterId,
        newSentenceId,
        false
      );
      console.log("Sentence changed to:", newSentenceId);
    }
  };

  const toggleTtsSettings = () => {
    speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentSentenceIndex(readingLocation.sentenceId);
    setIsReadingSource(true);
    setShowTtsSettings((prev) => !prev);
  };

  const handleTtsSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "ttsSourceVoice") {
      setSourceVoice(value);
      localStorage.setItem("ttsSourceVoice", value);
    } else if (name === "ttsTargetVoice") {
      setTargetVoice(value);
      localStorage.setItem("ttsTargetVoice", value);
    } else if (name === "readingOrder") {
      setReadingOrder(value);
      localStorage.setItem("readingOrder", value);
    } else if (name === "sourceSpeed") {
      setSourceSpeed(value);
      localStorage.setItem("sourceSpeed", value);
    } else if (name === "targetSpeed") {
      setTargetSpeed(value);
      localStorage.setItem("targetSpeed", value);
    } else if (name === "sourceEnabled") {
      setSourceEnabled(checked);
      localStorage.setItem("sourceEnabled", checked);
    } else if (name === "targetEnabled") {
      setTargetEnabled(checked);
      localStorage.setItem("targetEnabled", checked);
    }
  };

  return (
    <div className="reader__container">
      <div className="reader__main">
        <StatusBar
          book={book}
          toggleChapterSlider={toggleChapterSlider}
          toggleSentenceSlider={toggleSentenceSlider}
          chapterCount={book?.chapters?.length || 0}
          currentChapter={readingLocation.chapterId + 1}
          sentenceCount={chapter?.content?.length || 0}
          currentSentence={readingLocation.sentenceId + 1}
          increaseFontSize={increaseFontSize}
          decreaseFontSize={decreaseFontSize}
          toggleTtsSettings={toggleTtsSettings}
          updateReadingLocation={updateReadingLocationInDB}
        />
        {showChapterSlider && book?.chapters?.length > 0 && (
          <ChapterSlider
            ref={chapterSliderRef}
            currentChapter={readingLocation.chapterId}
            chapterCount={book.chapters.length}
            onChapterChange={handleChapterChange}
            isPlaying={isPlaying}
            onClose={toggleChapterSlider}
          />
        )}
        {showSentenceSlider && chapter?.content?.length > 0 && (
          <SentenceSlider
            ref={sentenceSliderRef}
            currentSentence={readingLocation.sentenceId}
            sentenceCount={chapter.content.length}
            onSentenceChange={handleSentenceChange}
            isPlaying={isPlaying}
            onClose={toggleSentenceSlider}
          />
        )}
        <div className="book-content-wrapper">
          <BookContent
            loading={loading}
            book={book}
            chapter={chapter}
            fontSize={fontSize}
            currentSentenceIndex={currentSentenceIndex}
            isReadingSource={isReadingSource}
            textVide={textVide}
            readingOrder={readingOrder}
            onPrevious={onPreviousSentence}
            onNext={onNextSentence}
            onPlay={handlePlay}
            isPlaying={isPlaying}
            disabled={isPlaying}
          />
        </div>
      </div>
      <SettingsModal
        show={showTtsSettings}
        voices={voices}
        sourceVoice={sourceVoice}
        targetVoice={targetVoice}
        sourceLanguage={book?.sourceLanguage}
        targetLanguage={book?.targetLanguage}
        onChange={handleTtsSettingsChange}
        onClose={toggleTtsSettings}
        readingOrder={readingOrder}
        sourceSpeed={sourceSpeed}
        targetSpeed={targetSpeed}
        sourceEnabled={sourceEnabled}
        targetEnabled={targetEnabled}
        theme={theme}
        onThemeChange={handleThemeChange}
      />
      {/* Nowy ukryty element audio dla media focus */}
      <audio ref={audioRef} style={{ display: "none" }} />
    </div>
  );
};

export default Reader;
