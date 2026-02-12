from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class PersonalInfo(BaseModel):
    name: str
    email: EmailStr
    phone: str
    linkedin: Optional[str] = ""
    github: Optional[str] = ""

class Education(BaseModel):
    degree: str
    college: str
    year: str
    grade: str

class Project(BaseModel):
    title: str
    technologies: str
    description: str

class Experience(BaseModel):
    company: str
    role: str
    duration: str
    description: str

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
    certifications: List[str] = []

class ResumeUpdate(BaseModel):
    personal_info: Optional[PersonalInfo] = None
    summary: Optional[str] = None
    education: Optional[List[Education]] = None
    skills: Optional[List[str]] = None
    projects: Optional[List[Project]] = None
    experience: Optional[List[Experience]] = None
    certifications: Optional[List[str]] = None

class ResumeResponse(BaseModel):
    id: str
    user_id: str
    personal_info: PersonalInfo
    summary: str
    education: List[Education]
    skills: List[str]
    projects: List[Project]
    experience: List[Experience]
    certifications: List[str]
    score: float
    score_breakdown: ScoreBreakdown
    suggestions: List[str]
    missing_keywords: List[str]
    created_at: datetime
    updated_at: datetime
