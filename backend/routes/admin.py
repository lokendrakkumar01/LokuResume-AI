from fastapi import APIRouter, HTTPException, Depends, status, Header, Query
from auth.jwt_handler import get_admin_from_token
from database import get_database
from models.user import BroadcastRequest
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional, List

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

async def get_current_admin(authorization: str = Header(None)) -> str:
    """Security dependency: verifies caller possesses valid master admin token"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing"
        )
    token = authorization.replace("Bearer ", "").strip()
    admin_id = get_admin_from_token(token)
    if not admin_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Master Admin privileges required."
        )
    return admin_id

@router.get("/public-broadcast")
async def get_public_broadcast():
    """Public endpoint: returns currently active platform broadcast banner (if any)"""
    db = await get_database()
    setting = await db.platform_settings.find_one({"key": "broadcast"})
    if not setting or not setting.get("active", False):
        return {"broadcast": None}
    
    return {
        "broadcast": {
            "message": setting.get("message", ""),
            "type": setting.get("type", "info"),
            "active": setting.get("active", True),
            "updated_at": setting.get("updated_at")
        }
    }

@router.get("/stats")
async def get_admin_stats(admin_id: str = Depends(get_current_admin)):
    """Comprehensive system metrics and platform health overview"""
    db = await get_database()
    
    # User counts
    total_users = await db.users.count_documents({})
    admin_users = await db.users.count_documents({"role": "admin"})
    regular_users = total_users - admin_users
    
    # Resume counts
    total_resumes = await db.resumes.count_documents({})
    
    # Calculate Average ATS Score
    pipeline = [
        {"$group": {"_id": None, "avg_score": {"$avg": "$score"}, "max_score": {"$max": "$score"}, "min_score": {"$min": "$score"}}}
    ]
    score_stats = await db.resumes.aggregate(pipeline).to_list(1)
    avg_ats_score = round(score_stats[0]["avg_score"], 1) if score_stats and score_stats[0]["avg_score"] is not None else 0
    highest_score = round(score_stats[0]["max_score"], 1) if score_stats and score_stats[0]["max_score"] is not None else 0
    
    # Broadcast setting
    broadcast_doc = await db.platform_settings.find_one({"key": "broadcast"})
    current_broadcast = None
    if broadcast_doc:
        current_broadcast = {
            "message": broadcast_doc.get("message", ""),
            "type": broadcast_doc.get("type", "info"),
            "active": broadcast_doc.get("active", False),
            "updated_at": broadcast_doc.get("updated_at")
        }
    
    return {
        "total_users": total_users,
        "admin_users": admin_users,
        "regular_users": regular_users,
        "total_resumes": total_resumes,
        "avg_ats_score": avg_ats_score,
        "highest_score": highest_score,
        "active_broadcast": current_broadcast,
        "system_status": {
            "database": "Online (MongoDB Atlas)",
            "api_health": "Operational",
            "uptime": "Healthy"
        }
    }

@router.get("/users")
async def get_all_users(
    search: Optional[str] = Query(None),
    admin_id: str = Depends(get_current_admin)
):
    """List all registered users with their resume count and details"""
    db = await get_database()
    query = {}
    if search and search.strip():
        regex = {"$regex": search.strip(), "$options": "i"}
        query = {"$or": [{"name": regex}, {"email": regex}]}
    
    cursor = db.users.find(query).sort("created_at", -1)
    users = await cursor.to_list(length=200)
    
    # Preload resume count per user for fast single-roundtrip loading
    user_list = []
    for u in users:
        uid_str = str(u["_id"])
        resume_count = await db.resumes.count_documents({"user_id": uid_str})
        user_list.append({
            "id": uid_str,
            "name": u.get("name", "Unknown"),
            "email": u.get("email", ""),
            "role": u.get("role", "user"),
            "created_at": u.get("created_at", datetime.now(timezone.utc)),
            "resume_count": resume_count
        })
        
    return {"users": user_list, "total": len(user_list)}

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin_id: str = Depends(get_current_admin)):
    """Delete a user and all their associated resumes from the platform"""
    if user_id == admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Forbidden: Cannot delete your own active administrator account"
        )
    
    db = await get_database()
    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format")
        
    target_user = await db.users.find_one({"_id": obj_id})
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    # Delete associated resumes
    resume_del_res = await db.resumes.delete_many({"user_id": user_id})
    
    # Delete user record
    await db.users.delete_one({"_id": obj_id})
    
    return {
        "message": f"User {target_user.get('email')} and {resume_del_res.deleted_count} resumes deleted successfully.",
        "deleted_user_id": user_id
    }

@router.get("/resumes")
async def get_all_resumes(
    search: Optional[str] = Query(None),
    admin_id: str = Depends(get_current_admin)
):
    """List all resumes on the platform with ATS scores and owner details"""
    db = await get_database()
    
    cursor = db.resumes.find({}).sort("updated_at", -1)
    resumes_docs = await cursor.to_list(length=300)
    
    # Cache user info to prevent N+1 queries
    user_cache = {}
    
    resume_list = []
    for r in resumes_docs:
        uid = r.get("user_id")
        if uid and uid not in user_cache:
            try:
                u_doc = await db.users.find_one({"_id": ObjectId(uid)})
                user_cache[uid] = {
                    "name": u_doc.get("name", "User") if u_doc else "Unknown",
                    "email": u_doc.get("email", "") if u_doc else ""
                }
            except Exception:
                user_cache[uid] = {"name": "User", "email": ""}
                
        user_info = user_cache.get(uid, {"name": "Unknown", "email": ""})
        
        personal_info = r.get("personal_info", {})
        cand_name = personal_info.get("name") or user_info["name"]
        cand_email = personal_info.get("email") or user_info["email"]
        target_role = r.get("target_role") or personal_info.get("headline") or "Software Engineer"
        
        # Filtering if search is provided
        if search and search.strip():
            s = search.strip().lower()
            if not (s in cand_name.lower() or s in cand_email.lower() or s in target_role.lower()):
                continue
                
        resume_list.append({
            "id": str(r["_id"]),
            "user_id": uid,
            "owner_name": user_info["name"],
            "owner_email": user_info["email"],
            "candidate_name": cand_name,
            "candidate_email": cand_email,
            "target_role": target_role,
            "score": r.get("score", 0),
            "template_id": r.get("template_id", "modern-1"),
            "created_at": r.get("created_at"),
            "updated_at": r.get("updated_at")
        })
        
    return {"resumes": resume_list, "total": len(resume_list)}

@router.delete("/resumes/{resume_id}")
async def delete_resume_admin(resume_id: str, admin_id: str = Depends(get_current_admin)):
    """Admin endpoint: Delete any resume from the platform"""
    db = await get_database()
    try:
        obj_id = ObjectId(resume_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resume ID")
        
    result = await db.resumes.delete_one({"_id": obj_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
        
    return {"message": "Resume successfully deleted from platform", "resume_id": resume_id}

@router.get("/broadcast")
async def get_admin_broadcast(admin_id: str = Depends(get_current_admin)):
    """Retrieve full broadcast settings"""
    db = await get_database()
    setting = await db.platform_settings.find_one({"key": "broadcast"})
    if not setting:
        return {"broadcast": {"message": "", "type": "info", "active": False}}
    return {
        "broadcast": {
            "message": setting.get("message", ""),
            "type": setting.get("type", "info"),
            "active": setting.get("active", False),
            "updated_at": setting.get("updated_at")
        }
    }

@router.post("/broadcast")
async def update_broadcast(req: BroadcastRequest, admin_id: str = Depends(get_current_admin)):
    """Update or toggle global platform broadcast banner"""
    db = await get_database()
    update_data = {
        "message": req.message.strip(),
        "type": req.type or "info",
        "active": req.active,
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.platform_settings.update_one(
        {"key": "broadcast"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Platform broadcast updated successfully", "broadcast": update_data}

@router.delete("/broadcast")
async def clear_broadcast(admin_id: str = Depends(get_current_admin)):
    """Deactivate and clear the platform broadcast banner"""
    db = await get_database()
    await db.platform_settings.update_one(
        {"key": "broadcast"},
        {"$set": {"active": False, "message": "", "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"message": "Platform broadcast banner deactivated"}
