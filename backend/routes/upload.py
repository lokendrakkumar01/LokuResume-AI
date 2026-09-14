"""
Upload API Router for LokuResume AI
Handles media file uploads (certificates, achievement proofs, profile photos) to Cloudinary.
"""

from fastapi import APIRouter, UploadFile, File, Query, HTTPException, status
from typing import Optional
import os
from services.cloudinary_service import upload_media_file

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.pdf', '.svg'}

@router.post("")
@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    folder_type: Optional[str] = Query("documents", description="Folder type: certificates, achievements, photos")
):
    """
    Upload a certificate, achievement proof, or profile photo to Cloudinary CDN.
    Returns the permanent HTTPS secure URL and metadata.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )
        
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed types: PNG, JPG, JPEG, WEBP, PDF."
        )

    # Read file content
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of 10MB (file size: {len(contents) // (1024 * 1024)}MB)"
        )

    # Folder mapping
    folder_map = {
        "certificates": "lokuresume/certificates",
        "achievements": "lokuresume/achievements",
        "photos": "lokuresume/photos"
    }
    target_folder = folder_map.get(folder_type.lower(), "lokuresume/documents")

    # Cloudinary auto handles both images and PDFs
    res = upload_media_file(
        file_data=contents,
        folder=target_folder,
        resource_type="auto"
    )

    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cloud upload failed: {res.get('error', 'Unknown Cloudinary error')}"
        )

    return {
        "success": True,
        "url": res["secure_url"],
        "public_id": res["public_id"],
        "format": res.get("format"),
        "resource_type": res.get("resource_type"),
        "filename": file.filename,
        "size_bytes": len(contents)
    }
