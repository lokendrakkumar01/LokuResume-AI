from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class PersonalInfo(BaseModel):
    name: str
    email: EmailStr
    phone: str
    linkedin: Optional[str] = ""
    github: Optional[str] = ""
    leetcode: Optional[str] = ""
    portfolio: Optional[str] = ""
    headline: Optional[str] = ""  # Custom headline/title
    problem_solving: Optional[str] = ""  # Problem Solving & Data Structures link (e.g. GFG, HackerRank)
    profile_photo: Optional[str] = ""  # Base64 encoded image or URL

class Education(BaseModel):
    degree: str
    college: str
    year: str
    grade: str

class Project(BaseModel):
    title: str
    technologies: str
    description: str
    repository_url: Optional[str] = ""
    live_demo_url: Optional[str] = ""

class Experience(BaseModel):
    company: str
    role: str
    duration: str
    description: str

class Certification(BaseModel):
    name: str
    file_data: Optional[str] = ""  # Base64 encoded certificate
    file_url: Optional[str] = ""  # URL for certificate file (optional)
    issued_by: Optional[str] = ""
    date: Optional[str] = ""


class Achievement(BaseModel):
    title: str
    description: str
    date: Optional[str] = ""
    link: Optional[str] = ""  # URL for achievement proof/details

class PDFPreferences(BaseModel):
    background_color: str = "#ffffff"
    accent_color: str = "#1a73e8"

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
    pdf_preferences: Optional[PDFPreferences] = None

class ResumeResponse(BaseModel):
    id: str
    user_id: str
    personal_info: PersonalInfo
    summary: str
    education: List[Education]
    skills: List[str]
    projects: List[Project]
    experience: List[Experience]
    certifications: List[Certification]
    achievements: List[Achievement]
    pdf_preferences: PDFPreferences
    score: float
    score_breakdown: ScoreBreakdown
    suggestions: List[str]
    missing_keywords: List[str]
    created_at: datetime
    updated_at: datetime
