import re
from fastapi import APIRouter, HTTPException, Depends, status, Header, Query
from auth.jwt_handler import get_user_role_from_token, get_admin_from_token
from database import get_database
from models.user import (
    BroadcastRequest, FeatureFlagsUpdateRequest, UserStatusUpdateRequest,
    UserRoleUpdateRequest, UserFeaturesUpdateRequest, ThemeItem,
    TemplateConfigItem, MaintenanceModeRequest
)
from config import settings
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from typing import Optional, List, Dict, Any

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

HEX_COLOR_REGEX = re.compile(r"^#[0-9a-fA-F]{6}$")

DEFAULT_FEATURES: Dict[str, Any] = {
    "ai_voice_assistant": {
        "id": "ai_voice_assistant",
        "name": "Gemini AI Voice Interview & Career Coach",
        "description": "Multilingual interactive voice assistant for real-time interview prep, resume guidance, and career coaching.",
        "status": "public",  # "public" | "premium" | "disabled"
        "badge": "Pro Voice AI",
        "category": "Artificial Intelligence",
        "icon": "🎙️"
    },
    "ai_ats_deep_audit": {
        "id": "ai_ats_deep_audit",
        "name": "100% Deep ATS Resume Optimizer & Auto-Keywords",
        "description": "Comprehensive ATS scan with intelligent keyword recommendations to maximize job match score.",
        "status": "public",
        "badge": "Pro ATS",
        "category": "Artificial Intelligence",
        "icon": "🎯"
    },
    "premium_templates": {
        "id": "premium_templates",
        "name": "Executive & Designer Resume Templates",
        "description": "Unlock modern executive, creative designer, and tech-focused resume layout designs.",
        "status": "public",
        "badge": "Executive Suite",
        "category": "Design & Themes",
        "icon": "🎨"
    },
    "hd_pdf_export": {
        "id": "hd_pdf_export",
        "name": "Vector High-Definition PDF Export",
        "description": "Crystal-clear, watermark-free vector PDF download with custom theme palettes and fonts.",
        "status": "public",
        "badge": "Vector HD",
        "category": "Export Tools",
        "icon": "📄"
    },
    "ai_bullet_generator": {
        "id": "ai_bullet_generator",
        "name": "AI Work Experience Bullet Generator",
        "description": "Generate impactful action-driven achievement bullets with quantified metrics in one click.",
        "status": "public",
        "badge": "AI Magic",
        "category": "Artificial Intelligence",
        "icon": "⚡"
    },
    "unlimited_resumes": {
        "id": "unlimited_resumes",
        "name": "Unlimited Resume Variations & Profiles",
        "description": "Build and manage unlimited customized resumes tailored for different job applications.",
        "status": "public",
        "badge": "Unlimited",
        "category": "Platform Storage",
        "icon": "🚀"
    }
}

DEFAULT_THEMES = [
    {"id": "black", "name": "Pure Black", "hex_code": "#111827", "category": "Classic", "active": True},
    {"id": "blue", "name": "Professional Blue", "hex_code": "#1e40af", "category": "Corporate", "active": True},
    {"id": "green", "name": "Emerald Green", "hex_code": "#059669", "category": "Modern", "active": True},
    {"id": "purple", "name": "Royal Purple", "hex_code": "#7c3aed", "category": "Creative", "active": True},
    {"id": "red", "name": "Ruby Red", "hex_code": "#dc2626", "category": "Bold", "active": True}
]

DEFAULT_TEMPLATES = [
    {"id": "modern", "name": "Modern Minimalist", "description": "Clean, left-aligned layout with bold accent headers", "active": True, "is_premium": False},
    {"id": "executive", "name": "Executive Leadership", "description": "Centered elegant header with top accent bar", "active": True, "is_premium": False},
    {"id": "tech", "name": "Tech Specialist", "description": "Structured developer layout with skills focus", "active": True, "is_premium": False},
    {"id": "compact", "name": "Compact One-Pager", "description": "Tight margins and dense typography for single page", "active": True, "is_premium": False}
]

# --------------------------------------------------------------------------
# Multi-Role RBAC Dependencies & Audit Logger
# --------------------------------------------------------------------------

async def get_admin_actor(authorization: str = Header(None)) -> tuple:
    """Security dependency: verifies caller has moderator, admin, or super_admin role"""
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header missing")
    token = authorization.replace("Bearer ", "").strip()
    user_id, role = get_user_role_from_token(token)
    if not user_id or role not in ["admin", "super_admin", "moderator"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access Denied: Administrative privileges required.")
    return user_id, role

def require_min_role(min_role: str):
    """Factory for verifying role thresholds"""
    role_weights = {"user": 0, "moderator": 1, "admin": 2, "super_admin": 3}
    async def checker(actor: tuple = Depends(get_admin_actor)):
        user_id, role = actor
        if role_weights.get(role, 0) < role_weights.get(min_role, 0):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Requires '{min_role}' privileges or higher (your role: '{role}')."
            )
        return user_id
    return checker

get_current_admin = require_min_role("admin")
require_super_admin = require_min_role("super_admin")

async def log_admin_action(admin_id: str, action: str, target_type: str, target_id: str, details: dict = None):
    """Helper to record audit trail of administrative modifications"""
    try:
        db = await get_database()
        log_entry = {
            "admin_id": str(admin_id),
            "action": action,
            "target_type": target_type,
            "target_id": str(target_id),
            "details": details or {},
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(log_entry)
    except Exception as e:
        print(f"[Audit Log Warning]: {e}")

async def check_feature_access(user_id: Optional[str], feature_id: str):
    """Enforces feature flag status on backend API calls"""
    db = await get_database()
    # 1. Check user-specific override
    if user_id:
        try:
            u_obj = ObjectId(user_id) if ObjectId.is_valid(user_id) else None
            user_doc = await db.users.find_one({"_id": u_obj}) if u_obj else await db.users.find_one({"_id": user_id})
            if user_doc:
                # Admins bypass feature flags
                if user_doc.get("role") in ["admin", "super_admin"]:
                    return True
                overrides = user_doc.get("feature_overrides", {})
                if feature_id in overrides:
                    val = overrides[feature_id]
                    if val is False or val == "disabled":
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"FEATURE_DISABLED: Feature '{feature_id}' is disabled for your account."
                        )
                    if val is True:
                        return True
        except HTTPException:
            raise
        except Exception:
            pass

    # 2. Check global setting
    setting = await db.platform_settings.find_one({"key": "features"})
    if setting and setting.get("features"):
        feat = setting["features"].get(feature_id, {})
        status_val = feat.get("status", "public")
        if status_val == "disabled":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"FEATURE_DISABLED: Feature '{feat.get('name', feature_id)}' is currently disabled."
            )
    return True

# --------------------------------------------------------------------------
# Public Endpoints
# --------------------------------------------------------------------------

@router.get("/public-broadcast")
async def get_public_broadcast():
    """Public endpoint: returns currently active platform broadcast banner"""
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

@router.get("/public-features")
async def get_public_features():
    """Public endpoint: returns active platform feature flags to all clients"""
    db = await get_database()
    setting = await db.platform_settings.find_one({"key": "features"})
    if not setting or not setting.get("features"):
        return {"features": DEFAULT_FEATURES}
    
    merged = {**DEFAULT_FEATURES}
    for k, v in setting["features"].items():
        if k in merged:
            merged[k] = {**merged[k], **v}
        else:
            merged[k] = v
            
    return {"features": merged}

@router.get("/public-maintenance")
async def get_public_maintenance():
    """Public endpoint: returns platform maintenance status"""
    db = await get_database()
    setting = await db.platform_settings.find_one({"key": "maintenance"})
    if not setting:
        return {"enabled": False, "message": ""}
    return {
        "enabled": setting.get("enabled", False),
        "message": setting.get("message", "System is undergoing scheduled maintenance."),
        "allowed_roles": setting.get("allowed_roles", ["super_admin", "admin"])
    }

# --------------------------------------------------------------------------
# Analytics & Stats (Real Aggregations)
# --------------------------------------------------------------------------

@router.get("/stats")
async def get_admin_stats(actor: tuple = Depends(get_admin_actor)):
    """Comprehensive real-time system metrics and MongoDB aggregations"""
    admin_id, role = actor
    db = await get_database()
    now = datetime.now(timezone.utc)
    yesterday = now - timedelta(days=1)
    last_week = now - timedelta(days=7)
    last_30_days = now - timedelta(days=30)
    
    # Real user metrics
    total_users = await db.users.count_documents({})
    admin_users = await db.users.count_documents({"role": {"$in": ["admin", "super_admin"]}})
    regular_users = total_users - admin_users
    active_users = await db.users.count_documents({"status": {"$ne": "banned"}})
    banned_users = await db.users.count_documents({"status": "banned"})
    
    new_users_24h = await db.users.count_documents({"created_at": {"$gte": yesterday}})
    new_users_7d = await db.users.count_documents({"created_at": {"$gte": last_week}})
    
    # Real resume metrics
    total_resumes = await db.resumes.count_documents({})
    new_resumes_24h = await db.resumes.count_documents({"created_at": {"$gte": yesterday}})
    new_resumes_7d = await db.resumes.count_documents({"created_at": {"$gte": last_week}})
    
    # Real ATS score metrics
    score_pipeline = [
        {"$match": {"score": {"$exists": True, "$ne": None}}},
        {"$group": {
            "_id": None,
            "avg_score": {"$avg": "$score"},
            "max_score": {"$max": "$score"},
            "min_score": {"$min": "$score"}
        }}
    ]
    score_stats = await db.resumes.aggregate(score_pipeline).to_list(1)
    avg_ats_score = round(score_stats[0]["avg_score"], 1) if score_stats and score_stats[0]["avg_score"] is not None else 0
    highest_score = round(score_stats[0]["max_score"], 1) if score_stats and score_stats[0]["max_score"] is not None else 0
    
    # ATS score distribution
    distribution = {
        "below_50": await db.resumes.count_documents({"score": {"$lt": 50}}),
        "50_to_69": await db.resumes.count_documents({"score": {"$gte": 50, "$lt": 70}}),
        "70_to_84": await db.resumes.count_documents({"score": {"$gte": 70, "$lt": 85}}),
        "85_plus": await db.resumes.count_documents({"score": {"$gte": 85}})
    }
    
    # Daily Registrations Trend (last 7 days)
    user_trend_pipeline = [
        {"$match": {"created_at": {"$gte": last_week}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    user_trend = await db.users.aggregate(user_trend_pipeline).to_list(10)
    
    # Template usage distribution
    template_pipeline = [
        {"$group": {
            "_id": {"$ifNull": ["$template_style", "modern"]},
            "count": {"$sum": 1}
        }}
    ]
    template_usage = {item["_id"]: item["count"] for item in await db.resumes.aggregate(template_pipeline).to_list(10)}

    # Color theme distribution
    color_pipeline = [
        {"$group": {
            "_id": {"$ifNull": ["$pdf_preferences.accent_color", "#111827"]},
            "count": {"$sum": 1}
        }}
    ]
    color_usage = {item["_id"]: item["count"] for item in await db.resumes.aggregate(color_pipeline).to_list(15)}

    # Broadcast & features overview
    broadcast_doc = await db.platform_settings.find_one({"key": "broadcast"})
    features_doc = await db.platform_settings.find_one({"key": "features"})
    active_features = features_doc.get("features", DEFAULT_FEATURES) if features_doc else DEFAULT_FEATURES
    
    maintenance_doc = await db.platform_settings.find_one({"key": "maintenance"})
    
    return {
        "total_users": total_users,
        "admin_users": admin_users,
        "regular_users": regular_users,
        "active_users": active_users,
        "banned_users": banned_users,
        "new_users_24h": new_users_24h,
        "new_users_7d": new_users_7d,
        "total_resumes": total_resumes,
        "new_resumes_24h": new_resumes_24h,
        "new_resumes_7d": new_resumes_7d,
        "avg_ats_score": avg_ats_score,
        "highest_score": highest_score,
        "ats_distribution": distribution,
        "user_registration_trend": user_trend,
        "template_usage": template_usage,
        "color_usage": color_usage,
        "active_broadcast": broadcast_doc if broadcast_doc and broadcast_doc.get("active") else None,
        "maintenance_mode": maintenance_doc.get("enabled", False) if maintenance_doc else False,
        "features_summary": {
            "total": len(active_features),
            "public": sum(1 for f in active_features.values() if f.get("status") == "public"),
            "premium": sum(1 for f in active_features.values() if f.get("status") == "premium"),
            "disabled": sum(1 for f in active_features.values() if f.get("status") == "disabled")
        },
        "system_status": {
            "database": "Online (MongoDB Atlas)",
            "api_health": "Operational",
            "uptime": "Healthy"
        }
    }

# --------------------------------------------------------------------------
# User Management Endpoints
# --------------------------------------------------------------------------

@router.get("/users")
async def get_all_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    admin_id: str = Depends(get_current_admin)
):
    """List registered users with search, role filter, status, and resume counts"""
    db = await get_database()
    query = {}
    
    if isinstance(search, str) and search.strip():
        regex = {"$regex": search.strip(), "$options": "i"}
        query["$or"] = [{"name": regex}, {"email": regex}]
        
    if isinstance(role, str) and role.strip() and role != "all":
        query["role"] = role
        
    if isinstance(status_filter, str) and status_filter.strip() and status_filter != "all":
        query["status"] = status_filter
    
    cursor = db.users.find(query).sort("created_at", -1)
    users = await cursor.to_list(length=300)
    
    user_list = []
    for u in users:
        uid_str = str(u["_id"])
        resume_count = await db.resumes.count_documents({
            "$or": [{"user_id": uid_str}, {"user_id": u["_id"]}]
        })
        user_list.append({
            "id": uid_str,
            "name": u.get("name", "Unknown"),
            "email": u.get("email", ""),
            "role": u.get("role", "user"),
            "status": u.get("status", "active"),
            "is_premium": u.get("is_premium", False),
            "feature_overrides": u.get("feature_overrides", {}),
            "created_at": u.get("created_at", datetime.now(timezone.utc)),
            "resume_count": resume_count
        })
        
    return {"users": user_list, "total": len(user_list)}

@router.get("/users/{user_id}")
async def get_user_detail(user_id: str, admin_id: str = Depends(get_current_admin)):
    """Retrieve full profile, feature flags, and statistics for a single user"""
    db = await get_database()
    try:
        obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else None
        target_user = await db.users.find_one({"_id": obj_id}) if obj_id else await db.users.find_one({"_id": user_id})
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID")

    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    uid_str = str(target_user["_id"])
    resumes = await db.resumes.find({"$or": [{"user_id": uid_str}, {"user_id": target_user["_id"]}]}).to_list(length=50)
    
    return {
        "user": {
            "id": uid_str,
            "name": target_user.get("name", "Unknown"),
            "email": target_user.get("email", ""),
            "role": target_user.get("role", "user"),
            "status": target_user.get("status", "active"),
            "is_premium": target_user.get("is_premium", False),
            "feature_overrides": target_user.get("feature_overrides", {}),
            "created_at": target_user.get("created_at")
        },
        "resume_count": len(resumes),
        "resumes": [
            {
                "id": str(r["_id"]),
                "candidate_name": (r.get("personal_info") or {}).get("name") or "Resume",
                "score": r.get("score", 0),
                "template_style": r.get("template_style", "modern"),
                "updated_at": r.get("updated_at")
            }
            for r in resumes
        ]
    }

@router.patch("/users/{user_id}/role")
@router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, req: UserRoleUpdateRequest, actor: tuple = Depends(get_admin_actor)):
    """Promote or demote a user role (super_admin, admin, moderator, user)"""
    admin_id, admin_role = actor
    if admin_role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Admins or Super Admins can modify roles.")
        
    allowed_roles = ["super_admin", "admin", "moderator", "user"]
    if req.role not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid role. Must be one of {allowed_roles}")

    if user_id == admin_id and req.role != admin_role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot alter your own role permissions.")

    db = await get_database()
    obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else None
    target_user = await db.users.find_one({"_id": obj_id}) if obj_id else await db.users.find_one({"_id": user_id})
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    old_role = target_user.get("role", "user")
    await db.users.update_one({"_id": target_user["_id"]}, {"$set": {"role": req.role, "updated_at": datetime.now(timezone.utc)}})
    
    await log_admin_action(
        admin_id=admin_id,
        action="UPDATE_USER_ROLE",
        target_type="user",
        target_id=user_id,
        details={"old_role": old_role, "new_role": req.role, "target_email": target_user.get("email")}
    )
    
    return {"message": f"User role updated to '{req.role}' successfully", "user_id": user_id, "role": req.role}

@router.patch("/users/{user_id}/status")
@router.put("/users/{user_id}/status")
async def update_user_status(user_id: str, req: UserStatusUpdateRequest, admin_id: str = Depends(get_current_admin)):
    """Activate, deactivate, or ban a user account"""
    allowed_statuses = ["active", "deactivated", "banned"]
    if req.status not in allowed_statuses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status. Must be one of {allowed_statuses}")
        
    if user_id == admin_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot alter status of your own administrator account.")

    db = await get_database()
    obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else None
    target_user = await db.users.find_one({"_id": obj_id}) if obj_id else await db.users.find_one({"_id": user_id})
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    old_status = target_user.get("status", "active")
    await db.users.update_one({"_id": target_user["_id"]}, {"$set": {"status": req.status, "updated_at": datetime.now(timezone.utc)}})

    await log_admin_action(
        admin_id=admin_id,
        action="UPDATE_USER_STATUS",
        target_type="user",
        target_id=user_id,
        details={"old_status": old_status, "new_status": req.status, "target_email": target_user.get("email")}
    )

    return {"message": f"User account status changed to '{req.status}'", "user_id": user_id, "status": req.status}

@router.patch("/users/{user_id}/features")
@router.put("/users/{user_id}/features")
async def update_user_feature_overrides(user_id: str, req: UserFeaturesUpdateRequest, admin_id: str = Depends(get_current_admin)):
    """Set custom feature flag overrides for an individual user"""
    db = await get_database()
    obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else None
    target_user = await db.users.find_one({"_id": obj_id}) if obj_id else await db.users.find_one({"_id": user_id})
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    await db.users.update_one(
        {"_id": target_user["_id"]},
        {"$set": {"feature_overrides": req.features, "updated_at": datetime.now(timezone.utc)}}
    )

    await log_admin_action(
        admin_id=admin_id,
        action="SET_USER_FEATURE_OVERRIDES",
        target_type="user",
        target_id=user_id,
        details={"overrides": req.features, "target_email": target_user.get("email")}
    )

    return {"message": "User feature overrides updated successfully", "feature_overrides": req.features}

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin_id: str = Depends(get_current_admin)):
    """Delete a user and all their associated resumes from the platform"""
    if user_id == admin_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Forbidden: Cannot delete your own active administrator account")
    
    db = await get_database()
    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format")
        
    target_user = await db.users.find_one({"_id": obj_id})
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    resume_del_res = await db.resumes.delete_many({
        "$or": [{"user_id": user_id}, {"user_id": obj_id}]
    })
    
    await db.users.delete_one({"_id": obj_id})
    
    await log_admin_action(
        admin_id=admin_id,
        action="DELETE_USER",
        target_type="user",
        target_id=user_id,
        details={"deleted_email": target_user.get("email"), "deleted_resumes": resume_del_res.deleted_count}
    )
    
    return {
        "message": f"User {target_user.get('email')} and {resume_del_res.deleted_count} resumes deleted successfully.",
        "deleted_user_id": user_id
    }

# --------------------------------------------------------------------------
# Resume Management Endpoints
# --------------------------------------------------------------------------

@router.get("/resumes")
async def get_all_resumes(
    search: Optional[str] = Query(None),
    admin_id: str = Depends(get_current_admin)
):
    """List all resumes on the platform with ATS scores and owner details"""
    db = await get_database()
    
    cursor = db.resumes.find({}).sort("updated_at", -1)
    resumes_docs = await cursor.to_list(length=300)
    
    user_cache = {}
    resume_list = []
    for r in resumes_docs:
        uid = r.get("user_id")
        if uid and uid not in user_cache:
            try:
                search_filter = {"_id": ObjectId(uid)} if ObjectId.is_valid(str(uid)) else {"_id": uid}
                u_doc = await db.users.find_one(search_filter)
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
        
        if isinstance(search, str) and search.strip():
            s = search.strip().lower()
            if not (s in cand_name.lower() or s in cand_email.lower() or s in target_role.lower()):
                continue
                
        resume_list.append({
            "id": str(r["_id"]),
            "user_id": str(uid),
            "owner_name": user_info["name"],
            "owner_email": user_info["email"],
            "candidate_name": cand_name,
            "candidate_email": cand_email,
            "target_role": target_role,
            "score": r.get("score", 0),
            "template_style": r.get("template_style", "modern"),
            "accent_color": (r.get("pdf_preferences") or {}).get("accent_color", "#111827"),
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
        
    await log_admin_action(
        admin_id=admin_id,
        action="DELETE_RESUME",
        target_type="resume",
        target_id=resume_id,
        details={"deleted_resume_id": resume_id}
    )
        
    return {"message": "Resume successfully deleted from platform", "resume_id": resume_id}

# --------------------------------------------------------------------------
# Feature Flags Management
# --------------------------------------------------------------------------

@router.get("/features")
async def get_admin_features(admin_id: str = Depends(get_current_admin)):
    """Get all platform features and their current status flags"""
    db = await get_database()
    setting = await db.platform_settings.find_one({"key": "features"})
    
    saved_features = setting.get("features", {}) if setting else {}
    merged = {**DEFAULT_FEATURES}
    for k, v in saved_features.items():
        if k in merged:
            merged[k] = {**merged[k], **v}
        else:
            merged[k] = v
            
    return {
        "features": merged,
        "updated_at": setting.get("updated_at") if setting else None
    }

@router.post("/features")
async def update_admin_features(req: FeatureFlagsUpdateRequest, admin_id: str = Depends(get_current_admin)):
    """Update platform feature access levels (public, premium, disabled)"""
    db = await get_database()
    setting = await db.platform_settings.find_one({"key": "features"})
    current_features = setting.get("features", DEFAULT_FEATURES) if setting else DEFAULT_FEATURES
    
    merged = {**current_features}
    for feat_id, incoming in req.features.items():
        if feat_id in merged:
            status_val = incoming.get("status")
            if status_val in ["public", "premium", "disabled"]:
                merged[feat_id]["status"] = status_val
        elif feat_id in DEFAULT_FEATURES:
            status_val = incoming.get("status")
            if status_val in ["public", "premium", "disabled"]:
                merged[feat_id] = {**DEFAULT_FEATURES[feat_id], "status": status_val}
                
    now = datetime.now(timezone.utc)
    await db.platform_settings.update_one(
        {"key": "features"},
        {"$set": {"features": merged, "updated_at": now}},
        upsert=True
    )
    
    await log_admin_action(
        admin_id=admin_id,
        action="UPDATE_FEATURE_FLAGS",
        target_type="system",
        target_id="features",
        details={"updated_features": list(req.features.keys())}
    )
    
    return {
        "message": "Platform feature flags successfully updated and deployed live!",
        "features": merged,
        "updated_at": now
    }

# --------------------------------------------------------------------------
# Template & Theme/Color Management
# --------------------------------------------------------------------------

@router.get("/templates")
async def get_templates(admin_id: str = Depends(get_current_admin)):
    """Get active and available resume layout templates"""
    db = await get_database()
    setting = await db.platform_settings.find_one({"key": "templates"})
    templates = setting.get("templates", DEFAULT_TEMPLATES) if setting else DEFAULT_TEMPLATES
    return {"templates": templates}

@router.post("/templates")
async def update_templates(templates: List[TemplateConfigItem], admin_id: str = Depends(get_current_admin)):
    """Save template configuration and availability flags"""
    db = await get_database()
    templates_data = [t.model_dump() for t in templates]
    await db.platform_settings.update_one(
        {"key": "templates"},
        {"$set": {"templates": templates_data, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    await log_admin_action(
        admin_id=admin_id,
        action="UPDATE_TEMPLATES",
        target_type="templates",
        target_id="config",
        details={"count": len(templates_data)}
    )
    return {"message": "Templates updated successfully", "templates": templates_data}

@router.get("/themes")
async def get_themes(admin_id: str = Depends(get_current_admin)):
    """Get available platform accent color palettes"""
    db = await get_database()
    setting = await db.platform_settings.find_one({"key": "themes"})
    themes = setting.get("themes", DEFAULT_THEMES) if setting else DEFAULT_THEMES
    return {"themes": themes}

@router.post("/themes")
async def update_themes(themes: List[ThemeItem], admin_id: str = Depends(get_current_admin)):
    """Update color themes with strict 6-digit hex validation (#111827, etc.)"""
    for t in themes:
        if not HEX_COLOR_REGEX.match(t.hex_code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid hex color code: '{t.hex_code}'. Must be a valid 6-digit hex format (e.g. #111827)."
            )
            
    db = await get_database()
    themes_data = [t.model_dump() for t in themes]
    await db.platform_settings.update_one(
        {"key": "themes"},
        {"$set": {"themes": themes_data, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    await log_admin_action(
        admin_id=admin_id,
        action="UPDATE_THEMES",
        target_type="themes",
        target_id="config",
        details={"count": len(themes_data)}
    )
    return {"message": "Color themes successfully verified and updated", "themes": themes_data}

# --------------------------------------------------------------------------
# System Settings & Maintenance Mode
# --------------------------------------------------------------------------

@router.get("/maintenance")
async def get_maintenance_status(admin_id: str = Depends(get_current_admin)):
    """Check maintenance mode status"""
    db = await get_database()
    setting = await db.platform_settings.find_one({"key": "maintenance"})
    if not setting:
        return {"enabled": False, "message": "System is undergoing scheduled maintenance.", "allowed_roles": ["super_admin", "admin"]}
    return {
        "enabled": setting.get("enabled", False),
        "message": setting.get("message", "System is undergoing scheduled maintenance."),
        "allowed_roles": setting.get("allowed_roles", ["super_admin", "admin"])
    }

@router.post("/maintenance")
async def update_maintenance_status(req: MaintenanceModeRequest, admin_id: str = Depends(require_super_admin)):
    """Toggle maintenance mode on/off (requires Super Admin)"""
    db = await get_database()
    now = datetime.now(timezone.utc)
    update_doc = {
        "enabled": req.enabled,
        "message": req.message,
        "allowed_roles": req.allowed_roles,
        "updated_at": now,
        "updated_by": str(admin_id)
    }
    await db.platform_settings.update_one(
        {"key": "maintenance"},
        {"$set": update_doc},
        upsert=True
    )
    await log_admin_action(
        admin_id=admin_id,
        action="TOGGLE_MAINTENANCE_MODE",
        target_type="system",
        target_id="maintenance",
        details={"enabled": req.enabled, "message": req.message}
    )
    return {"message": f"Maintenance mode set to {req.enabled}", "maintenance": update_doc}

# --------------------------------------------------------------------------
# Broadcast Banner Endpoints
# --------------------------------------------------------------------------

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
    
    await log_admin_action(
        admin_id=admin_id,
        action="UPDATE_BROADCAST",
        target_type="broadcast",
        target_id="global",
        details={"active": req.active, "type": req.type}
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
    await log_admin_action(
        admin_id=admin_id,
        action="CLEAR_BROADCAST",
        target_type="broadcast",
        target_id="global",
        details={}
    )
    return {"message": "Platform broadcast banner deactivated"}

# --------------------------------------------------------------------------
# Audit Logs
# --------------------------------------------------------------------------

@router.get("/audit-logs")
async def get_audit_logs(
    action: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    admin_id: str = Depends(get_current_admin)
):
    """Retrieve chronologically ordered system administrative audit trail"""
    db = await get_database()
    query = {}
    if action and action.strip():
        query["action"] = action.strip()
        
    cursor = db.audit_logs.find(query).sort("created_at", -1).limit(limit)
    logs = await cursor.to_list(length=limit)
    
    result = []
    for l in logs:
        result.append({
            "id": str(l["_id"]),
            "admin_id": l.get("admin_id"),
            "action": l.get("action"),
            "target_type": l.get("target_type"),
            "target_id": l.get("target_id"),
            "details": l.get("details", {}),
            "created_at": l.get("created_at")
        })
        
    return {"logs": result, "total": len(result)}
