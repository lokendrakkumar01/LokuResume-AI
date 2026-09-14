from fastapi import APIRouter, HTTPException, Depends, status, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from models.resume import ResumeCreate, ResumeUpdate, ResumeResponse, PDFPreferences
from auth.jwt_handler import get_user_from_token
from database import get_database
from services.resume_scorer import scorer
from services.ai_suggestions import ai_suggestions
from services.pdf_generator import pdf_generator
from datetime import datetime, timezone
from bson import ObjectId
from bson.errors import InvalidId
from typing import List, Optional, Dict, Any

router = APIRouter(prefix="/resumes", tags=["Resumes"])

DEFAULT_PDF_PREFERENCES = {"background_color": "#ffffff", "accent_color": "#111827", "include_photo": True}

class PreferencesUpdateRequest(BaseModel):
    template_style: Optional[str] = None
    accent_color: Optional[str] = None
    background_color: Optional[str] = None
    include_photo: Optional[bool] = None

async def get_current_user(authorization: str = Header(None)):
    """Dependency to extract and verify user from JWT token"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing"
        )
    
    token = authorization.replace("Bearer ", "").strip()
    user_id = get_user_from_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    return user_id

@router.post("", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def create_resume(resume: ResumeCreate, user_id: str = Depends(get_current_user)):
    """Create a new resume"""
    db = await get_database()
    
    # Convert resume to dict
    resume_dict = resume.model_dump()
    
    # Calculate initial score
    score, breakdown, suggestions, missing_keywords = scorer.score_resume(resume_dict)
    
    pdf_prefs = resume_dict.get("pdf_preferences") or DEFAULT_PDF_PREFERENCES
    
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
        "achievements": resume_dict.get("achievements", []),
        "coding_profiles": resume_dict.get("coding_profiles", []),
        "languages": resume_dict.get("languages", []),
        "interests": resume_dict.get("interests", []),
        "custom_sections": resume_dict.get("custom_sections", []),
        "template_style": resume_dict.get("template_style", "modern"),
        "pdf_preferences": pdf_prefs,
        "score": score,
        "score_breakdown": breakdown.model_dump(),
        "suggestions": suggestions,
        "missing_keywords": missing_keywords,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
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
        achievements=resume_doc["achievements"],
        coding_profiles=resume_doc.get("coding_profiles", []),
        languages=resume_doc.get("languages", []),
        interests=resume_doc.get("interests", []),
        custom_sections=resume_doc.get("custom_sections", []),
        template_style=resume_doc.get("template_style", "modern"),
        pdf_preferences=resume_doc["pdf_preferences"],
        score=resume_doc["score"],
        score_breakdown=breakdown,
        suggestions=resume_doc["suggestions"],
        missing_keywords=resume_doc["missing_keywords"],
        created_at=resume_doc["created_at"],
        updated_at=resume_doc["updated_at"]
    )

@router.get("", response_model=List[ResumeResponse])
async def get_all_resumes(user_id: str = Depends(get_current_user)):
    """Get all resumes for the current user (optimized for lightning-fast dashboard loading)"""
    db = await get_database()
    
    resumes = await db.resumes.find({"user_id": user_id}).sort("updated_at", -1).to_list(length=100)
    
    result_list = []
    for resume in resumes:
        # Strip heavy base64 certificate data for list view to keep payload tiny (<20KB instead of 10MB+)
        raw_certs = resume.get("certifications", [])
        clean_certs = []
        for c in raw_certs:
            c_copy = dict(c) if isinstance(c, dict) else c.model_dump() if hasattr(c, "model_dump") else {}
            if "file_data" in c_copy:
                c_copy["file_data"] = ""
            clean_certs.append(c_copy)

        result_list.append(
            ResumeResponse(
                id=str(resume["_id"]),
                user_id=resume["user_id"],
                personal_info=resume["personal_info"],
                summary=resume["summary"],
                education=resume["education"],
                skills=resume["skills"],
                projects=resume["projects"],
                experience=resume["experience"],
                certifications=clean_certs,
                achievements=resume.get("achievements", []),
                coding_profiles=resume.get("coding_profiles", []),
                languages=resume.get("languages", []),
                interests=resume.get("interests", []),
                custom_sections=resume.get("custom_sections", []),
                template_style=resume.get("template_style", "modern"),
                pdf_preferences=resume.get("pdf_preferences") or DEFAULT_PDF_PREFERENCES,
                score=resume["score"],
                score_breakdown=resume["score_breakdown"],
                suggestions=resume["suggestions"],
                missing_keywords=resume["missing_keywords"],
                created_at=resume["created_at"],
                updated_at=resume["updated_at"]
            )
        )
    
    return result_list

@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(resume_id: str, user_id: str = Depends(get_current_user)):
    """Get a specific resume"""
    db = await get_database()
    
    try:
        obj_id = ObjectId(resume_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resume ID")
    
    resume = await db.resumes.find_one({"_id": obj_id, "user_id": user_id})
    
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
        achievements=resume.get("achievements", []),
        coding_profiles=resume.get("coding_profiles", []),
        languages=resume.get("languages", []),
        interests=resume.get("interests", []),
        custom_sections=resume.get("custom_sections", []),
        template_style=resume.get("template_style", "modern"),
        pdf_preferences=resume.get("pdf_preferences") or DEFAULT_PDF_PREFERENCES,
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
        obj_id = ObjectId(resume_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resume ID")
    
    existing_resume = await db.resumes.find_one({"_id": obj_id, "user_id": user_id})
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
    existing_resume["pdf_preferences"] = existing_resume.get("pdf_preferences") or DEFAULT_PDF_PREFERENCES
    existing_resume["score"] = score
    existing_resume["score_breakdown"] = breakdown.model_dump()
    existing_resume["suggestions"] = suggestions
    existing_resume["missing_keywords"] = missing_keywords
    existing_resume["updated_at"] = datetime.now(timezone.utc)
    
    await db.resumes.replace_one({"_id": obj_id}, existing_resume)
    
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
        achievements=existing_resume.get("achievements", []),
        coding_profiles=existing_resume.get("coding_profiles", []),
        languages=existing_resume.get("languages", []),
        interests=existing_resume.get("interests", []),
        custom_sections=existing_resume.get("custom_sections", []),
        template_style=existing_resume.get("template_style", "modern"),
        pdf_preferences=existing_resume.get("pdf_preferences") or DEFAULT_PDF_PREFERENCES,
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
        obj_id = ObjectId(resume_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resume ID")
    
    result = await db.resumes.delete_one({"_id": obj_id, "user_id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    
    return None

@router.post("/{resume_id}/duplicate", response_model=ResumeResponse)
async def duplicate_resume(resume_id: str, user_id: str = Depends(get_current_user)):
    """Duplicate a resume (requires score >= 50%)"""
    db = await get_database()
    
    try:
        obj_id = ObjectId(resume_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resume ID")
    
    # Check feature flag for HD PDF Export
    setting = await db.platform_settings.find_one({"key": "features"})
    if setting and setting.get("features"):
        pdf_feat = setting["features"].get("hd_pdf_export", {})
        if pdf_feat.get("status") == "disabled":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="FEATURE_DISABLED: High-Definition PDF Export is currently disabled by administrator."
            )

    resume = await db.resumes.find_one({"_id": obj_id, "user_id": user_id})
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    
    # Check score requirement
    if resume.get("score", 0) < 50:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Resume score must be 50% or higher to duplicate"
        )
    
    # Create duplicate
    new_resume = resume.copy()
    del new_resume["_id"]
    new_resume["created_at"] = datetime.now(timezone.utc)
    new_resume["updated_at"] = datetime.now(timezone.utc)
    
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
        achievements=new_resume.get("achievements", []),
        coding_profiles=new_resume.get("coding_profiles", []),
        languages=new_resume.get("languages", []),
        interests=new_resume.get("interests", []),
        custom_sections=new_resume.get("custom_sections", []),
        template_style=new_resume.get("template_style", "modern"),
        pdf_preferences=new_resume.get("pdf_preferences") or DEFAULT_PDF_PREFERENCES,
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
        obj_id = ObjectId(resume_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resume ID")
    
    resume = await db.resumes.find_one({"_id": obj_id, "user_id": user_id})
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    
    # AI enhance summary
    if resume.get("summary"):
        resume["summary"] = ai_suggestions.improve_summary(resume["summary"])
    
    # Recalculate score
    score, breakdown, suggestions, missing_keywords = scorer.score_resume(resume)
    
    resume["pdf_preferences"] = resume.get("pdf_preferences") or DEFAULT_PDF_PREFERENCES
    resume["score"] = score
    resume["score_breakdown"] = breakdown.model_dump()
    resume["suggestions"] = suggestions
    resume["missing_keywords"] = missing_keywords
    resume["updated_at"] = datetime.now(timezone.utc)
    
    await db.resumes.replace_one({"_id": obj_id}, resume)
    
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
        achievements=resume.get("achievements", []),
        coding_profiles=resume.get("coding_profiles", []),
        languages=resume.get("languages", []),
        interests=resume.get("interests", []),
        custom_sections=resume.get("custom_sections", []),
        template_style=resume.get("template_style", "modern"),
        pdf_preferences=resume.get("pdf_preferences") or DEFAULT_PDF_PREFERENCES,
        score=resume["score"],
        score_breakdown=breakdown,
        suggestions=resume["suggestions"],
        missing_keywords=resume["missing_keywords"],
        created_at=resume["created_at"],
        updated_at=resume["updated_at"]
    )

@router.put("/{resume_id}/preferences")
async def update_resume_preferences(
    resume_id: str, 
    prefs: PreferencesUpdateRequest, 
    user_id: str = Depends(get_current_user)
):
    """Lightweight preferences update without uploading full resume"""
    db = await get_database()
    try:
        obj_id = ObjectId(resume_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resume ID")
        
    update_fields = {"updated_at": datetime.now(timezone.utc)}
    if prefs.template_style:
        update_fields["template_style"] = prefs.template_style
    if prefs.accent_color:
        update_fields["pdf_preferences.accent_color"] = prefs.accent_color
    if prefs.background_color:
        update_fields["pdf_preferences.background_color"] = prefs.background_color
    if prefs.include_photo is not None:
        update_fields["pdf_preferences.include_photo"] = prefs.include_photo
        
    result = await db.resumes.update_one(
        {"_id": obj_id, "user_id": user_id},
        {"$set": update_fields}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
        
    return {"status": "success", "preferences": prefs.model_dump(exclude_none=True)}

@router.get("/{resume_id}/download")
async def download_resume(
    resume_id: str, 
    accent_color: Optional[str] = None, 
    template_style: Optional[str] = None, 
    include_photo: Optional[bool] = None,
    user_id: str = Depends(get_current_user)
):
    """Generate and download resume PDF (Requires minimum 50% score)"""
    db = await get_database()
    
    try:
        obj_id = ObjectId(resume_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resume ID")
    
    resume = await db.resumes.find_one({"_id": obj_id, "user_id": user_id})
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    
    # Check score requirement (must be >= 50% to download)
    resume_score = resume.get("score", 0)
    if resume_score < 50:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Resume completeness score must be 50% or higher to download PDF (Current: {resume_score}%). Complete more sections to reach 50%."
        )
    
    try:
        # Get PDF preferences with defaults
        pdf_preferences = (resume.get("pdf_preferences") or DEFAULT_PDF_PREFERENCES).copy()
        if accent_color:
            pdf_preferences["accent_color"] = accent_color
            await db.resumes.update_one({"_id": obj_id}, {"$set": {"pdf_preferences.accent_color": accent_color}})
        if include_photo is not None:
            pdf_preferences["include_photo"] = include_photo
            await db.resumes.update_one({"_id": obj_id}, {"$set": {"pdf_preferences.include_photo": include_photo}})
        
        # Sanitize certifications - remove large base64 file_data before PDF generation
        resume_for_pdf = resume.copy()
        if template_style:
            resume_for_pdf["template_style"] = template_style
            await db.resumes.update_one({"_id": obj_id}, {"$set": {"template_style": template_style}})
        if resume_for_pdf.get("certifications"):
            sanitized_certs = []
            for cert in resume_for_pdf["certifications"]:
                if isinstance(cert, dict):
                    cert_copy = {k: v for k, v in cert.items() if k != 'file_data'}
                    sanitized_certs.append(cert_copy)
                else:
                    sanitized_certs.append(cert)
            resume_for_pdf["certifications"] = sanitized_certs
        
        # Generate PDF
        pdf_buffer = pdf_generator.generate_resume_pdf(resume_for_pdf, resume_score, pdf_preferences)
        
        # Return PDF as downloadable file
        candidate_name = (resume.get('personal_info') or {}).get('name') or "Candidate"
        safe_name = "".join(c for c in candidate_name.replace(' ', '_') if c.isalnum() or c in ('_', '-'))
        if not safe_name:
            safe_name = "Resume"
        filename = f"{safe_name}_Resume.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        print(f"PDF Generation Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {str(e)}"
        )
