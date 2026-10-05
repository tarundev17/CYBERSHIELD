# CyberShield – Cyber Safety & Digital Banking Awareness Platform

CyberShield is a college B.Tech educational web project for learning about common online banking scams and safer digital habits.

## Technology
- Frontend: HTML, CSS, JavaScript
- Backend: Python (`http.server`)
- Database: SQLite
- Authentication: email + password with salted PBKDF2-SHA256 password hashes
- Sessions: server-side session tokens stored in SQLite
- Security verification: Python-generated, database-tracked 6-digit verification code

## Run locally

1. Install Python 3.9+.
2. Open a terminal inside this project folder.
3. Run:
```bash
python run.py
```
4. Open `http://localhost:5000`.

No Node.js or external Python packages are required.

## Login
- Create an account with name, email and password.
- Passwords are never stored as plain text.
- Login validates credentials on the Python backend.
- Login/logout uses server-side sessions.
- Learning progress is stored per account in SQLite.

## Security Verification
- Log in first, then open **Security Verification**.
- Use a dummy 10-digit phone number for the college project.
- The backend creates a 6-digit verification code and stores only its protected hash.
- The code expires after 5 minutes and has a limited number of attempts.
- No real SMS or banking service is contacted.

## Important
This is an educational college project. Never enter real banking credentials, OTPs, PINs or other sensitive information.
