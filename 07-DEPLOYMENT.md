# Deployment

Backend → Render. Frontend → Vercel. Database → Render PostgreSQL (free tier).

---

## Prerequisites

- GitHub repo with `client/` and `server/` as subdirectories
- Render account (render.com)
- Vercel account (vercel.com)

---

## 1. Deploy Database (Render PostgreSQL)

1. Go to Render dashboard → New → PostgreSQL
2. Name: `study-tracker-db`
3. Plan: Free (sufficient for personal use)
4. Region: pick closest to you
5. Click Create Database
6. **Copy the "Internal Database URL"** — you'll need this for the backend

Once created, run the schema:
- Open database in Render → Connect → PSQL Command
- Paste and run the full contents of `server/src/config/schema.sql`

---

## 2. Deploy Backend (Render Web Service)

### Prepare for deploy

Add `server/Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "index.js"]
```

Make sure `server/index.js` uses `process.env.PORT`:
```javascript
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
```

Make sure pg connection handles SSL:
```javascript
// server/src/config/db.js
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});
```

Push to GitHub:
```bash
git add .
git commit -m "feat: ready for deploy"
git push origin main
```

### Deploy on Render

1. New → Web Service
2. Connect your GitHub repo
3. Settings:
   - **Root Directory:** `server`
   - **Runtime:** Node (or Docker if you added Dockerfile)
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
4. Add environment variables (under Environment tab):

```
PORT=10000
DATABASE_URL=<internal URL from Render PostgreSQL>
JWT_SECRET=<your 64-char string>
JWT_REFRESH_SECRET=<your other 64-char string>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=https://your-app.vercel.app
NODE_ENV=production
```

5. Click Create Web Service
6. Wait for deploy (2–5 min first time)
7. Test: `https://your-app.onrender.com/api/health` → should return `{"status":"ok",...}`

**Note:** Free tier Render services spin down after 15 min of inactivity. First request after sleep takes ~30 sec. Acceptable for personal use.

---

## 3. Deploy Frontend (Vercel)

Add `client/vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This is critical — without it, refreshing on any route other than `/` gives 404.

### Deploy on Vercel

1. Go to vercel.com → New Project
2. Import your GitHub repo
3. Settings:
   - **Root Directory:** `client`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add environment variable:
   ```
   VITE_API_URL=https://your-render-backend.onrender.com/api
   ```
5. Click Deploy
6. After deploy, copy your Vercel URL (e.g. `https://study-tracker-xyz.vercel.app`)

### Update backend CORS

Go back to Render → your backend service → Environment:
```
CLIENT_URL=https://study-tracker-xyz.vercel.app
```

Trigger redeploy (or it redeploys automatically).

---

## 4. Verify Production

```bash
# Health
curl https://your-render-backend.onrender.com/api/health

# Register
curl -X POST https://your-render-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Maanav","email":"maanavshah09@gmail.com","password":"yourpassword"}'
```

Open `https://study-tracker-xyz.vercel.app` → register → login → check Today page loads with 4 subjects.

---

## 5. Custom Domain (Optional)

**Vercel:**
- Settings → Domains → Add your domain
- Add CNAME record in your DNS provider pointing to `cname.vercel-dns.com`

---

## Ongoing Deployments

- **Backend changes:** Push to GitHub → Render auto-deploys on main branch push
- **Frontend changes:** Push to GitHub → Vercel auto-deploys on main branch push
- **Database schema changes:** Run SQL manually in Render PostgreSQL console (no migration tool configured — add one if schema changes become frequent)

---

## Cost

| Service | Plan | Cost |
|---|---|---|
| Render Web Service | Free | $0 (spins down after 15 min idle) |
| Render PostgreSQL | Free | $0 (90 day limit on free tier — after that ~$7/mo) |
| Vercel | Hobby | $0 |
| **Total** | | **$0 initially, ~$7/mo after 90 days** |

If you want always-on backend (no spin-down): Render Starter plan = $7/mo.

---

## Troubleshooting Prod Issues

**CORS errors in browser:**
- Check `CLIENT_URL` in Render env matches exact Vercel URL (no trailing slash)
- Check CORS middleware in `app.js` uses `process.env.CLIENT_URL`

**401 on all requests:**
- Check `VITE_API_URL` in Vercel points to correct Render URL
- Must include `/api` at end: `https://your-app.onrender.com/api`

**Database connection errors:**
- Check `DATABASE_URL` is the Internal URL from Render (not External)
- External URL is for connecting from your local machine only

**Frontend shows blank page:**
- Check `vercel.json` exists in `client/` directory
- Check build logs in Vercel for errors
