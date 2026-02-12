# 🚀 LokuResume AI - Deployment Guide
## Test → GitHub → Render Hosting

---

## 📋 Table of Contents
1. [Local Testing](#step-1-local-testing)
2. [GitHub Push](#step-2-github-push)
3. [Render Deployment](#step-3-render-deployment)

---

## Step 1: Local Testing

### 1.1 Test Backend

Open **Terminal 1** and run:

```bash
cd "c:\Users\loken\Downloads\LokuResume AI\backend"
pip install -r requirements.txt
uvicorn main:app --reload
```

✅ **Expected Output:**
```
✅ Connected to MongoDB Atlas
🚀 LokuResume AI Backend Started
INFO:     Uvicorn running on http://127.0.0.1:8000
```

🧪 **Test API Documentation:**
- Open browser: `http://localhost:8000/docs`
- You should see FastAPI Swagger UI with all endpoints

---

### 1.2 Test Frontend

Open **Terminal 2** and run:

```bash
cd "c:\Users\loken\Downloads\LokuResume AI\frontend"
npm run dev
```

✅ **Expected Output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

### 1.3 Complete Test Flow

1. Open `http://localhost:5173`
2. Click **"Get Started"** → Sign up with test account
3. Fill in signup form:
   - Name: Test User
   - Email: test@example.com
   - Password: test123
4. ✅ Should auto-login and redirect to Dashboard
5. Click **"+ Create New Resume"**
6. Complete all 7 steps:
   - Step 1: Personal Info (fill all fields)
   - Step 2: Summary (write 50+ words)
   - Step 3: Add at least 1 education entry
   - Step 4: Add 5+ skills
   - Step 5: Add 2+ projects with descriptions
   - Step 6: (Optional) Add experience
   - Step 7: (Optional) Add certifications
7. Click **"Save Resume"**
8. ✅ Check your score (should show percentage with color)
9. If score < 65%: Improve content to unlock features
10. If score ≥ 65%: ✅ **"Duplicate" button appears**
11. Click **"Download PDF"** to test PDF generation

---

## Step 2: GitHub Push

### 2.1 Initialize Git Repository

Open terminal in project root:

```bash
cd "c:\Users\loken\Downloads\LokuResume AI"
git init
```

---

### 2.2 Create .gitignore (Already created!)

The project already has `.gitignore` files:
- ✅ `backend/.gitignore` - Excludes venv, .env, __pycache__
- ✅ `frontend/.gitignore` - Excludes node_modules, dist, .env

---

### 2.3 Stage and Commit

```bash
git add .
git commit -m "Initial commit: LokuResume AI - Full-stack resume builder"
```

---

### 2.4 Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `LokuResume-AI`
3. Description: `AI-powered resume builder with intelligent scoring`
4. Choose **Public** or **Private**
5. **DO NOT** initialize with README (we already have one)
6. Click **"Create repository"**

---

### 2.5 Push to GitHub

Copy the commands from GitHub (or use these):

```bash
git remote add origin https://github.com/YOUR_USERNAME/LokuResume-AI.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

✅ **Success:** Refresh GitHub page - you should see all files!

---

## Step 3: Render Deployment

### 3.1 Create Render Account

1. Go to https://render.com
2. Sign up with GitHub account (recommended)
3. Authorize Render to access your repositories

---

### 3.2 Deploy Backend (Web Service)

#### Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your `LokuResume-AI` repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `lokuresume-backend` |
| **Region** | Choose closest to you |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port 10000` |

#### Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**:

```
MONGO_URI=mongodb+srv://ekabad61_db_user:Fn44G732uiQoEXi4@cluster0.8e9vutv.mongodb.net/?appName=Cluster0
JWT_SECRET=LokuResume-Production-Secret-2026-Change-This-Key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
PORT=10000
FRONTEND_URL=https://lokuresume-frontend.onrender.com
```

**⚠️ Important:** You'll update `FRONTEND_URL` after deploying frontend.

4. Click **"Create Web Service"**
5. ⏳ Wait for deployment (5-10 minutes)
6. ✅ Copy your backend URL: `https://lokuresume-backend.onrender.com`

---

### 3.3 Deploy Frontend (Static Site)

#### Create Static Site

1. Click **"New +"** → **"Static Site"**
2. Connect your `LokuResume-AI` repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `lokuresume-frontend` |
| **Branch** | `main` |
| **Root Directory** | Leave blank |
| **Build Command** | `cd frontend && npm install && npm run build` |
| **Publish Directory** | `frontend/dist` |

#### Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**:

```
VITE_API_URL=https://lokuresume-backend.onrender.com
```

Replace with your actual backend URL from Step 3.2.

4. Click **"Create Static Site"**
5. ⏳ Wait for deployment (5-10 minutes)
6. ✅ Copy your frontend URL: `https://lokuresume-frontend.onrender.com`

---

### 3.4 Update Backend Environment

1. Go back to your **backend web service** on Render
2. Click **"Environment"** tab
3. Update `FRONTEND_URL`:
   ```
   FRONTEND_URL=https://lokuresume-frontend.onrender.com
   ```
4. Click **"Save Changes"**
5. Backend will automatically redeploy

---

### 3.5 Test Production Deployment

1. Open your frontend URL: `https://lokuresume-frontend.onrender.com`
2. Create a new account
3. Build a resume
4. Test all features:
   - ✅ Signup/Login
   - ✅ Resume creation
   - ✅ Score calculation
   - ✅ PDF download
   - ✅ Unlock at 65%+

---

## 🎉 Success Checklist

- ✅ Backend running locally at `http://localhost:8000`
- ✅ Frontend running locally at `http://localhost:5173`
- ✅ MongoDB connection successful
- ✅ Code pushed to GitHub
- ✅ Backend deployed to Render
- ✅ Frontend deployed to Render
- ✅ Production site accessible online
- ✅ All features working in production

---

## 🔧 Troubleshooting

### Backend Issues

**Problem:** MongoDB connection failed
```
Solution: Check MONGO_URI is correctly set in Render environment variables
```

**Problem:** CORS errors in browser console
```
Solution: Ensure FRONTEND_URL in backend matches your actual frontend URL
```

### Frontend Issues

**Problem:** API calls failing (404 or network error)
```
Solution: Check VITE_API_URL points to correct backend URL
```

**Problem:** White screen after deployment
```
Solution: Check browser console for errors, verify build completed successfully
```

### Render Deployment Issues

**Problem:** Build failing
```
Solution: Check Render logs, ensure all dependencies are in requirements.txt/package.json
```

**Problem:** Service not starting
```
Solution: Check start command matches exactly, PORT should be 10000 for backend
```

---

## 📱 Share Your App

Once deployed, share your app:

**Frontend URL:** `https://lokuresume-frontend.onrender.com`

**Features to highlight:**
- 🎯 AI-powered scoring (100 points)
- 💡 Smart improvement suggestions
- 📄 Professional PDF generation
- 🔓 Unlock system at 65%
- 📱 Fully responsive design

---

## 🔄 Future Updates

To deploy updates:

```bash
# Make your changes
git add .
git commit -m "Your update message"
git push origin main
```

Render will automatically redeploy! 🚀

---

## 📞 Need Help?

- **Render Docs:** https://render.com/docs
- **MongoDB Atlas:** https://www.mongodb.com/docs/atlas/
- **FastAPI Docs:** https://fastapi.tiangolo.com/

---

**Made with ❤️ by Lokenda Kumar**
