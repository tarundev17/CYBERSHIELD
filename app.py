import os, re, json, sqlite3, secrets, hashlib, hmac
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
from http import cookies
from datetime import datetime, timezone

BASE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE, 'cybershield.db')
HOST = os.environ.get('HOST', '0.0.0.0')
PORT = int(os.environ.get('PORT', '5000'))
DEFAULT_STATE = {'score': 0, 'scenariosDone': [], 'quizBest': 0, 'quizDone': 0, 'badgeIds': []}


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = db()
    conn.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        state_json TEXT NOT NULL,
        created_at TEXT NOT NULL
    )''')
    conn.execute('''CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )''')
    conn.execute('''CREATE TABLE IF NOT EXISTS mock_drills (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        phone_hint TEXT NOT NULL,
        otp_hash TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'sent',
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )''')
    conn.commit()
    conn.close()


def hash_password(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 180_000)
    return salt.hex(), digest.hex()


def verify_password(password, salt_hex, digest_hex):
    _, digest = hash_password(password, bytes.fromhex(salt_hex))
    return hmac.compare_digest(digest, digest_hex)


def valid_email(email):
    return bool(re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email))


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def payload(row):
    return {'id': row['id'], 'name': row['name'], 'email': row['email'], 'state': json.loads(row['state_json'])}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE, **kwargs)

    def log_message(self, fmt, *args):
        print(fmt % args)

    def send_json(self, status, data, extra_headers=None):
        raw = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(raw)))
        for k, v in (extra_headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(raw)

    def read_json(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length > 1_000_000:
                return None
            return json.loads(self.rfile.read(length) or b'{}')
        except Exception:
            return None

    def session_user(self):
        raw = self.headers.get('Cookie', '')
        jar = cookies.SimpleCookie()
        jar.load(raw)
        morsel = jar.get('cybershield_session')
        if not morsel:
            return None
        token = morsel.value
        conn = db()
        row = conn.execute('''SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id
                              WHERE s.token=? AND s.expires_at>?''', (token, now_iso())).fetchone()
        conn.close()
        return (token, row) if row else None

    def create_session(self, user_id):
        token = secrets.token_urlsafe(48)
        expires = datetime.now(timezone.utc).timestamp() + 7 * 24 * 60 * 60
        expires_iso = datetime.fromtimestamp(expires, timezone.utc).isoformat()
        conn = db()
        conn.execute('INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,?)', (token, user_id, expires_iso))
        conn.commit(); conn.close()
        return f'cybershield_session={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800'

    def clear_session(self):
        current = self.session_user()
        if current:
            conn = db(); conn.execute('DELETE FROM sessions WHERE token=?', (current[0],)); conn.commit(); conn.close()
        return 'cybershield_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'

    def do_POST(self):
        path = urlparse(self.path).path
        data = self.read_json()
        if data is None:
            return self.send_json(400, {'error': 'Invalid JSON.'})
        if path == '/api/register':
            name = str(data.get('name', '')).strip(); email = str(data.get('email', '')).strip().lower(); password = str(data.get('password', ''))
            if len(name) < 2: return self.send_json(400, {'error': 'Please enter your name.'})
            if not valid_email(email): return self.send_json(400, {'error': 'Please enter a valid email address.'})
            if len(password) < 8: return self.send_json(400, {'error': 'Password must be at least 8 characters.'})
            salt, digest = hash_password(password)
            conn = db()
            try:
                cur = conn.execute('INSERT INTO users(name,email,password_hash,salt,state_json,created_at) VALUES(?,?,?,?,?,?)',
                    (name,email,digest,salt,json.dumps(DEFAULT_STATE),now_iso()))
                conn.commit(); uid = cur.lastrowid
            except sqlite3.IntegrityError:
                conn.close(); return self.send_json(409, {'error': 'An account with this email already exists. Please log in.'})
            row = conn.execute('SELECT * FROM users WHERE id=?', (uid,)).fetchone(); conn.close()
            return self.send_json(201, {'user': payload(row)}, {'Set-Cookie': self.create_session(uid)})
        if path == '/api/login':
            email = str(data.get('email', '')).strip().lower(); password = str(data.get('password', ''))
            conn = db(); row = conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone(); conn.close()
            if not row or not verify_password(password, row['salt'], row['password_hash']):
                return self.send_json(401, {'error': 'Incorrect email or password.'})
            return self.send_json(200, {'user': payload(row)}, {'Set-Cookie': self.create_session(row['id'])})
        if path == '/api/logout':
            return self.send_json(200, {'ok': True}, {'Set-Cookie': self.clear_session()})
        if path == '/api/mock-otp/start':
            current = self.session_user()
            if not current:
                return self.send_json(401, {'error': 'Please log in to start the mock drill.'})
            phone = re.sub(r'\D', '', str(data.get('phone', '')))
            if len(phone) < 10:
                return self.send_json(400, {'error': 'Enter a dummy 10-digit phone number for the simulation.'})
            # Training-only OTP: it is never sent through SMS or any external service.
            otp = f'{secrets.randbelow(1_000_000):06d}'
            drill_id = secrets.token_urlsafe(18)
            salt = secrets.token_bytes(16)
            otp_digest = hashlib.pbkdf2_hmac('sha256', otp.encode(), salt, 80_000).hex() + ':' + salt.hex()
            created = datetime.now(timezone.utc)
            expires = created.timestamp() + 5 * 60
            conn = db()
            conn.execute('INSERT INTO mock_drills(id,user_id,phone_hint,otp_hash,created_at,expires_at) VALUES(?,?,?,?,?,?)',
                         (drill_id, current[1]['id'], phone[-4:], otp_digest, created.isoformat(), datetime.fromtimestamp(expires, timezone.utc).isoformat()))
            conn.commit(); conn.close()
            return self.send_json(201, {
                'drillId': drill_id,
                'phoneHint': '••••••' + phone[-4:],
                'otp': otp,
                'expiresInSeconds': 300,
                'message': f'CYBERSHIELD MOCK DRILL: Your simulated verification code is {otp}. This is training-only and is not a real SMS.'
            })
        if path == '/api/mock-otp/verify':
            current = self.session_user()
            if not current:
                return self.send_json(401, {'error': 'Please log in to continue.'})
            drill_id = str(data.get('drillId', ''))
            entered = str(data.get('otp', '')).strip()
            if not drill_id or not re.fullmatch(r'\d{6}', entered):
                return self.send_json(400, {'error': 'Enter the 6-digit simulated OTP.'})
            conn = db()
            row = conn.execute('SELECT * FROM mock_drills WHERE id=? AND user_id=?', (drill_id, current[1]['id'])).fetchone()
            if not row:
                conn.close(); return self.send_json(404, {'error': 'Mock drill not found.'})
            if row['status'] != 'sent':
                conn.close(); return self.send_json(400, {'error': 'This mock drill has already been completed or expired.'})
            if row['attempts'] >= 5 or row['expires_at'] <= now_iso():
                conn.execute("UPDATE mock_drills SET status='expired' WHERE id=?", (drill_id,)); conn.commit(); conn.close()
                return self.send_json(400, {'error': 'This simulated OTP has expired. Start a new drill.'})
            digest_hex, salt_hex = row['otp_hash'].split(':', 1)
            expected = hashlib.pbkdf2_hmac('sha256', entered.encode(), bytes.fromhex(salt_hex), 80_000).hex()
            if not hmac.compare_digest(expected, digest_hex):
                attempts = row['attempts'] + 1
                conn.execute('UPDATE mock_drills SET attempts=? WHERE id=?', (attempts, drill_id)); conn.commit(); conn.close()
                remaining = max(0, 5 - attempts)
                return self.send_json(400, {'error': 'Incorrect simulated OTP. Remember: never share a real OTP with anyone.', 'attemptsRemaining': remaining})
            conn.execute("UPDATE mock_drills SET status='completed' WHERE id=?", (drill_id,)); conn.commit(); conn.close()
            return self.send_json(200, {'ok': True, 'message': 'Mock drill completed. The OTP was entered only inside the CyberShield training simulation.'})
        self.send_json(404, {'error': 'Not found'})

    def do_PUT(self):
        if urlparse(self.path).path != '/api/state': return self.send_json(404, {'error': 'Not found'})
        current = self.session_user()
        if not current: return self.send_json(401, {'error': 'Not logged in.'})
        data = self.read_json() or {}
        state = {
            'score': max(0, int(data.get('score') or 0)),
            'scenariosDone': data.get('scenariosDone') if isinstance(data.get('scenariosDone'), list) else [],
            'quizBest': max(0, int(data.get('quizBest') or 0)),
            'quizDone': max(0, int(data.get('quizDone') or 0)),
            'badgeIds': data.get('badgeIds') if isinstance(data.get('badgeIds'), list) else []
        }
        conn = db(); conn.execute('UPDATE users SET state_json=? WHERE id=?', (json.dumps(state), current[1]['id'])); conn.commit(); conn.close()
        self.send_json(200, {'state': state})

    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/api/me':
            current = self.session_user(); return self.send_json(200, {'user': payload(current[1]) if current else None})
        if path == '/api/state':
            current = self.session_user()
            if not current: return self.send_json(401, {'error': 'Not logged in.'})
            return self.send_json(200, {'state': json.loads(current[1]['state_json'])})
        if path.startswith('/api/'):
            return self.send_json(404, {'error': 'Not found'})
        return super().do_GET()


if __name__ == '__main__':
    init_db()
    print(f'CyberShield running at http://{HOST}:{PORT}')
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
