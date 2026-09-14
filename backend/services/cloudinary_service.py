"""
Cloudinary Cloud Media Service for LokuResume AI
Handles uploading, optimizing, and serving images and PDF documents for:
- Certifications (images & PDFs)
- Achievements Proof (images & PDFs)
- Profile Photos (images)
"""

import os
import logging
from typing import Optional, Union, BinaryIO
from io import BytesIO
import cloudinary
import cloudinary.uploader
import cloudinary.api
from config import settings

logger = logging.getLogger("cloudinary_service")

# Initialize Cloudinary credentials
try:
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name or "owy72ylb",
        api_key=settings.cloudinary_api_key or "286765873426464",
        api_secret=settings.cloudinary_api_secret or "5WBAuPacEAzm_LVMd6ERp67YHcA",
        secure=True
    )
    logger.info("[OK] Cloudinary SDK initialized successfully")
except Exception as e:
    logger.error(f"[Cloudinary Warning] Failed to configure Cloudinary: {e}")


def upload_media_file(
    file_data: Union[bytes, BytesIO, str, BinaryIO],
    folder: str = "lokuresume",
    resource_type: str = "auto",
    public_id: Optional[str] = None
) -> dict:
    """
    Upload a media file (image or PDF) directly to Cloudinary CDN storage.
    
    :param file_data: File bytes, BytesIO, base64 data URI, or file-like object
    :param folder: Target Cloudinary folder (e.g. 'lokuresume/certificates')
    :param resource_type: 'auto', 'image', or 'raw'
    :param public_id: Optional custom public identifier
    :return: dict with 'success', 'secure_url', 'public_id', 'format', 'resource_type'
    """
    try:
        upload_params = {
            "folder": folder,
            "resource_type": resource_type,
            "use_filename": True,
            "unique_filename": True,
            "overwrite": False
        }
        if public_id:
            upload_params["public_id"] = public_id

        # Wrap raw bytes in BytesIO for Cloudinary file stream
        if isinstance(file_data, bytes):
            file_data = BytesIO(file_data)

        # Perform upload
        res = cloudinary.uploader.upload(file_data, **upload_params)
        
        secure_url = res.get("secure_url", "")
        # Ensure HTTPS
        if secure_url.startswith("http://"):
            secure_url = secure_url.replace("http://", "https://", 1)

        return {
            "success": True,
            "secure_url": secure_url,
            "public_id": res.get("public_id"),
            "format": res.get("format"),
            "resource_type": res.get("resource_type"),
            "bytes": res.get("bytes", 0)
        }
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "secure_url": "",
            "public_id": ""
        }
