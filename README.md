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

   Edit `.firebaserc` in your project root:

```json
{
  "projects": {
    "default": "my-firebase-project"
  },
  "targets": {},
  "etags": {}
}
```

Replace `my-firebase-project` with your Firebase project ID.

3. **Set Firebase Secrets**

```bash
firebase functions:secrets:set MY_FIREBASE_API_KEY
```

Enter your Firebase API key when prompted (find it in Firebase Console > Project Settings > General > Web API Key).

```bash
firebase functions:secrets:set JWT_SECRET
```

Enter a random, secure string (e.g., generate using openssl rand -base64 32).

4. **Deploy to Firebase**

```bash
firebase deploy --only functions
```

5. **User Management and Login**

- **Add Users**: Use the Firebase Authentication panel in the Firebase Console to add users with email and password credentials.
- **Find Server Address**: After deployment, locate the server address in the Firebase Console under the Functions section
- **Login and Sync**: In the client application, enter the server address, email, and password to log in to the server and sync book data and reading progress across devices.
