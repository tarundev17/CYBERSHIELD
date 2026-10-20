# CyberShield – Cyber Safety & Digital Banking Awareness Platform

CyberShield is a college B.Tech educational web project for learning about common online banking scams and safer digital habits.

## Technology
- Frontend: HTML, CSS, JavaScript
- Authentication: Firebase Authentication (email/password + required email verification)
- Backend: Python (`http.server`)
- Database: SQLite (stores user profile and learning progress; Firebase UID links the account)
- Server verifies Firebase ID tokens before allowing access to saved progress.

## Setup Firebase (required once)
1. Open the Firebase Console and create/select a project.
2. In **Authentication → Sign-in method**, enable **Email/Password**.
3. In **Authentication → Settings → Authorized domains**, add your deployed Render hostname (for example, `your-app.onrender.com`).
4. In **Project settings → General → Your apps**, create a Web app and copy its configuration into `firebase-config.js` (replace every `YOUR_...` value).
5. In **Project settings → Service accounts**, generate a private key for the Firebase Admin SDK. Keep this JSON secret; do not put it in the ZIP or `firebase-config.js`.
6. Set the environment variable `FIREBASE_SERVICE_ACCOUNT_JSON` to the complete service-account JSON in your local environment or Render's **Environment** settings. Treat it as a secret.
7. Deploy/restart the Python app after setting the environment variable.

Email verification is sent by Firebase. Users cannot log in to CyberShield until they click the verification link. The first verified login creates their SQL profile row.

## Run locally
1. Install Python 3.9+.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Configure `firebase-config.js` and set `FIREBASE_SERVICE_ACCOUNT_JSON` in your shell before running.
4. Run:
   ```bash
   python run.py
   ```
5. Open `http://localhost:5000`.

## Data and security notes
- SQLite stores the Firebase UID, verified email, display name, and learning progress; passwords are managed by Firebase and are not stored in SQLite.
- The backend checks Firebase ID tokens and requires `email_verified` before accessing saved data.
- Learning progress is saved per verified account in SQLite.
- The Security Verification page is an educational OTP-awareness simulation only. It does not send SMS and must not be used for real banking OTPs.
- Never place the Firebase service-account private key in frontend files, GitHub, or a public ZIP. Use environment variables.

## Learning features
- Learn page includes YouTube awareness videos and topic-search links.
- Simulator includes beginner, intermediate and advanced scenarios.
- Quiz question bank includes practice questions.
- Guest progress resets on logout; verified signed-in progress remains saved per account.
- YouTube embeds require internet access and may be unavailable if the publisher disables embedding.
