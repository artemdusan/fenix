# Fenix Dual Book Reader

`Fenix Dual Book Reader` is an app that lets you read books in two languages, sentence by sentence. It’s perfect for language learners and bilingual readers.

The app consists of three components:

- **Reader** – Read dual-language books with synchronized sentence-by-sentence display and built-in text-to-speech (TTS) support.
- **Editor** – Convert any `.epub` book into a dual-language format using OpenAI for sentence alignment and translation.
- **Server (optional)** – Sync your books and reading progress across multiple devices.

---

# Firebase Functions Server for Book Sync

## Setup and Deployment Tutorial

### Prerequisites

- Node.js installed
- Firebase CLI installed (`npm install -g firebase-tools`)

### Step-by-Step Setup

1. **Login to Firebase**

   ```bash
   firebase login
   ```

   Authenticate via the browser prompt.

2. **Configure Firebase Project**

   Create a new project using the Firebase Console.  
   Then edit the `.firebaserc` file in your project root:

   ```json
   {
     "projects": {
       "default": "my-firebase-project"
     },
     "targets": {},
     "etags": {}
   }
   ```

   Replace `"my-firebase-project"` with your actual Firebase project ID.

3. **Set Firebase Secrets**

   Set your Firebase Web API key:

   ```bash
   firebase functions:secrets:set MY_FIREBASE_API_KEY
   ```

   Enter the key found in **Firebase Console > Project Settings > General > Web API Key**.

   Set a secure JWT secret:

   ```bash
   firebase functions:secrets:set JWT_SECRET
   ```

   You can generate a secure secret using:

   ```bash
   openssl rand -base64 32
   ```

4. **Deploy to Firebase**

   ```bash
   firebase deploy
   ```

5. **User Management and Login**

   - **Add Users**: Use the Firebase Authentication panel in the Firebase Console to add users with email and password credentials.
   - **Find Server Address**: After deployment, find the server address in the Firebase Console under the **Functions** section.
   - **Login and Sync**: In the client application, enter the server address, email, and password to log in and sync book data and reading progress across devices.
