from fastapi import APIRouter, HTTPException, Depends, status, Header
from fastapi.responses import StreamingResponse
from models.resume import ResumeCreate, ResumeUpdate, ResumeResponse
from auth.jwt_handler import get_user_from_token
from database import get_database
from services.resume_scorer import scorer
from services.ai_suggestions import ai_suggestions
from services.pdf_generator import pdf_generator
from datetime import datetime
from bson import ObjectId
from typing import List

router = APIRouter(prefix="/resumes", tags=["Resumes"])

async def get_current_user(authorization: str = Header(None)):
    """Dependency to extract and verify user from JWT token"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing"
        )
    
    try:
        token = authorization.replace("Bearer ", "")
        user_id = get_user_from_token(token)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        return user_id
    except:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

@router.post("", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def create_resume(resume: ResumeCreate, user_id: str = Depends(get_current_user)):
    """Create a new resume"""
    db = await get_database()
    
    # Convert resume to dict
    resume_dict = resume.model_dump()
    
    # Calculate initial score
    score, breakdown, suggestions, missing_keywords = scorer.score_resume(resume_dict)
    
    # Prepare resume document
    resume_doc = {
        "user_id": user_id,
        "personal_info": resume_dict["personal_info"],
        "summary": resume_dict["summary"],
        "education": resume_dict["education"],
        "skills": resume_dict["skills"],
        "projects": resume_dict["projects"],
        "experience": resume_dict["experience"],
        "certifications": resume_dict["certifications"],
        "score": score,
        "score_breakdown": breakdown.model_dump(),
        "suggestions": suggestions,
        "missing_keywords": missing_keywords,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.resumes.insert_one(resume_doc)
    resume_doc["_id"] = result.inserted_id
    
    # Return resume response
    return ResumeResponse(
        id=str(resume_doc["_id"]),
        user_id=resume_doc["user_id"],
        personal_info=resume_doc["personal_info"],
        summary=resume_doc["summary"],
        education=resume_doc["education"],
        skills=resume_doc["skills"],
        projects=resume_doc["projects"],
        experience=resume_doc["experience"],
        certifications=resume_doc["certifications"],
        score=resume_doc["score"],
        score_breakdown=breakdown,
        suggestions=resume_doc["suggestions"],
        missing_keywords=resume_doc["missing_keywords"],
        created_at=resume_doc["created_at"],
        updated_at=resume_doc["updated_at"]
    )

@router.get("", response_model=List[ResumeResponse])
async def get_all_resumes(user_id: str = Depends(get_current_user)):
    """Get all resumes for the current user"""
    db = await get_database()
    
    resumes = await db.resumes.find({"user_id": user_id}).to_list(length=100)
    
    return [
        ResumeResponse(
            id=str(resume["_id"]),
            user_id=resume["user_id"],
            personal_info=resume["personal_info"],
            summary=resume["summary"],
            education=resume["education"],
            skills=resume["skills"],
            projects=resume["projects"],
            experience=resume["experience"],
            certifications=resume["certifications"],
            score=resume["score"],
            score_breakdown=resume["score_breakdown"],
            suggestions=resume["suggestions"],
            missing_keywords=resume["missing_keywords"],
            created_at=resume["created_at"],
            updated_at=resume["updated_at"]
        )
        for resume in resumes
    ]

@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(resume_id: str, user_id: str = Depends(get_current_user)):
    """Get a specific resume"""
    db = await get_database()
    
    try:
        resume = await db.resumes.find_one({"_id": ObjectId(resume_id), "user_id": user_id})
    except:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resume ID")
    
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    
    return ResumeResponse(
        id=str(resume["_id"]),
        user_id=resume["user_id"],
        personal_info=resume["personal_info"],
        summary=resume["summary"],
        education=resume["education"],
        skills=resume["skills"],
        projects=resume["projects"],
        experience=resume["experience"],
        certifications=resume["certifications"],
        score=resume["score"],
        score_breakdown=resume["score_breakdown"],
        suggestions=resume["suggestions"],
        missing_keywords=resume["missing_keywords"],
        created_at=resume["created_at"],
        updated_at=resume["updated_at"]
    )

@router.put("/{resume_id}", response_model=ResumeResponse)
async def update_resume(resume_id: str, resume_update: ResumeUpdate, user_id: str = Depends(get_current_user)):
    """Update an existing resume"""
    db = await get_database()
    
    try:
        existing_resume = await db.resumes.find_one({"_id": ObjectId(resume_id), "user_id": user_id})
    except:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resume ID")
    
    if not existing_resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    
    # Update fields
    update_data = resume_update.model_dump(exclude_unset=True)
    
    # Merge with existing data
    for key, value in update_data.items():
        existing_resume[key] = value
    
    # Recalculate score
    score, breakdown, suggestions, missing_keywords = scorer.score_resume(existing_resume)
    
    # Update resume document
    existing_resume["score"] = score
    existing_resume["score_breakdown"] = breakdown.model_dump()
    existing_resume["suggestions"] = suggestions
    existing_resume["missing_keywords"] = missing_keywords
    existing_resume["updated_at"] = datetime.utcnow()
    
    await db.resumes.replace_one({"_id": ObjectId(resume_id)}, existing_resume)
    
    return ResumeResponse(
        id=str(existing_resume["_id"]),
        user_id=existing_resume["user_id"],
        personal_info=existing_resume["personal_info"],
        summary=existing_resume["summary"],
        education=existing_resume["education"],
        skills=existing_resume["skills"],
        projects=existing_resume["projects"],
        experience=existing_resume["experience"],
        certifications=existing_resume["certifications"],
        score=existing_resume["score"],
        score_breakdown=breakdown,
        suggestions=existing_resume["suggestions"],
        missing_keywords=existing_resume["missing_keywords"],
        created_at=existing_resume["created_at"],
        updated_at=existing_resume["updated_at"]
    )

@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(resume_id: str, user_id: str = Depends(get_current_user)):
    """Delete a resume"""
    db = await get_database()
    
    try:
        result = await db.resumes.delete_one({"_id": ObjectId(resume_id), "user_id": user_id})
    except:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resume ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    
    return None

@router.post("/{resume_id}/duplicate", response_model=ResumeResponse)
async def duplicate_resume(resume_id: str, user_id: str = Depends(get_current_user)):
    """Duplicate a resume (requires score >= 65%)"""
    db = await get_database()
    
    try:
        resume = await db.resumes.find_one({"_id": ObjectId(resume_id), "user_id": user_id})
    except:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resume ID")
    
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    
    # Check score requirement
    if resume["score"] < 65:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Resume score must be 65% or higher to duplicate"
        )
    
    # Create duplicate
    new_resume = resume.copy()
    del new_resume["_id"]
    new_resume["created_at"] = datetime.utcnow()
    new_resume["updated_at"] = datetime.utcnow()
    
    result = await db.resumes.insert_one(new_resume)
    new_resume["_id"] = result.inserted_id
    
    return ResumeResponse(
        id=str(new_resume["_id"]),
        user_id=new_resume["user_id"],
        personal_info=new_resume["personal_info"],
        summary=new_resume["summary"],
        education=new_resume["education"],
        skills=new_resume["skills"],
        projects=new_resume["projects"],
        experience=new_resume["experience"],
        certifications=new_resume["certifications"],
        score=new_resume["score"],
        score_breakdown=new_resume["score_breakdown"],
        suggestions=new_resume["suggestions"],
        missing_keywords=new_resume["missing_keywords"],
        created_at=new_resume["created_at"],
        updated_at=new_resume["updated_at"]
    )

@router.post("/{resume_id}/generate", response_model=ResumeResponse)
async def generate_ai_resume(resume_id: str, user_id: str = Depends(get_current_user)):
    """AI-enhance resume and recalculate score"""
    db = await get_database()
    
    try:
        resume = await db.resumes.find_one({"_id": ObjectId(resume_id), "user_id": user_id})
    except:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resume ID")
    
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    
    # AI enhance summary
    if resume.get("summary"):
        resume["summary"] = ai_suggestions.improve_summary(resume["summary"])
    
    # Recalculate score
    score, breakdown, suggestions, missing_keywords = scorer.score_resume(resume)
    
    resume["score"] = score
    resume["score_breakdown"] = breakdown.model_dump()
    resume["suggestions"] = suggestions
    resume["missing_keywords"] = missing_keywords
    resume["updated_at"] = datetime.utcnow()
    
    await db.resumes.replace_one({"_id": ObjectId(resume_id)}, resume)
    
    return ResumeResponse(
        id=str(resume["_id"]),
        user_id=resume["user_id"],
        personal_info=resume["personal_info"],
        summary=resume["summary"],
        education=resume["education"],
        skills=resume["skills"],
        projects=resume["projects"],
        experience=resume["experience"],
        certifications=resume["certifications"],
        score=resume["score"],
        score_breakdown=breakdown,
        suggestions=resume["suggestions"],
        missing_keywords=resume["missing_keywords"],
        created_at=resume["created_at"],
        updated_at=resume["updated_at"]
    )

@router.get("/{resume_id}/download")
async def download_resume(resume_id: str, user_id: str = Depends(get_current_user)):
    """Generate and download resume PDF"""
    db = await get_database()
    
    try:
        resume = await db.resumes.find_one({"_id": ObjectId(resume_id), "user_id": user_id})
    except:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resume ID")
    
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    
    # Generate PDF
    pdf_buffer = pdf_generator.generate_resume_pdf(resume, resume["score"])
    
    # Return PDF as downloadable file
    filename = f"{resume['personal_info']['name'].replace(' ', '_')}_Resume.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
