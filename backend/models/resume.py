from pydantic import BaseModel, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

class PersonalInfo(BaseModel):
    model_config = ConfigDict(extra='allow')
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
    model_config = ConfigDict(extra='allow')
    degree: Optional[str] = ""
    college: Optional[str] = ""
    year: Optional[str] = ""
    grade: Optional[str] = ""

class Project(BaseModel):
    model_config = ConfigDict(extra='allow')
    title: Optional[str] = ""
    technologies: Optional[str] = ""
    description: Optional[str] = ""
    repository_url: Optional[str] = ""
    live_demo_url: Optional[str] = ""
    date: Optional[str] = ""  # Year or date range e.g. "2025"

class Experience(BaseModel):
    model_config = ConfigDict(extra='allow')
    company: Optional[str] = ""
    role: Optional[str] = ""
    duration: Optional[str] = ""
    description: Optional[str] = ""

class Certification(BaseModel):
    model_config = ConfigDict(extra='allow')
    name: Optional[str] = ""
    file_data: Optional[str] = ""  # Base64 encoded certificate
    file_url: Optional[str] = ""  # URL for certificate file (optional)
    issued_by: Optional[str] = ""
    date: Optional[str] = ""
    link: Optional[str] = ""  # Proof link / Certificate verification URL
    skills_learned: Optional[str] = ""  # e.g. "Java", "Ethical Hacking"

class Achievement(BaseModel):
    model_config = ConfigDict(extra='allow')
    title: Optional[str] = ""
    description: Optional[str] = ""
    date: Optional[str] = ""
    link: Optional[str] = ""  # URL for achievement proof/details / certificate link

class CodingProfile(BaseModel):
    model_config = ConfigDict(extra='allow')
    platform: Optional[str] = ""
    link: Optional[str] = ""
    headline: Optional[str] = ""  # e.g. "Max Rating: 1600" or "5 Star"

class PDFPreferences(BaseModel):
    model_config = ConfigDict(extra='allow')
    background_color: str = "#ffffff"
    accent_color: str = "#111827"

class Resume(BaseModel):
    model_config = ConfigDict(extra='allow')
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
    languages: List[str] = []
    interests: List[str] = []
    custom_sections: List[Dict[str, Any]] = []
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
    model_config = ConfigDict(extra='allow')
    personal_info: PersonalInfo
    summary: str = ""
    education: List[Education] = []
    skills: List[str] = []
    projects: List[Project] = []
    experience: List[Experience] = []
    certifications: List[Certification] = []
    achievements: List[Achievement] = []
    coding_profiles: List[CodingProfile] = []
    languages: List[str] = []
    interests: List[str] = []
    custom_sections: List[Dict[str, Any]] = []
    template_style: Optional[str] = "modern"
    pdf_preferences: Optional[PDFPreferences] = None

class ResumeUpdate(BaseModel):
    model_config = ConfigDict(extra='allow')
    personal_info: Optional[PersonalInfo] = None
    summary: Optional[str] = None
    education: Optional[List[Education]] = None
    skills: Optional[List[str]] = None
    projects: Optional[List[Project]] = None
    experience: Optional[List[Experience]] = None
    certifications: Optional[List[Certification]] = None
    achievements: Optional[List[Achievement]] = None
    coding_profiles: Optional[List[CodingProfile]] = None
    languages: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    custom_sections: Optional[List[Dict[str, Any]]] = None
    template_style: Optional[str] = None
    pdf_preferences: Optional[PDFPreferences] = None

class ResumeResponse(BaseModel):
    model_config = ConfigDict(extra='allow')
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
    languages: List[str] = []
    interests: List[str] = []
    custom_sections: List[Dict[str, Any]] = []
    template_style: Optional[str] = "modern"
    pdf_preferences: Optional[PDFPreferences] = PDFPreferences(background_color="#ffffff", accent_color="#111827")
    score: float = 0
    score_breakdown: ScoreBreakdown = ScoreBreakdown()
    suggestions: List[str] = []
    missing_keywords: List[str] = []
    created_at: datetime
    updated_at: datetime
