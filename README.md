# CyberShield – Cyber Safety & Digital Banking Awareness Platform

CyberShield is an educational web prototype for learning about common online banking scams.

## Technology
- Frontend: HTML, CSS, JavaScript
- Backend: **Python** (`http.server`)
- Database: **SQLite**
- Authentication: email + password with salted PBKDF2-SHA256 password hashes
- Sessions: secure random server-side session tokens stored in SQLite
- Mock OTP drill: Python-generated, database-tracked training OTP; no real SMS is sent

## Run the project

1. Make sure Python 3.9+ is installed.
2. Open a terminal inside this folder.
3. Run:
```bash
python run.py
```
4. Open `http://localhost:5000` in your browser.

No Node.js and no external Python packages are required.

## Login features
- Create a real account with name, email and password.
- Passwords are never stored as plain text.
- Wrong passwords are rejected by the backend.
- Login/logout uses server-side sessions.
- Each account has its own saved learning progress in SQLite.
- The database (`cybershield.db`) is created automatically.

## Important
This is an educational prototype. Do not enter real banking credentials, OTPs, PINs or other sensitive information.


## Mock OTP Drill
- Log in first, then open **Mock OTP**.
- Enter a dummy 10-digit number only.
- CyberShield generates a random 6-digit training OTP on the Python backend.
- The OTP is displayed as a simulated SMS inside the website; no SMS provider or mobile network is used.
- Enter the simulated OTP to complete the drill and earn safety-score points.
- OTP attempts are limited and the training code expires after 5 minutes.
- Never enter a real OTP, PIN, password or banking details.
