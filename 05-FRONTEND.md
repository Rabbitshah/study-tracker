# Frontend

React Vite. Dark theme. Mobile-first. All data via TanStack Query.

---

## Stack

```
React 18 + Vite
Tailwind CSS v4
Framer Motion       — sheet animations, card transitions
MUI                 — select, dialog, toast (Snackbar)
Zustand             — auth state only
TanStack Query      — all server state
react-router-dom    — routing
axios               — HTTP client
recharts            — weekly bar charts
```

---

## File Structure

```
client/src/
├── components/
│   ├── SubjectCard.jsx       # one per subject on Today page
│   ├── QuickLogButton.jsx    # floating global log button
│   ├── EndDayModal.jsx       # summary before confirming end day
│   ├── StreakBanner.jsx      # shows when streak >= 3
│   ├── BacklogBadge.jsx      # red pill showing owed minutes
│   ├── ProgressBar.jsx       # reusable colored progress bar
│   ├── NavBar.jsx            # bottom nav (mobile) + sidebar (desktop)
│   └── ui/                   # Button, Badge, Card, Toast
│
├── pages/
│   ├── Today.jsx
│   ├── Weekly.jsx
│   ├── Backlog.jsx
│   ├── Courses.jsx
│   ├── GRE.jsx
│   └── Settings.jsx
│
├── screens/
│   ├── Login.jsx
│   └── Register.jsx
│
├── store/
│   └── useAppStore.js        # Zustand: user, tokens, login, logout
│
├── services/
│   └── api.js                # axios instance, interceptors
│
├── hooks/
│   ├── useAuth.js            # session restore on mount
│   ├── useToday.js           # fetch today's logs
│   └── useBacklog.js         # fetch backlog totals
│
└── utils/
    ├── dateHelpers.js        # isWeekend(), formatDate(), todayStr()
    └── backlogCalc.js        # client-side status color logic
```

---

## Theme Colors (CSS Variables)

```css
/* client/src/index.css */
:root {
  --color-gre-quant:  #6366f1;
  --color-gre-verbal: #8b5cf6;
  --color-android:    #f59e0b;
  --color-unity:      #10b981;

  --color-bg:         #0f0f0f;
  --color-surface:    #1a1a1a;
  --color-surface-2:  #222222;
  --color-border:     #2a2a2a;
  --color-text:       #f0f0f0;
  --color-muted:      #888888;

  --color-success:    #22c55e;
  --color-warning:    #f59e0b;
  --color-danger:     #ef4444;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
}
```

---

## API Service

```javascript
// client/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

// Attach token on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          { refreshToken }
        );
        localStorage.setItem('accessToken', data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
```

---

## Auth Store

```javascript
// client/src/store/useAppStore.js
import { create } from 'zustand';

const useAppStore = create((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  login: (user, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, accessToken, isAuthenticated: true });
  },

  logout: () => {
    localStorage.clear();
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user })
}));

export default useAppStore;
```

---

## Pages

### Today (`/`)

**Data:** `GET /logs?date=YYYY-MM-DD`

**Layout:**
```
[Date header]        [WEEKDAY badge]
[Streak banner — only if streak >= 3]

[SubjectCard — GRE Quant]
[SubjectCard — GRE Verbal]
[SubjectCard — Meta Android]
[SubjectCard — Unity]

[Bottom bar: X / Y min total today]
[End Day button]
```

**SubjectCard props:**
```javascript
{
  subject: { id, name, color, weekday_target_minutes, ... },
  log: { planned_minutes, completed_minutes, day_ended },
  backlog: { accumulated_minutes },
  onLog: (subjectId, minutes) => void
}
```

**SubjectCard UI:**
- Color dot + name
- If `backlog.accumulated_minutes > 0`: red pill badge "+{n} min backlog"
- Progress bar: `completed_minutes / planned_minutes`, color = subject color
- Text: `{completed} / {planned} min`
- Buttons: `[+15]` `[+30]` `[+45]` `[+60]` + custom input
- Each button fires `POST /logs`, then invalidates `['today']` query

**End Day modal:**
```
Title: "End Day — June 20"
Table: subject | planned | done | result
  GRE Quant  | 90 min  | 45   | ⚠️ +45 min to backlog
  GRE Verbal | 45 min  | 60   | ✅ -15 min from backlog
  ...
[Cancel]  [Confirm End Day]
```

On confirm: `POST /logs/end-day`, invalidate all queries, show toast.

---

### Weekly (`/weekly`)

**Data:** `GET /progress/weekly` + `GET /progress/streak`

**7-day grid:**
- One cell per day (Mon through today or full week)
- Each cell: 4 colored mini-bars stacked (one per subject)
- Color = completion status:
  - Green: `completed >= planned`
  - Yellow: `50% <= completed < planned`
  - Red: `completed < 50% of planned`
  - Grey: no data / subject inactive

**Below grid:**
- Streak: "🔥 5 day streak" or "No current streak"
- Bar chart (recharts): x = days, y = minutes, grouped bars per subject
- Weekly totals table: subject | planned this week | done | %

---

### Backlog (`/backlog`)

**Data:** `GET /backlog`

**Per-subject card:**
- Subject name + color dot
- Backlog in minutes AND hours
- Color based on severity:
  - Green: 0 min
  - Yellow: 1–119 min (< 2 hrs)
  - Orange: 120–299 min (2–5 hrs)
  - Red: 300+ min (5+ hrs)
- "Clear" button → confirm dialog → `DELETE /backlog/:subject_id`

**Header:** Total backlog across all subjects in hours.

**Info note:** "Extra time logged today reduces this automatically."

---

### Courses (`/courses`)

**Data:** `GET /courses`

**Two sections:** Meta Android Developer | Unity Game Design

**Per section:**
- Title + overall % progress bar
- "On Track" / "Slightly Behind" / "Behind" badge (colored)
- Hours needed per day to finish on time

**Course list (ordered):**
```
[✅] 1. Introduction to Android...  12h / 12h  ██████ 100%
[🔒] 2. Version Control            0h / 15h   ░░░░░░   0%   [locked]
```

Lock icon if previous course not complete. "Mark Complete" button when unlocked.

---

### GRE (`/gre`)

**Data:** `GET /progress/gre`

**Two cards side by side (or stacked mobile):** GRE Quant | GRE Verbal

**Each card:**
- Hours logged this week
- Total hours logged
- Days remaining to Sept 30
- Weekly bar chart (recharts, Mon–Sun)
- Target vs actual line

---

### Settings (`/settings`)

**Data:** `GET /subjects`

**Sections:**

1. **Daily Targets** — per subject, editable weekday + weekend targets
   - On save: `PATCH /subjects/:id`

2. **Subject Status** — toggle active/inactive per subject

3. **Deadlines** — change deadline per subject

4. **Reset Backlog** — per subject, with confirm dialog → `DELETE /backlog/:subject_id`

5. **Account** — change password form

---

## QuickLogButton

Global floating button. Visible on all protected pages.

```
Position: fixed, bottom-right, z-index: 50
Icon: + (large, colored)

On tap:
  1. Framer Motion sheet slides up from bottom
  2. Subject grid (4 colored circles, pick one)
  3. Quick buttons: [+15] [+30] [+45] [+60] + custom input
  4. [Log] button → POST /logs → close sheet → toast
```

**Framer Motion config:**
```javascript
const sheetVariants = {
  hidden: { y: '100%', opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 30 } }
};
```

---

## NavBar

**Mobile (< 768px):** Fixed bottom, 6 icons
```
[🏠 Today] [📅 Weekly] [📋 Backlog] [📚 Courses] [📊 GRE] [⚙️ Settings]
```

**Desktop (>= 768px):** Left sidebar, icons + labels

Active state: subject color or accent highlight.

---

## Routing

```jsx
// App.jsx
<Routes>
  <Route path="/login"    element={<Login />} />
  <Route path="/register" element={<Register />} />

  {/* Protected — redirect to /login if !isAuthenticated */}
  <Route element={<ProtectedLayout />}>
    <Route path="/"         element={<Today />} />
    <Route path="/weekly"   element={<Weekly />} />
    <Route path="/backlog"  element={<Backlog />} />
    <Route path="/courses"  element={<Courses />} />
    <Route path="/gre"      element={<GRE />} />
    <Route path="/settings" element={<Settings />} />
  </Route>
</Routes>
```

`ProtectedLayout` renders `<NavBar />` + `<QuickLogButton />` + `<Outlet />`.

---

## Mobile Rules

- Minimum touch target: 44px height
- Minimum font size: 14px body, 16px inputs (prevents iOS zoom)
- SubjectCard quick buttons: full-width row on mobile
- End Day button: fixed bottom-center on mobile
- No horizontal overflow anywhere
- Test on 375px width (iPhone SE minimum)
