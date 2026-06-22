# Study Tracker — What's Left & What Can Be Added

> This document covers: bugs to fix, missing pieces, and optional enhancements.
> Items are ordered from most critical to nice-to-have.

---

## 🔴 Must Do (Before Using Daily)

### 1. Test the Core Loop End-to-End
The backend and frontend are both running but the loop hasn't been manually verified yet in the browser.

**Steps:**
1. Open `http://localhost:5173` → sign in
2. Tap `+30` on GRE Quant
3. Click **End Day** → confirm
4. Go to Backlog → GRE Quant should show 15 min owed
5. The next day → Today page GRE Quant should show 45 + 15 = 60 min planned

> If this works, the app is fully functional.

---

### 2. Fix Deadline Timezone Offset
**Problem:** Deadlines display as Sept 29 instead of Sept 30 (UTC offset issue — stored as UTC, displayed without offset correction).

**Where:** `server/src/config/seed.js` — deadline strings are stored as `'2026-09-30'` but PostgreSQL `DATE` type + JavaScript `new Date()` applies UTC→local shift.

**Fix:** In the frontend, when displaying dates, parse with:
```js
// Instead of new Date(dateStr) which shifts by timezone
new Date(dateStr + 'T00:00:00')  // already done in dateHelpers.js
```
The actual fix is in `courses.controller.js` — change:
```js
// Current — shifts timezone
const deadline = DEADLINES[certKey];
```
To use date-only string comparisons instead of `new Date()` objects.

---

### 3. Today Page — Token Expiry on First Load
**Problem:** The `useAuth` hook calls `GET /subjects` to validate the token. But access tokens expire in 15 min. On first load after expiry, the interceptor should silently refresh — verify this works correctly or the user may get redirected to login unexpectedly.

**Fix if broken:** Change `useAuth.js` to use a dedicated `/api/auth/me` endpoint instead of `/api/subjects` for validation.

---

### 4. Add `.gitignore`
Currently both `.env` files would be committed to git.

```bash
# Create d:/Projects/Tracker/.gitignore
node_modules/
.env
dist/
.DS_Store
```

---

## 🟡 Should Do (Before Showing to Anyone / Deploying)

### 5. Mobile Touch Target Audit
- Verify all buttons are ≥ 44px height on a real phone (or DevTools mobile simulation)
- End Day button: check it's not hidden behind the bottom nav on very small screens (375px)
- Quick Log FAB: check it doesn't overlap the bottom nav

### 6. Empty States
Currently if data is empty the pages show nothing. Add:
- Today: "No subjects active — go to Settings to enable some"
- Weekly: "No logs yet — start tracking today"
- Backlog: "You're all caught up! 🎉" (if all zeros)
- Courses: Loading skeleton or placeholder

### 7. Input Validation on Settings Page
- Prevent saving `weekday_target_minutes = 0` for GRE subjects (GRE priority = 1, should never have 0 target)
- Prevent deadline being set in the past

### 8. Handle `day_ended = true` State on Today Page
Currently if the day is ended, the subject cards still show log buttons (they just don't submit). The UI should clearly indicate "Day ended" and disable all inputs.

**Fix:** In `SubjectCard.jsx`, the `!log.day_ended` check hides buttons but the card still looks interactive. Add a full overlay or "greyed out" state.

### 9. Error Toast for Failed API Calls
Currently errors are only logged to console. Add a global error toast so the user sees "Failed to log — try again" instead of silent failure.

---

## 🟢 Nice To Have (Future Improvements)

### 10. `GET /auth/me` Endpoint
A dedicated lightweight endpoint to verify token and return user data — cleaner than using `/subjects` for auth validation.

```js
// server/src/routes/auth.routes.js
router.get('/me', authMiddleware, (req, res) => {
  res.json({ id: req.user.id, email: req.user.email });
});
```

### 11. Manual Log Override (Correction Flow)
Right now `POST /logs` always adds minutes. If a user accidentally logs 60 min twice, they need to use `PATCH /logs/:id` — but there's no UI for this.

**Add to SubjectCard or Settings:** An "Edit today's log" option that shows a number input to set (not add) completed minutes.

### 12. Partial Day Support
If you study 20 min in the morning and 25 min at night, two taps work fine. But there's no way to see the log history (what time each session was logged). Optional: add a `session_logs` table with timestamps.

### 13. Weekly Target View on Today Page
Show a small "Week: 2h 15m / 5h 15m" running total somewhere on the Today page so you know where you stand for the whole week without switching tabs.

### 14. GRE Page — Study Plan Generator
Based on days remaining and daily target:
```
You need 320 more hours of GRE prep.
At 45 min/day, you'll finish in 427 days — that's past your deadline.
Recommended: 75 min/day
```

### 15. Courses Page — Update Hours (not just Mark Complete)
Currently you can only mark a course 100% done. Add a way to log partial progress (e.g., "I'm 8 hours into this 15-hour course").

**The API already supports it** (`PATCH /courses/:id` with `completed_hours`) — just needs a UI input field.

### 16. Push Notifications / Reminder
A daily reminder at a set time (e.g., 9 AM) that says "You haven't logged yet today" — only feasible as a browser notification or a separate service.

### 17. Dark/Light Theme Toggle
The whole app is dark. Some users may want light mode. Trivial to add using the existing CSS token system — just add a `[data-theme="light"]` selector block.

### 18. Export to CSV
Export all daily logs as a CSV for review in spreadsheets.

---

## 🚀 Deployment (When Local Loop is Verified)

### Backend → Render

1. Push `server/` to GitHub
2. New Web Service on [render.com](https://render.com)
3. **Root directory:** `server`
4. **Build:** `npm install` | **Start:** `node index.js`
5. Add environment variables:
   ```
   DATABASE_URL=<same Neon string>
   JWT_SECRET=<same as .env>
   JWT_REFRESH_SECRET=<same as .env>
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   CLIENT_URL=https://your-app.vercel.app
   NODE_ENV=production
   PORT=10000
   ```

### Frontend → Vercel

1. Push `client/` to GitHub (or same repo)
2. New Project on [vercel.com](https://vercel.com)
3. **Root directory:** `client` | **Framework:** Vite
4. Add environment variable:
   ```
   VITE_API_URL=https://your-render-service.onrender.com/api
   ```
5. Deploy

### After Both Are Live
- Update `CLIENT_URL` in Render to your actual Vercel URL
- Update `VITE_API_URL` in Vercel to your actual Render URL
- Test register → end day → check backlog on the deployed URLs

> ⚠️ Render free tier spins down after 15 min idle. First request takes ~30s cold start. Acceptable for personal use.

---

## Priority Order

```
1. ✅ Test core loop in browser         → TODAY
2. Fix deadline timezone display        → TODAY
3. Add .gitignore                       → TODAY
4. Verify token refresh works           → TODAY
5. Mobile touch target audit            → This week
6. Empty states                         → This week
7. Log override UI                      → This week
8. Deploy to Render + Vercel            → When ready
9. Everything else                      → Later
```
