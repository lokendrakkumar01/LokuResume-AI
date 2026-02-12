# LokuResume AI

**Build Smart. Score High. Get Hired.**

> Created by Lokenda Kumar

---

## Overview

LokuResume AI is a full-stack AI-powered Resume Builder that helps users create ATS-optimized resumes with intelligent scoring and suggestions. The platform features a 7-step resume builder, comprehensive scoring algorithm (100 points across 6 categories), and unlocks advanced features when users achieve a 65%+ score.

## Features

✨ **Multi-Step Resume Builder** - Easy 7-step process  
🎯 **Smart Scoring** - 100-point evaluation across 6 categories  
💡 **AI Suggestions** - Intelligent content improvements  
🔓 **Unlock System** - Premium features at 65%+ score  
📄 **PDF Export** - Professional ATS-friendly downloads  
📱 **Fully Responsive** - Works on all devices  
🔐 **Secure** - JWT authentication, password hashing  

---

## Tech Stack

### Frontend
- React.js (Vite)
- React Router
- Axios
- Modern CSS with responsive design

### Backend
- Python 3.10+
- FastAPI
- Motor (Async MongoDB driver)
- JWT Authentication
- Bcrypt password hashing
- ReportLab (PDF generation)

### Database
- MongoDB Atlas

---

## Local Development Setup

### Prerequisites
- Node.js 16+ and npm
- Python 3.10+
- MongoDB Atlas account

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment (optional but recommended):
```bash
python -m venv venv
venv\Scripts\activate  # On Windows
source venv/bin/activate  # On Mac/Linux
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file:
```env
MONGO_URI=mongodb+srv://ekabad61_db_user:Fn44G732uiQoEXi4@cluster0.8e9vutv.mongodb.net/?appName=Cluster0
JWT_SECRET=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FRONTEND_URL=http://localhost:5173
PORT=8000
```

5. Run the backend server:
```bash
uvicorn main:app --reload
```

Backend will run at: `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
VITE_API_URL=http://localhost:8000
```

4. Run the development server:
```bash
npm run dev
```

Frontend will run at: `http://localhost:5173`

---

## Deployment to Render

### Backend Deployment (Web Service)

1. Create a new **Web Service** on Render
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 10000`
   - **Environment Variables**:
     ```
     MONGO_URI=mongodb+srv://ekabad61_db_user:Fn44G732uiQoEXi4@cluster0.8e9vutv.mongodb.net/?appName=Cluster0
     JWT_SECRET=your-production-secret-key-here
     JWT_ALGORITHM=HS256
     ACCESS_TOKEN_EXPIRE_MINUTES=1440
     FRONTEND_URL=https://your-frontend-url.onrender.com
     PORT=10000
     ```

### Frontend Deployment (Static Site)

1. Create a new **Static Site** on Render
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`
   - **Environment Variables**:
     ```
     VITE_API_URL=https://your-backend-url.onrender.com
     ```

---

## API Documentation

### Authentication Endpoints

**POST** `/auth/signup`
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**POST** `/auth/login`
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

### Resume Endpoints (JWT Protected)

**POST** `/resumes` - Create resume  
**GET** `/resumes` - Get all user resumes  
**GET** `/resumes/{id}` - Get specific resume  
**PUT** `/resumes/{id}` - Update resume  
**DELETE** `/resumes/{id}` - Delete resume  
**POST** `/resumes/{id}/duplicate` - Duplicate resume (requires 65%+ score)  
**POST** `/resumes/{id}/generate` - AI-enhance resume  
**GET** `/resumes/{id}/download` - Download PDF  

---

## Resume Scoring System (100 Points)

| Category | Points | Criteria |
|----------|--------|----------|
| **Professional Summary** | 15 | Word count (50-150), action verbs, measurable achievements |
| **Skills Quality** | 20 | Quantity (5-8+), diversity across categories |
| **Projects Impact** | 20 | Measurable results, technology mentions, quality descriptions |
| **Experience Strength** | 20 | Action verbs, quantifiable impact, strong descriptions |
| **Keyword Optimization** | 15 | ATS keywords, industry terms, relevance |
| **Formatting** | 10 | Completeness, structure, professional presentation |

### Score Thresholds

- **< 50%** ❌ Red - Needs significant improvement
- **50-64%** ⚠️ Orange - Good, needs refinement  
- **65%+** ✅ Green - Excellent, unlocks advanced features

---

## Smart Unlock System

When resume score reaches **65%**, users unlock:

- ✅ Multiple resume templates
- ✅ Resume duplication feature
- ✅ Advanced customization options
- ✅ Priority AI suggestions

---

## Project Structure

```
LokuResume AI/
├── backend/
│   ├── auth/                 # JWT and password hashing
│   ├── models/              # Pydantic models
│   ├── routes/              # API endpoints
│   ├── services/            # Business logic
│   ├── main.py              # FastAPI app
│   ├── config.py            # Configuration
│   ├── database.py          # MongoDB connection
│   └── requirements.txt     # Python dependencies
│
└── frontend/
    ├── src/
    │   ├── context/         # React context (Auth)
    │   ├── pages/           # Page components
    │   ├── styles/          # CSS files
    │   ├── App.jsx          # Main app component
    │   ├── main.jsx         # Entry point
    │   └── config.js        # Frontend config
    └── package.json         # npm dependencies
```

---

## Security Features

✓ JWT token authentication  
✓ Bcrypt password hashing  
✓ Input validation (Pydantic)  
✓ CORS configuration  
✓ Protected API endpoints  
✓ Environment variable secrets  

---

## Future Features (Architecture Ready)

- AI Interview Preparation
- ATS Resume Checker
- Skill Gap Analyzer
- LinkedIn Optimizer
- Job Recommendation Engine
- Portfolio Generator

---

## Database Schema

### Users Collection
```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string (unique)",
  "hashed_password": "string",
  "created_at": "datetime"
}
```

### Resumes Collection
```json
{
  "_id": "ObjectId",
  "user_id": "string",
  "personal_info": {...},
  "summary": "string",
  "education": [...],
  "skills": [...],
  "projects": [...],
  "experience": [...],
  "certifications": [...],
  "score": "number",
  "score_breakdown": {...},
  "suggestions": [...],
  "missing_keywords": [...],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

---

## License

© 2026 LokuResume AI. Created by Lokenda Kumar.

---

## Support

For issues or questions, please open an issue on the GitHub repository.

**Made with ❤️ by Lokenda Kumar**
