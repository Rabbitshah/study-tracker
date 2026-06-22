# Local Dev Setup

Step by step. No assumptions.

---

## Prerequisites

- Node.js 20+
- PostgreSQL 15+ running locally
- Git

Check:
```bash
node -v      # should be 20+
psql --version
git --version
```

---

## 1. Clone / Init Repo

```bash
mkdir study-tracker && cd study-tracker
git init

mkdir client server
```

---

## 2. Backend Setup

```bash
cd server
npm init -y

npm install express pg bcryptjs jsonwebtoken cors \
            express-rate-limit node-cron dotenv

npm install --save-dev nodemon
```

Add to `server/package.json`:
```json
"scripts": {
  "dev": "nodemon index.js",
  "start": "node index.js"
}
```

Create `server/.env`:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/study_tracker
JWT_SECRET=replace-with-32-char-random-string
JWT_REFRESH_SECRET=replace-with-different-32-char-string
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Generate secrets (run in terminal):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Run twice — one for JWT_SECRET, one for JWT_REFRESH_SECRET
```

---

## 3. Create Database

```bash
psql -U postgres
```

```sql
CREATE DATABASE study_tracker;
\c study_tracker
\q
```

Then run the schema:
```bash
psql -U postgres -d study_tracker -f server/src/config/schema.sql
```

---

## 4. Frontend Setup

```bash
cd ../client
npm create vite@latest . -- --template react

npm install tailwindcss @tailwindcss/vite \
            framer-motion \
            @mui/material @emotion/react @emotion/styled \
            zustand \
            @tanstack/react-query \
            axios \
            react-router-dom \
            recharts
```

Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

Update `client/vite.config.js`:
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()]
});
```

---

## 5. Run Both Servers

Terminal 1 (backend):
```bash
cd server
npm run dev
# Should print: Server running on port 5000
# Should print: [Cron] Midnight end-day job registered
```

Terminal 2 (frontend):
```bash
cd client
npm run dev
# Should print: Local: http://localhost:5173
```

---

## 6. Verify Setup

```bash
# Health check
curl http://localhost:5000/api/health
# Expected: {"status":"ok","timestamp":"..."}

# Register a test user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"password123"}'
# Expected: { user, accessToken, refreshToken }

# Check subjects were seeded
curl http://localhost:5000/api/subjects \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
# Expected: array of 4 subjects
```

Open `http://localhost:5173` → should show login page.

---

## 7. Test the Core Loop (Manual)

Do this before touching anything else:

1. Register → log in
2. On Today page: find GRE Quant, click +30
3. Verify progress bar updates
4. Click End Day → confirm
5. Check backlog: GRE Quant should show 15 min backlog (planned was 45, done was 30)
6. Tomorrow page: planned should be 45 + 15 = 60

If step 5–6 works, the app works.

---

## Common Issues

**PostgreSQL connection refused:**
```bash
# Check if postgres is running
pg_ctl status -D /usr/local/var/postgresql@15  # macOS Homebrew
sudo systemctl status postgresql               # Linux
# Start it if needed
brew services start postgresql@15             # macOS
sudo systemctl start postgresql               # Linux
```

**Port 5000 already in use:**
```bash
lsof -i :5000
kill -9 <PID>
# Or change PORT in server/.env
```

**Vite proxy issues:**
Add to `client/vite.config.js` if CORS problems in dev:
```javascript
server: {
  proxy: {
    '/api': 'http://localhost:5000'
  }
}
```
Then change `VITE_API_URL` to just `/api`.

**JWT errors:**
- Make sure `JWT_SECRET` is same value in .env and server code
- Access token expires in 15m — use the refresh flow or re-login

---

## Environment Variables Reference

### Server

| Variable | Required | Example |
|---|---|---|
| PORT | Yes | 5000 |
| DATABASE_URL | Yes | postgresql://postgres:pass@localhost:5432/study_tracker |
| JWT_SECRET | Yes | 64-char hex string |
| JWT_REFRESH_SECRET | Yes | Different 64-char hex string |
| JWT_EXPIRES_IN | Yes | 15m |
| JWT_REFRESH_EXPIRES_IN | Yes | 7d |
| CLIENT_URL | Yes | http://localhost:5173 |
| NODE_ENV | Yes | development or production |

### Client

| Variable | Required | Example |
|---|---|---|
| VITE_API_URL | Yes | http://localhost:5000/api |
