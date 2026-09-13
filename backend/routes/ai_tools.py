from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional
from services.ai_suggestions import ai_suggestions
from services.resume_scorer import scorer
import re

router = APIRouter(prefix="/ai", tags=["AI Tools"])

class BulletEnhanceRequest(BaseModel):
    text: str
    context: Optional[str] = "project"  # "project", "experience", "summary"

class BulletEnhanceResponse(BaseModel):
    original: str
    enhanced: str
    variations: List[str]

class JDAnalysisRequest(BaseModel):
    resume_summary: Optional[str] = ""
    resume_skills: List[str] = []
    job_description: str

class JDAnalysisResponse(BaseModel):
    match_score: float
    matching_keywords: List[str]
    missing_keywords: List[str]
    recommendations: List[str]

@router.post("/enhance-bullet", response_model=BulletEnhanceResponse)
async def enhance_bullet(request: BulletEnhanceRequest):
    """Generate high-impact ATS optimized bullet variations for project or experience descriptions"""
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    enhanced = ai_suggestions.enhance_resume_text(text, context=request.context)
    
    # Create 3 distinct bullet point variations
    variations = [
        enhanced,
        f"Spearheaded {text.lower()} by applying industry best practices, boosting team productivity and project delivery speed by 35%.",
        f"Architected and implemented {text.lower()}, optimizing workflow efficiency and serving 1,000+ active users with high reliability."
    ]
    
    return BulletEnhanceResponse(
        original=text,
        enhanced=enhanced,
        variations=variations
    )

@router.post("/analyze-jd", response_model=JDAnalysisResponse)
async def analyze_job_description(request: JDAnalysisRequest):
    """Analyze resume skills and summary against a target Job Description to compute ATS match score"""
    jd_text = request.job_description.lower()
    if not jd_text.strip():
        raise HTTPException(status_code=400, detail="Job description text cannot be empty")
    
    # Extract candidate keywords from JD using regex word boundaries
    words = re.findall(r'\b[a-z]{3,}\b', jd_text)
    
    # Filter out common stop words
    stop_words = {'the', 'and', 'for', 'with', 'that', 'this', 'you', 'will', 'have', 'from', 'are', 'your', 'our', 'work', 'team', 'company'}
    candidate_keywords = list(set([w for w in words if w not in stop_words and len(w) > 3]))[:25]
    
    resume_text = (request.resume_summary + " " + " ".join(request.resume_skills)).lower()
    
    matching = [kw for kw in candidate_keywords if kw in resume_text]
    missing = [kw for kw in candidate_keywords if kw not in resume_text]
    
    score = (len(matching) / max(len(candidate_keywords), 1)) * 100
    
    recommendations = []
    if missing:
        recommendations.append(f"Consider adding missing keywords: {', '.join(missing[:5])}")
    if score < 60:
        recommendations.append("Tailor your professional summary to reflect terms mentioned in the job post.")
    else:
        recommendations.append("Strong ATS alignment detected for this job post!")
        
    return JDAnalysisResponse(
        match_score=round(score, 1),
        matching_keywords=matching,
        missing_keywords=missing[:8],
        recommendations=recommendations
    )


class AIChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None

class AIChatResponse(BaseModel):
    reply: str
    suggestions: List[str] = []

@router.post("/chat-assist", response_model=AIChatResponse)
async def ai_chat_assist(request: AIChatRequest):
    """Interactive AI Career & ATS Coach chatbot answering questions via text or voice"""
    msg = request.message.strip().lower()
    if not msg:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    reply = ""
    suggestions = []

    # 1. ATS Score & Optimization Queries
    if any(k in msg for k in ["score", "ats", "rank", "badhaye", "improve", "increase"]):
        reply = (
            "To achieve an ATS score above 90%+, follow these 4 proven rules:\n"
            "1. **Use Google's XYZ Formula**: 'Accomplished [X] as measured by [Y], by doing [Z]'. Always include numbers (e.g., 'reduced latency by 45%', 'serving 15,000+ users').\n"
            "2. **Include 10-15 Core Skills**: Match job posting requirements exactly.\n"
            "3. **Keep Formatting Clean**: Use single-column modern layouts with clear headings (Experience, Projects, Education).\n"
            "4. **Add Coding Profiles & Links**: Include GitHub, LeetCode, or portfolio links."
        )
        suggestions = [
            "Write a summary for Full Stack Engineer",
            "Give me 5 strong action verbs",
            "What skills to add for Cybersecurity?"
        ]

    # 2. Professional Summary Requests
    elif any(k in msg for k in ["summary", "about me", "intro", "parichay", "bio"]):
        reply = (
            "Here is a high-converting ATS summary template you can use:\n\n"
            "\"Innovative and results-driven Software Engineer with 4+ years of experience designing and deploying scalable microservices, cloud systems, and modern web applications. Proven track record reducing API latency by 40% and optimizing AWS cloud infrastructure costs. Passionate about AI integration and agile delivery.\""
        )
        suggestions = [
            "How to improve my ATS score?",
            "Suggest bullet points for project",
            "What is the STAR method for interviews?"
        ]

    # 3. Action Verbs & Bullet Points
    elif any(k in msg for k in ["verb", "bullet", "point", "project", "experience", "describe"]):
        reply = (
            "Replace weak phrases like 'worked on' or 'helped with' with these high-impact power verbs:\n"
            "• **Architected & Deployed**: 'Architected distributed event streaming pipeline processing 25k events/sec.'\n"
            "• **Spearheaded**: 'Spearheaded frontend migration to React & TypeScript, boosting page load speeds by 50%.'\n"
            "• **Automated**: 'Automated CI/CD pipelines reducing deployment cycle time from 4 hours to 15 minutes.'\n"
            "• **Engineered**: 'Engineered scalable REST APIs in FastAPI with 99.98% uptime SLA.'"
        )
        suggestions = [
            "How to format projects for ATS?",
            "Skills for Frontend Developer",
            "How to get 90%+ ATS Score?"
        ]

    # 4. Cybersecurity specific
    elif any(k in msg for k in ["cyber", "security", "soc", "penetration", "ethical"]):
        reply = (
            "For a standout Cybersecurity resume, highlight these technical skills & certifications:\n"
            "• **Core Skills**: Network Security, SIEM (Splunk, Sentinel), Vulnerability Assessment (Nessus, Burp Suite), Incident Response, Wireshark, Linux, Python Scripting.\n"
            "• **High-Value Certifications**: CompTIA Security+, CEH, CISSP, eJPT, AWS Certified Security.\n"
            "• **Bullet Example**: 'Monitored 1,000+ endpoints via SIEM, investigating and neutralizing 150+ security incidents with zero data breach incidents.'"
        )
        suggestions = [
            "Write summary for Cybersecurity Analyst",
            "How to improve my ATS score?",
            "What is STAR interview method?"
        ]

    # 5. Full Stack / Frontend / Backend
    elif any(k in msg for k in ["full stack", "fullstack", "react", "python", "frontend", "backend", "developer", "engineer"]):
        reply = (
            "For Full-Stack Engineering roles, prioritize:\n"
            "• **Frontend**: React.js, TypeScript, Next.js, Tailwind CSS, State Management (Redux/Zustand).\n"
            "• **Backend**: Python (FastAPI/Django), Node.js, REST APIs, GraphQL, Microservices.\n"
            "• **Databases & DevOps**: PostgreSQL, MongoDB, Redis, Docker, Kubernetes, AWS, Git, CI/CD.\n"
            "Tip: Ensure every project lists both frontend AND backend technologies clearly!"
        )
        suggestions = [
            "How to improve my ATS score?",
            "Write a summary for Full Stack Engineer",
            "Give me 5 strong action verbs"
        ]

    # 6. Interview Preparation & STAR Method
    elif any(k in msg for k in ["interview", "star", "question", "tayari", "hr", "tips"]):
        reply = (
            "Master the **STAR Method** for behavioral and technical interviews:\n"
            "• **S (Situation)**: Set the scene and context (1-2 sentences).\n"
            "• **T (Task)**: What challenge or objective were you responsible for?\n"
            "• **A (Action)**: Specific technologies and architectural decisions YOU implemented.\n"
            "• **R (Result)**: Quantifiable business outcome (e.g., 'improved throughput by 35%').\n"
            "Practice structuring answers within 90-120 seconds!"
        )
        suggestions = [
            "How to improve my ATS score?",
            "Write a summary for Full Stack Engineer",
            "Skills for Cybersecurity"
        ]

    # 7. Default / Conversational
    else:
        reply = (
            f"Hello! I am your LokiResume AI Career & ATS Coach. "
            f"I can help you boost your ATS score, write impactful Google XYZ bullet points, recommend high-demand skills, or tailor your resume to any job posting. "
            f"You can also use the microphone icon 🎙️ to ask me anything with your voice!"
        )
        suggestions = [
            "How to improve my ATS score?",
            "Write a summary for Full Stack Engineer",
            "Give me 5 strong action verbs",
            "What skills to add for Cybersecurity?"
        ]

    return AIChatResponse(reply=reply, suggestions=suggestions)
