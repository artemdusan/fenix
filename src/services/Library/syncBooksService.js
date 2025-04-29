import axios from "axios";
import {
  getAllBooks,
  saveBookToDB,
  getDeletedBookIds,
  openDB,
  clearDeletedBookIds,
  deleteBookFromDB,
  getLoginInfo,
  getSessionInfo,
  getAllReadingLocations,
  saveReadingLocation,
} from "./databaseService";

async function syncBooks() {
  try {
    const loginInfo = await getLoginInfo();
    if (!loginInfo?.serverAddress) {
      console.error("No server address found in login info");
      return {
        success: false,
        error: "No server address configured",
        newBookIds: [],
      };
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
      console.error("No session token found");
      return { success: false, error: "Not authenticated", newBookIds: [] };
    }

    // Get local books, deleted book IDs, and reading locations
    const localBooks = await getAllBooks();
    const localDeletedBookIds = await getDeletedBookIds();
    const localReadingLocations = await getAllReadingLocations();
    const newBookIds = []; // Track new or updated books

    // Step 1: Sync deleted books to server
    const deletedResponse = await axios.get(`${serverAddress}deleted-books`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const serverDeletedBookIds = deletedResponse.data.deletedBookIds;

    // Upload new local deleted books to server
    const newDeletedBookIds = localDeletedBookIds.filter(
      (id) => !serverDeletedBookIds.includes(id)
    );
    for (const deletedBookId of newDeletedBookIds) {
      await axios.post(
        `${serverAddress}deleted-books`,
        { bookId: deletedBookId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }

    // Clear uploaded deleted book IDs from local store
    const db = await openDB();
    await clearDeletedBookIds(db, newDeletedBookIds);

    // Step 2: Download and apply server deleted books to local
    const newServerDeletedBookIds = serverDeletedBookIds.filter(
      (id) => !localDeletedBookIds.includes(id)
    );
    for (const serverDeletedBookId of newServerDeletedBookIds) {
      await deleteBookFromDB(db, serverDeletedBookId); // This will add to deletedBooks store and remove reading location
    }

    // Step 3: Sync books
    const booksResponse = await axios.get(`${serverAddress}books`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const serverBooks = booksResponse.data.books;

    // Upload local books that are newer or missing on server
    for (const localBook of localBooks) {
      if (
        localDeletedBookIds.includes(localBook.id) ||
        serverDeletedBookIds.includes(localBook.id)
      ) {
        continue; // Skip deleted books
      }
      const serverBook = serverBooks.find((sb) => sb.id === localBook.id);
      if (!serverBook || localBook.lastModified > serverBook.lastModified) {
        await axios.post(
          `${serverAddress}books/${localBook.id}`,
          {
            title: localBook.title,
            author: localBook.author,
            cover: localBook.cover,
            notes: localBook.notes,
            sourceLanguage: localBook.sourceLanguage,
            targetLanguage: localBook.targetLanguage,
            chapters: localBook.chapters,
            lastModified: localBook.lastModified,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    }

    // Download server books that are newer or missing locally
    for (const serverBook of serverBooks) {
      if (serverDeletedBookIds.includes(serverBook.id)) {
        continue; // Skip deleted books
      }
      const localBook = localBooks.find((lb) => lb.id === serverBook.id);
      if (!localBook || serverBook.lastModified > localBook.lastModified) {
        const bookResponse = await axios.get(
          `${serverAddress}books/${serverBook.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const bookData = bookResponse.data;
        await saveBookToDB(db, {
          id: bookData.id,
          title: bookData.title,
          author: bookData.author,
          cover: bookData.cover,
          notes: bookData.notes,
          sourceLanguage: bookData.sourceLanguage,
          targetLanguage: bookData.targetLanguage,
          chapters: bookData.chapters,
          lastModified: bookData.lastModified,
        });
        newBookIds.push(bookData.id); // Track new or updated book
      }
    }

    // Step 4: Sync reading locations
    const readingLocationsResponse = await axios.get(
      `${serverAddress}reading-locations`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const serverReadingLocations =
      readingLocationsResponse.data.readingLocations;

    // Upload local reading locations that are newer or missing on server
    const readingLocationsToUpload = localReadingLocations.filter(
      (localLoc) => {
        if (
          localDeletedBookIds.includes(localLoc.bookId) ||
          serverDeletedBookIds.includes(localLoc.bookId)
        ) {
          return false; // Skip deleted books
        }
        const serverLoc = serverReadingLocations.find(
          (sl) => sl.bookId === localLoc.bookId
        );
        return !serverLoc || localLoc.lastModified > serverLoc.lastModified;
      }
    );

    if (readingLocationsToUpload.length > 0) {
      await axios.post(
        `${serverAddress}reading-locations`,
        { readingLocations: readingLocationsToUpload },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }

    // Download server reading locations that are newer or missing locally
    for (const serverLoc of serverReadingLocations) {
      if (serverDeletedBookIds.includes(serverLoc.bookId)) {
        continue; // Skip reading locations for deleted books
      }
      const localLoc = localReadingLocations.find(
        (ll) => ll.bookId === serverLoc.bookId
      );
      if (!localLoc || serverLoc.lastModified > localLoc.lastModified) {
        await saveReadingLocation(db, {
          bookId: serverLoc.bookId,
          chapterId: serverLoc.chapterId,
          sentenceId: serverLoc.sentenceId,
          lastModified: serverLoc.lastModified,
        });
      }
    }

    // Dispatch custom event with new book IDs
    const event = new CustomEvent("booksSynced", { detail: { newBookIds } });
    window.dispatchEvent(event);
    console.log("Dispatched booksSynced event with newBookIds:", newBookIds);

    return { success: true, newBookIds };
  } catch (error) {
    console.error("Sync error:", error);
    return { success: false, error: error.message, newBookIds: [] };
  }
}

export { syncBooks };
