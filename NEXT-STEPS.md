# Study Tracker — What To Do Next

> Everything is written. Nothing is running yet. Follow this in order.

---

## 1. Drop In Your Neon Connection String

Open [`server/.env`](file:///d:/Projects/Tracker/server/.env) and replace the `DATABASE_URL` line:

```env
DATABASE_URL=postgresql://your-neon-connection-string-here
```

> You said you'd provide the Neon API/connection string. Paste it here before anything else.

Also generate your JWT secrets (run this twice in any terminal — use each output for one variable):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Fill them in:
```env
JWT_SECRET=<first output>
JWT_REFRESH_SECRET=<second output>
```

---

## 2. Run the Database Schema

This creates all 5 tables and indexes in Neon. Run once:

```bash
# Option A — using psql (if installed)
psql "your-neon-connection-string" -f server/src/config/schema.sql

# Option B — paste the contents of server/src/config/schema.sql
# directly into the Neon SQL Editor at console.neon.tech
```

Confirm these tables exist: `users`, `subjects`, `daily_logs`, `backlog`, `course_progress`

---

## 3. Start the Backend

```bash
cd server
npm run dev
```

Expected output:
```
[Server] Running on port 5000 (development)
[Cron] Midnight end-day job registered (00:01 UTC daily)
```

**Test it:**
```bash
curl http://localhost:5000/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

---

## 4. Test the Core API (curl)

Register a user — this auto-seeds 4 subjects + 17 courses:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Maanav","email":"maanavshah09@gmail.com","password":"yourpassword"}'
```

Copy the `accessToken` from the response, then:

```bash
# Check subjects were seeded (should return 4)
curl http://localhost:5000/api/subjects \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Check courses were seeded (should return 12 Android + 5 Unity)
curl http://localhost:5000/api/courses \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**If these return data, the backend is fully working.**

---

## 5. Start the Frontend

```bash
cd client
npm run dev
```

Open `http://localhost:5173`

---

## 6. Test the Core Loop (Do This Before Anything Else)

This is the only thing that matters for day 1:

1. **Register** at `/register` → should land on Today page with 4 subject cards
2. **Click +30** on GRE Quant → progress bar should update
3. **Click End Day** → modal should show "45 planned / 30 done / +15 min added to backlog"
4. **Confirm** → check the Backlog page, GRE Quant should show 15 min owed
5. **The next day**, Today page should show GRE Quant planned = 45 + 15 = 60 min

> If step 4 works, the entire app is working.

---

## What's Already Done ✅

### Backend — all files written, no code changes needed

| File | Status |
|---|---|
| `server/src/config/schema.sql` | ✅ Written |
| `server/src/config/db.js` | ✅ Written |
| `server/src/config/seed.js` | ✅ Written (4 subjects + 17 courses) |
| `server/src/services/backlogService.js` | ✅ Written — core backlog logic |
| `server/src/jobs/midnightEndDay.js` | ✅ Written — 00:01 cron |
| `server/src/controllers/auth.controller.js` | ✅ Written |
| `server/src/controllers/subjects.controller.js` | ✅ Written |
| `server/src/controllers/logs.controller.js` | ✅ Written |
| `server/src/controllers/backlog.controller.js` | ✅ Written |
| `server/src/controllers/progress.controller.js` | ✅ Written |
| `server/src/controllers/courses.controller.js` | ✅ Written |
| `server/src/routes/*` | ✅ All 6 route files written |
| `server/src/middleware/*` | ✅ auth.middleware + errorHandler |
| `server/src/app.js` + `server/index.js` | ✅ Written |
| `server/Dockerfile` | ✅ Written (for Render deploy) |
| `server/package.json` | ✅ Written |
| `server/.env` | ⚠️ **Needs your Neon URL + JWT secrets** |

### Frontend — all files written, builds clean (1105 modules, 0 errors)

| File | Status |
|---|---|
| `client/src/index.css` | ✅ Dark theme tokens + utilities |
| `client/src/services/api.js` | ✅ Axios + silent token refresh |
| `client/src/store/useAppStore.js` | ✅ Zustand auth store |
| `client/src/hooks/useAuth.js` | ✅ Session restore on mount |
| `client/src/screens/Login.jsx` | ✅ Written |
| `client/src/screens/Register.jsx` | ✅ Written |
| `client/src/App.jsx` | ✅ All routes + protected layout |
| `client/src/pages/Today.jsx` | ✅ Core page |
| `client/src/pages/Weekly.jsx` | ✅ 7-day grid + chart |
| `client/src/pages/Backlog.jsx` | ✅ Severity-colored cards |
| `client/src/pages/Courses.jsx` | ✅ Locked sequence + on-track |
| `client/src/pages/GRE.jsx` | ✅ Stats + bar chart |
| `client/src/pages/Settings.jsx` | ✅ Target editor + backlog reset |
| `client/src/components/SubjectCard.jsx` | ✅ +15/30/45/60 + progress bar |
| `client/src/components/EndDayModal.jsx` | ✅ Animated summary + confirm |
| `client/src/components/QuickLogButton.jsx` | ✅ Global FAB + bottom sheet |
| `client/src/components/NavBar.jsx` | ✅ Bottom (mobile) + sidebar (desktop) |
| `client/src/components/StreakBanner.jsx` | ✅ Shows when streak ≥ 3 |
| `client/.env` | ✅ Points to localhost:5000 |
| `client/vercel.json` | ✅ SPA rewrites for Vercel |

---

## What's Pending ❌

| Item | Blockers | Notes |
|---|---|---|
| **Neon connection string** | You need to provide it | Drop into `server/.env` |
| **Schema run on Neon** | Needs connection string | Run `schema.sql` once |
| **First login test** | Needs both servers running | Follow step 6 above |
| **Integration audit** | After core loop is working | Check all endpoints fire correctly |
| **Mobile polish pass** | After integration audit | Touch targets, overflow, breakpoints |
| **Deploy to Render + Vercel** | After local is working | Follow `07-DEPLOYMENT.md` |

---

## Deployment (When Ready)

### Backend → Render
1. Push repo to GitHub
2. New Web Service → root directory: `server`
3. Build command: `npm install` | Start: `node index.js`
4. Add env vars (same as `server/.env` but with Neon's **production** URL)
5. Set `NODE_ENV=production`, `PORT=10000`

### Frontend → Vercel
1. New Project → root directory: `client`
2. Framework: Vite
3. Add env var: `VITE_API_URL=https://your-render-backend.onrender.com/api`
4. Deploy

After both are live:
- Update `CLIENT_URL` in Render to your Vercel URL
- Update `VITE_API_URL` in Vercel to your Render URL

---

## Known Issues / Notes

- **Render free tier spins down** after 15 min idle — first request takes ~30s. Acceptable for personal use.
- **Render PostgreSQL free tier** has a 90-day limit, then ~$7/mo.
- The cron job runs at **00:01 UTC** — that's 05:31 IST. Users who forget End Day get auto-processed then.
- If you switch from Neon (dev) to Render PostgreSQL (prod), just swap the `DATABASE_URL`.

---

## Quick Reference

```bash
# Start backend
cd server && npm run dev

# Start frontend  
cd client && npm run dev

# Health check
curl http://localhost:5000/api/health

# Register test user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Maanav","email":"test@test.com","password":"password123"}'
```
