const DB_NAME = "LibraryDB";
const STORE_NAME = "books";
const DELETED_BOOKS_STORE = "deletedBooks";
const LOGIN_INFO_STORE = "loginInfo";
const SESSION_INFO_STORE = "sessionInfo";
const READING_LOCATIONS_STORE = "readingLocations";
const DB_VERSION = 4;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(DELETED_BOOKS_STORE)) {
        db.createObjectStore(DELETED_BOOKS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(LOGIN_INFO_STORE)) {
        db.createObjectStore(LOGIN_INFO_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(SESSION_INFO_STORE)) {
        db.createObjectStore(SESSION_INFO_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(READING_LOCATIONS_STORE)) {
        db.createObjectStore(READING_LOCATIONS_STORE, { keyPath: "bookId" });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

function saveBookToDB(db, book) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const bookWithId = {
      id: book.id || crypto.randomUUID(),
      title: book.title,
      author: book.author,
      cover: book.cover,
      notes: book.notes,
      sourceLanguage: book.sourceLanguage,
      targetLanguage: book.targetLanguage,
      chapters: book.chapters,
      lastModified: book.lastModified || Date.now(),
    };
    const request = store.put(bookWithId);

    request.onsuccess = () => resolve(bookWithId.id);
    request.onerror = () => reject(request.error);
  });
}

function getAllBooks() {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function deleteBookFromDB(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [STORE_NAME, DELETED_BOOKS_STORE, READING_LOCATIONS_STORE],
      "readwrite"
    );
    const bookStore = transaction.objectStore(STORE_NAME);
    const deletedStore = transaction.objectStore(DELETED_BOOKS_STORE);
    const readingLocationsStore = transaction.objectStore(
      READING_LOCATIONS_STORE
    );

    // Delete book from books store (if it exists)
    bookStore.delete(id);

    // Delete reading location for the book
    readingLocationsStore.delete(id);

    // Add book ID to deletedBooks store
    const addDeletedRequest = deletedStore.put({ id });

    addDeletedRequest.onsuccess = () => resolve();
    addDeletedRequest.onerror = () => reject(addDeletedRequest.error);
  });
}

function getDeletedBookIds() {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const transaction = db.transaction([DELETED_BOOKS_STORE], "readonly");
      const store = transaction.objectStore(DELETED_BOOKS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result.map((item) => item.id));
      request.onerror = () => reject(request.error);
    });
  });
}

function clearDeletedBookIds(db, ids) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DELETED_BOOKS_STORE], "readwrite");
    const store = transaction.objectStore(DELETED_BOOKS_STORE);

    const promises = ids.map((id) => {
      return new Promise((res, rej) => {
        const request = store.delete(id);
        request.onsuccess = () => res();
        request.onerror = () => rej(request.error);
      });
    });

    Promise.all(promises)
      .then(() => resolve())
      .catch((error) => reject(error));
  });
}

function saveReadingLocation(db, readingLocation) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([READING_LOCATIONS_STORE], "readwrite");
    const store = transaction.objectStore(READING_LOCATIONS_STORE);
    const locationData = {
      bookId: readingLocation.bookId,
      chapterId: readingLocation.chapterId || 0,
      sentenceId: readingLocation.sentenceId || 0,
      lastModified: readingLocation.lastModified || Date.now(),
    };
    const request = store.put(locationData);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function getReadingLocation(bookId) {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const transaction = db.transaction([READING_LOCATIONS_STORE], "readonly");
      const store = transaction.objectStore(READING_LOCATIONS_STORE);
      const request = store.get(bookId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function getAllReadingLocations() {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const transaction = db.transaction([READING_LOCATIONS_STORE], "readonly");
      const store = transaction.objectStore(READING_LOCATIONS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function saveLoginInfo(loginInfo) {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const transaction = db.transaction([LOGIN_INFO_STORE], "readwrite");
      const store = transaction.objectStore(LOGIN_INFO_STORE);
      const loginData = { ...loginInfo, id: "login" };
      const request = store.put(loginData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

function getLoginInfo() {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const transaction = db.transaction([LOGIN_INFO_STORE], "readonly");
      const store = transaction.objectStore(LOGIN_INFO_STORE);
      const request = store.get("login");

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function saveSessionInfo(sessionInfo) {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const transaction = db.transaction([SESSION_INFO_STORE], "readwrite");
      const store = transaction.objectStore(SESSION_INFO_STORE);
      const sessionData = { ...sessionInfo, id: "session" };
      const request = store.put(sessionData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

function getSessionInfo() {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const transaction = db.transaction([SESSION_INFO_STORE], "readonly");
      const store = transaction.objectStore(SESSION_INFO_STORE);
      const request = store.get("session");

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function clearSessionInfo() {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const transaction = db.transaction([SESSION_INFO_STORE], "readwrite");
      const store = transaction.objectStore(SESSION_INFO_STORE);
      const request = store.delete("session");

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

export {
  openDB,
  saveBookToDB,
  getAllBooks,
  deleteBookFromDB,
  getDeletedBookIds,
  clearDeletedBookIds,
  saveReadingLocation,
  getReadingLocation,
  getAllReadingLocations,
  saveLoginInfo,
  getLoginInfo,
  saveSessionInfo,
  getSessionInfo,
  clearSessionInfo,
};
