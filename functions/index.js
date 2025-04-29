const functions = require("firebase-functions/v2");
const admin = require("firebase-admin");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const axios = require("axios");
const express = require("express");
const cors = require("cors");
const { defineSecret } = require("firebase-functions/params");
const jwt = require("jsonwebtoken");

// Define secrets
const MY_FIREBASE_API_KEY = defineSecret("MY_FIREBASE_API_KEY");
const JWT_SECRET = defineSecret("JWT_SECRET");

// Initialize Firebase Admin SDK
try {
  admin.initializeApp();
  console.log("Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
}

const db = getFirestore();
const app = express();

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      "http://localhost:5173",
      "https://user-dashboard-5ee1f.web.app",
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("CORS blocked for origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.use(express.json());
app.use((req, res, next) => {
  if (req.path === "/auth/login" || req.path === "/auth/check-validity") {
    return next();
  }
  authenticate(req, res, next);
});

// Middleware to verify JWT
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split("Bearer ")[1];
    const jwtSecret = JWT_SECRET.value();

    // Check if token is blacklisted
    const blacklistRef = db.collection("jwtBlacklist").doc(token);
    const blacklistDoc = await blacklistRef.get();
    if (blacklistDoc.exists) {
      return res.status(401).json({ error: "Unauthorized: Token invalidated" });
    }

    const decoded = jwt.verify(token, jwtSecret);
    req.auth = { uid: decoded.uid };

    const userRecord = await getAuth().getUser(decoded.uid);
    if (userRecord.disabled) {
      throw new Error("User account is disabled");
    }

    next();
  } catch (error) {
    console.error("Authentication error:", {
      error: error.message,
      code: error.code,
      uid: req.auth?.uid || "unknown",
    });
    if (
      error.code === "auth/user-not-found" ||
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        error: "Unauthorized: Invalid or expired token",
      });
    }
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

// POST /auth/login: Authenticate user with email/password and return JWT
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const firebaseApiKey = MY_FIREBASE_API_KEY.value();

    const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`;
    let idToken;

    try {
      const response = await axios.post(signInUrl, {
        email,
        password,
        returnSecureToken: true,
      });
      idToken = response.data.idToken;
    } catch (error) {
      console.error("REST API error:", error.response?.data || error.message);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const decodedToken = await getAuth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    let userRecord;
    try {
      userRecord = await getAuth().getUser(uid);
      if (userRecord.disabled) {
        return res.status(401).json({ error: "User account is disabled" });
      }
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        return res.status(401).json({ error: "User account deleted" });
      }
      throw error;
    }

    const expiresIn = 31536000 * 1000; // 1 year in milliseconds
    const jwtSecret = JWT_SECRET.value();
    const token = jwt.sign({ uid: userRecord.uid }, jwtSecret, {
      expiresIn: expiresIn / 1000,
    });

    // Store the issued JWT in Firestore
    const tokenId = db.collection("issuedJwts").doc().id;
    await db.collection("issuedJwts").doc(tokenId).set({
      userId: userRecord.uid,
      token,
      issuedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("Login: JWT issued and stored for user:", uid);

    res.json({
      uid: userRecord.uid,
      email: userRecord.email,
      token,
      expiresAt: Date.now() + expiresIn,
      message: "Successfully authenticated",
    });
  } catch (error) {
    console.error("Login error:", {
      error: error.message,
      code: error.code,
      email: req.body.email || "unknown",
    });
    if (
      error.code === "auth/invalid-id-token" ||
      error.code === "auth/user-not-found"
    ) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/logout: Invalidate JWT
app.post("/auth/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(400).json({ error: "No token provided" });
    }

    const token = authHeader.split("Bearer ")[1];

    // Add token to blacklist
    await db.collection("jwtBlacklist").doc(token).set({
      invalidatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Remove token from issuedJwts
    const issuedTokensQuery = await db
      .collection("issuedJwts")
      .where("token", "==", token)
      .get();
    const batch = db.batch();
    issuedTokensQuery.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    res.json({ message: "Successfully logged out" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/logout-all: Invalidate all sessions for the current user
app.post("/auth/logout-all", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(400).json({ error: "No token provided" });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = jwt.verify(token, JWT_SECRET.value());
    const uid = decoded.uid;

    // Revoke Firebase refresh tokens
    await getAuth().revokeRefreshTokens(uid);

    // Get all issued JWTs for the user
    const issuedTokensQuery = await db
      .collection("issuedJwts")
      .where("userId", "==", uid)
      .get();

    // Blacklist all tokens and delete from issuedJwts
    const batch = db.batch();
    issuedTokensQuery.docs.forEach((doc) => {
      const token = doc.data().token;
      batch.set(db.collection("jwtBlacklist").doc(token), {
        invalidatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      batch.delete(doc.ref);
    });
    await batch.commit();

    console.log("Logout-all: Invalidated all JWTs for user:", uid);

    res.json({ message: "Successfully logged out from all devices" });
  } catch (error) {
    console.error("Logout all devices error:", error);
    if (error.code === "auth/user-not-found") {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /auth/check-validity: Check if the current JWT is valid
app.get("/auth/check-validity", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Check-validity: No token provided");
      return res.json({ isValid: false });
    }

    const token = authHeader.split("Bearer ")[1];
    const jwtSecret = JWT_SECRET.value();

    // Check if token is blacklisted
    const blacklistRef = db.collection("jwtBlacklist").doc(token);
    const blacklistDoc = await blacklistRef.get();
    if (blacklistDoc.exists) {
      console.log("Check-validity: Token is blacklisted");
      return res.json({ isValid: false });
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      console.log("Check-validity: Token valid for user:", decoded.uid);
      return res.json({ isValid: true });
    } catch (error) {
      console.error("Check-validity: Token verification error:", {
        message: error.message,
        code: error.code,
      });
      return res.json({ isValid: false });
    }
  } catch (error) {
    console.error("Check-validity: Unexpected error:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return res.json({ isValid: false });
  }
});

// Helper functions
async function isBookDeleted(userId, bookId) {
  const docRef = db.collection("deletedBooks").doc(bookId);
  const doc = await docRef.get();
  return doc.exists && doc.data().ownerId === userId;
}

async function getDeletedBookIds(userId) {
  const deletedSnapshot = await db
    .collection("deletedBooks")
    .where("ownerId", "==", userId)
    .select()
    .get();
  return deletedSnapshot.docs.map((doc) => doc.id);
}

// GET /deleted-books
app.get("/deleted-books", async (req, res) => {
  try {
    const deletedBookIds = await getDeletedBookIds(req.auth.uid);
    res.json({ deletedBookIds });
  } catch (error) {
    console.error("Error fetching deleted books:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /deleted-books
app.post("/deleted-books", async (req, res) => {
  try {
    const { bookId } = req.body;
    if (!bookId) {
      return res.status(400).json({ error: "bookId is required" });
    }

    const docRef = db.collection("deletedBooks").doc(bookId);
    await docRef.set(
      {
        bookId,
        ownerId: req.auth.uid,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Delete book and its chapters
    await db.collection("books").doc(bookId).delete();
    const chaptersSnapshot = await db
      .collection("books")
      .doc(bookId)
      .collection("chapters")
      .get();
    const batch = db.batch();
    chaptersSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Delete reading location for the book
    const readingLocRef = db
      .collection("readingLocations")
      .doc(`${req.auth.uid}_${bookId}`);
    await readingLocRef.delete();

    res.json({ bookId, status: "deleted" });
  } catch (error) {
    console.error("Error deleting book:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /books
app.get("/books", async (req, res) => {
  try {
    const deletedBookIds = await getDeletedBookIds(req.auth.uid);
    const booksSnapshot = await db
      .collection("books")
      .where("ownerId", "==", req.auth.uid)
      .select("title", "author", "lastModified")
      .get();

    const books = booksSnapshot.docs
      .filter((doc) => !deletedBookIds.includes(doc.id))
      .map((doc) => ({
        id: doc.id,
        title: doc.data().title,
        author: doc.data().author,
        lastModified: doc.data().lastModified || 0,
      }));

    res.json({ books });
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /books/:bookId
app.get("/books/:bookId", async (req, res) => {
  try {
    const { bookId } = req.params;
    if (await isBookDeleted(req.auth.uid, bookId)) {
      return res.status(404).json({ error: "Book is deleted" });
    }

    const bookRef = db.collection("books").doc(bookId);
    const bookDoc = await bookRef.get();

    if (!bookDoc.exists || bookDoc.data().ownerId !== req.auth.uid) {
      return res.status(404).json({ error: "Book not found" });
    }

    const chaptersSnapshot = await bookRef
      .collection("chapters")
      .orderBy("index")
      .get();
    const chapters = chaptersSnapshot.docs.map((doc) => ({
      title: doc.data().title,
      content: doc.data().content,
    }));

    res.json({
      id: bookDoc.id,
      title: bookDoc.data().title,
      author: bookDoc.data().author,
      cover: bookDoc.data().cover,
      notes: bookDoc.data().notes,
      sourceLanguage: bookDoc.data().sourceLanguage,
      targetLanguage: bookDoc.data().targetLanguage,
      chapters,
      lastModified: bookDoc.data().lastModified || 0,
    });
  } catch (error) {
    console.error("Error fetching book:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /books/:bookId
app.post("/books/:bookId", async (req, res) => {
  try {
    const { bookId } = req.params;
    const {
      title,
      author,
      cover,
      notes,
      sourceLanguage,
      targetLanguage,
      chapters,
      lastModified = Date.now(),
    } = req.body;

    if (!title || !author || !Array.isArray(chapters)) {
      return res
        .status(400)
        .json({ error: "Title, author, and chapters are required" });
    }

    if (await isBookDeleted(req.auth.uid, bookId)) {
      return res.status(400).json({ error: "Cannot update deleted book" });
    }

    const bookRef = db.collection("books").doc(bookId);
    const bookDoc = await bookRef.get();
    const serverBook = bookDoc.exists ? bookDoc.data() : null;

    if (!serverBook || lastModified > serverBook.lastModified) {
      // Update book metadata
      await bookRef.set(
        {
          title,
          author,
          cover: cover || "",
          notes: notes || "",
          sourceLanguage: sourceLanguage || "",
          targetLanguage: targetLanguage || "",
          ownerId: req.auth.uid,
          lastModified,
        },
        { merge: true }
      );

      // Update chapters
      const batch = db.batch();
      const chaptersRef = bookRef.collection("chapters");

      // Delete existing chapters
      const existingChapters = await chaptersRef.get();
      existingChapters.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Add new chapters
      chapters.forEach((chapter, index) => {
        const chapterRef = chaptersRef.doc(`${index}`);
        batch.set(chapterRef, {
          index,
          title: chapter.title || "",
          content: chapter.content || [],
        });
      });

      await batch.commit();
    }

    const updatedBook = await bookRef.get();
    const updatedChapters = await bookRef
      .collection("chapters")
      .orderBy("index")
      .get();
    const chaptersResponse = updatedChapters.docs.map((doc) => ({
      title: doc.data().title,
      content: doc.data().content,
    }));

    res.json({
      id: updatedBook.id,
      title: updatedBook.data().title,
      author: updatedBook.data().author,
      cover: updatedBook.data().cover,
      notes: updatedBook.data().notes,
      sourceLanguage: updatedBook.data().sourceLanguage,
      targetLanguage: updatedBook.data().targetLanguage,
      chapters: chaptersResponse,
      lastModified: updatedBook.data().lastModified,
    });
  } catch (error) {
    console.error("Error updating book:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /reading-locations
app.get("/reading-locations", async (req, res) => {
  try {
    const locSnapshot = await db
      .collection("readingLocations")
      .where("userId", "==", req.auth.uid)
      .get();

    const readingLocations = locSnapshot.docs.map((doc) => ({
      bookId: doc.data().bookId,
      chapterId: doc.data().chapterId,
      sentenceId: doc.data().sentenceId,
      lastModified: doc.data().lastModified || 0,
    }));

    res.json({ readingLocations });
  } catch (error) {
    console.error("Error fetching reading locations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /reading-locations
app.post("/reading-locations", async (req, res) => {
  try {
    const locations = Array.isArray(req.body.readingLocations)
      ? req.body.readingLocations
      : [req.body];
    if (locations.length === 0) {
      return res
        .status(400)
        .json({ error: "At least one reading location is required" });
    }

    const deletedBookIds = await getDeletedBookIds(req.auth.uid);
    const updatedLocations = [];
    const skippedLocations = [];

    for (const loc of locations) {
      if (!loc.bookId || loc.chapterId == null || loc.sentenceId == null) {
        skippedLocations.push({
          bookId: loc.bookId || "unknown",
          reason: "Missing required fields",
        });
        continue;
      }

      if (deletedBookIds.includes(loc.bookId)) {
        skippedLocations.push({
          bookId: loc.bookId,
          reason: "Book is deleted",
        });
        continue;
      }

      const docId = `${req.auth.uid}_${loc.bookId}`;
      const docRef = db.collection("readingLocations").doc(docId);
      const doc = await docRef.get();
      const serverLoc = doc.exists ? doc.data() : null;

      const lastModified = loc.lastModified || Date.now();
      if (!serverLoc || lastModified > serverLoc.lastModified) {
        await docRef.set(
          {
            userId: req.auth.uid,
            bookId: loc.bookId,
            chapterId: loc.chapterId,
            sentenceId: loc.sentenceId,
            lastModified,
          },
          { merge: true }
        );
      }

      updatedLocations.push({
        bookId: loc.bookId,
        chapterId: loc.chapterId,
        sentenceId: loc.sentenceId,
        lastModified,
      });
    }

    res.json({ readingLocations: updatedLocations, skippedLocations });
  } catch (error) {
    console.error("Error updating reading locations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Export API
exports.api = functions.https.onRequest(
  {
    secrets: ["MY_FIREBASE_API_KEY", "JWT_SECRET"],
  },
  app
);
