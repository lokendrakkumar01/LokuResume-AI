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
