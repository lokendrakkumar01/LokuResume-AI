from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class PersonalInfo(BaseModel):
    name: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    location: Optional[str] = ""  # City, State / Country
    linkedin: Optional[str] = ""
    github: Optional[str] = ""
    leetcode: Optional[str] = ""
    portfolio: Optional[str] = ""
    headline: Optional[str] = ""  # Custom headline/title
    problem_solving: Optional[str] = ""  # Problem Solving & Data Structures link (e.g. GFG, HackerRank)
    profile_photo: Optional[str] = ""  # Base64 encoded image or URL

class Education(BaseModel):
    degree: Optional[str] = ""
    college: Optional[str] = ""
    year: Optional[str] = ""
    grade: Optional[str] = ""

class Project(BaseModel):
    title: Optional[str] = ""
    technologies: Optional[str] = ""
    description: Optional[str] = ""
    repository_url: Optional[str] = ""
    live_demo_url: Optional[str] = ""
    date: Optional[str] = ""  # Year or date range e.g. "2025"

class Experience(BaseModel):
    company: Optional[str] = ""
    role: Optional[str] = ""
    duration: Optional[str] = ""
    description: Optional[str] = ""

class Certification(BaseModel):
    name: Optional[str] = ""
    file_data: Optional[str] = ""  # Base64 encoded certificate
    file_url: Optional[str] = ""  # URL for certificate file (optional)
    issued_by: Optional[str] = ""
    date: Optional[str] = ""
    link: Optional[str] = ""  # Proof link / Certificate verification URL
    skills_learned: Optional[str] = ""  # e.g. "Java", "Ethical Hacking"

class Achievement(BaseModel):
    title: Optional[str] = ""
    description: Optional[str] = ""
    date: Optional[str] = ""
    link: Optional[str] = ""  # URL for achievement proof/details / certificate link

class CodingProfile(BaseModel):
    platform: Optional[str] = ""
    link: Optional[str] = ""
    headline: Optional[str] = ""  # e.g. "Max Rating: 1600" or "5 Star"

class PDFPreferences(BaseModel):
    background_color: str
    accent_color: str

class Resume(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    personal_info: PersonalInfo
    education: List[Education]
    experience: List[Experience]
    projects: List[Project]
    skills: List[str]
    certifications: List[Certification]
    achievements: List[Achievement]
    coding_profiles: List[CodingProfile] = []
    template_style: Optional[str] = "modern"
    pdf_preferences: Optional[PDFPreferences] = None
    created_at: datetime = datetime.now()

class ScoreBreakdown(BaseModel):
    summary: float = 0
    skills: float = 0
    projects: float = 0
    experience: float = 0
    keywords: float = 0
    formatting: float = 0

class ResumeCreate(BaseModel):
    personal_info: PersonalInfo
    summary: str = ""
    education: List[Education] = []
    skills: List[str] = []
    projects: List[Project] = []
    experience: List[Experience] = []
    certifications: List[Certification] = []
    achievements: List[Achievement] = []
    coding_profiles: List[CodingProfile] = []
    template_style: Optional[str] = "modern"
    pdf_preferences: Optional[PDFPreferences] = None

class ResumeUpdate(BaseModel):
    personal_info: Optional[PersonalInfo] = None
    summary: Optional[str] = None
    education: Optional[List[Education]] = None
    skills: Optional[List[str]] = None
    projects: Optional[List[Project]] = None
    experience: Optional[List[Experience]] = None
    certifications: Optional[List[Certification]] = None
    achievements: Optional[List[Achievement]] = None
    coding_profiles: Optional[List[CodingProfile]] = None
    template_style: Optional[str] = None
    pdf_preferences: Optional[PDFPreferences] = None

class ResumeResponse(BaseModel):
    id: str
    user_id: str
    personal_info: PersonalInfo
    summary: str = ""
    education: List[Education] = []
    skills: List[str] = []
    projects: List[Project] = []
    experience: List[Experience] = []
    certifications: List[Certification] = []
    achievements: List[Achievement] = []
    coding_profiles: List[CodingProfile] = []
    template_style: Optional[str] = "modern"
    pdf_preferences: Optional[PDFPreferences] = PDFPreferences(background_color="#ffffff", accent_color="#1a73e8")
    score: float = 0
    score_breakdown: ScoreBreakdown = ScoreBreakdown()
    suggestions: List[str] = []
    missing_keywords: List[str] = []
    created_at: datetime
    updated_at: datetime
