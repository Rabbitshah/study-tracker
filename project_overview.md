# Study Tracker - Project Overview

The **Study Tracker** is a personal dashboard designed to track study progress across concurrent goals with hard deadlines. It features a unique "Backlog" system that accumulates missed study time and adds it to future targets, ensuring deadlines are met.

## Key Features
*   **Goal Tracking:** Manage multiple goals (e.g., GRE, Meta Android Developer cert, Unity Game Design) with specific weekday and weekend targets.
*   **Backlog System:** Automatically calculates the difference between planned and completed minutes. Under-studied time is added to a backlog and carried over to the next day, capped at 2x the daily target to prevent impossible goals.
*   **Authentication:** Custom JWT-based authentication using `bcrypt`, with silent token refreshes handled by an Axios interceptor.
*   **Database:** Relational storage using PostgreSQL (Neon DB) to efficiently manage users, subjects, logs, backlogs, and course progress.
*   **Automated Triggers:** Users can manually end their day, or a fallback `node-cron` job will run at midnight to close the day automatically.

## Tech Stack
*   **Frontend:** React (Vite), TanStack Query (caching & server state), Zustand (client state/auth). Deployed on Vercel.
*   **Backend:** Node.js, Express.js. Deployed on Render.
*   **Database:** PostgreSQL (Neon DB).

## Database Schema (Core Tables)
1.  **`users`**: Manages account details and authentication hashes.
2.  **`subjects`**: Tracks study topics, targets, priorities, and deadlines.
3.  **`daily_logs`**: Records daily planned vs. completed study minutes per subject.
4.  **`backlog`**: Persists accumulated missed minutes to optimize calculation.
5.  **`course_progress`**: Tracks sequence-locked course completions and total hours.

## Backend Architecture & API
The RESTful API provides several key domains:
*   `/api/auth`: Registration, login, token refresh, logout.
*   `/api/subjects`: CRUD operations for study subjects.
*   `/api/logs`: Logging daily progress, correcting history, and triggering the end-of-day process.
*   `/api/backlog` & `/api/progress`: Fetching backlog totals and generating chart datasets for streaks and progress overviews.
*   `/api/courses`: Managing sequence-locked course trees.

## Setup & Deployment
### Local Development
1. **Database:** Execute `server/src/config/schema.sql` on a Neon PostgreSQL instance.
2. **Server Environment:** Create `server/.env` with `DATABASE_URL`, JWT secrets, `CLIENT_URL=http://localhost:5173`, and `PORT=5000`.
3. **Client Environment:** Create `client/.env` with `VITE_API_URL=http://localhost:5000/api`.
4. **Run:** Execute `npm install` and `npm run dev` in both the `server` and `client` directories.

### Production
*   **Backend:** Deploy the `server` directory as a Web Service on Render. Set build command to `npm install` and start command to `node index.js`.
*   **Frontend:** Deploy the `client` directory on Vercel using the Vite framework preset. Ensure Vercel redirects are configured via `vercel.json`.
