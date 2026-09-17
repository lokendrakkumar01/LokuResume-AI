import os
try:
    import httpx
except ImportError:
    httpx = None
import json
import urllib.request
import urllib.error
import asyncio
import logging
import re
from fastapi import APIRouter, HTTPException, Depends, status, Header
from pydantic import BaseModel
from typing import List, Optional
from services.ai_suggestions import ai_suggestions
from services.resume_scorer import scorer
from auth.jwt_handler import get_user_from_token
from routes.admin import check_feature_access

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Tools"])

class BulletEnhanceRequest(BaseModel):
    text: str
    context: Optional[str] = "project"  # "project", "experience", "summary"

class BulletEnhanceResponse(BaseModel):
    original: str
    enhanced: str
    variations: List[str]

class JDAnalysisRequest(BaseModel):
    resume_summary: Optional[str] = ""
    resume_skills: List[str] = []
    job_description: str

class JDAnalysisResponse(BaseModel):
    match_score: float
    matching_keywords: List[str]
    missing_keywords: List[str]
    recommendations: List[str]

@router.post("/enhance-bullet", response_model=BulletEnhanceResponse)
async def enhance_bullet(request: BulletEnhanceRequest, authorization: Optional[str] = Header(None)):
    """Generate high-impact ATS optimized bullet variations for project or experience descriptions"""
    user_id = None
    if authorization and isinstance(authorization, str):
        token = authorization.replace("Bearer ", "").strip()
        user_id = get_user_from_token(token)
    await check_feature_access(user_id, "ai_bullet_generator")
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    enhanced = ai_suggestions.enhance_resume_text(text, context=request.context)
    
    # Create 3 distinct bullet point variations
    variations = [
        enhanced,
        f"Spearheaded {text.lower()} by applying industry best practices, boosting team productivity and project delivery speed by 35%.",
        f"Architected and implemented {text.lower()}, optimizing workflow efficiency and serving 1,000+ active users with high reliability."
    ]
    
    return BulletEnhanceResponse(
        original=text,
        enhanced=enhanced,
        variations=variations
    )

@router.post("/analyze-jd", response_model=JDAnalysisResponse)
async def analyze_job_description(request: JDAnalysisRequest, authorization: Optional[str] = Header(None)):
    """Analyze resume skills and summary against a target Job Description to compute ATS match score"""
    user_id = None
    if authorization and isinstance(authorization, str):
        token = authorization.replace("Bearer ", "").strip()
        user_id = get_user_from_token(token)
    await check_feature_access(user_id, "ai_ats_deep_audit")
    jd_text = request.job_description.lower()
    if not jd_text.strip():
        raise HTTPException(status_code=400, detail="Job description text cannot be empty")
    
    # Extract candidate keywords from JD using regex word boundaries
    words = re.findall(r'\b[a-z]{3,}\b', jd_text)
    
    # Filter out common stop words
    stop_words = {'the', 'and', 'for', 'with', 'that', 'this', 'you', 'will', 'have', 'from', 'are', 'your', 'our', 'work', 'team', 'company'}
    candidate_keywords = list(set([w for w in words if w not in stop_words and len(w) > 3]))[:25]
    
    summary_text = (request.resume_summary or "").strip()
    skills_list = [str(s) for s in (request.resume_skills or []) if s]
    resume_text = f"{summary_text} {' '.join(skills_list)}".lower()
    
    matching = [kw for kw in candidate_keywords if kw in resume_text]
    missing = [kw for kw in candidate_keywords if kw not in resume_text]
    
    score = (len(matching) / max(len(candidate_keywords), 1)) * 100
    
    recommendations = []
    if missing:
        recommendations.append(f"Consider adding missing keywords: {', '.join(missing[:5])}")
    if score < 60:
        recommendations.append("Tailor your professional summary to reflect terms mentioned in the job post.")
    else:
        recommendations.append("Strong ATS alignment detected for this job post!")
        
    return JDAnalysisResponse(
        match_score=round(score, 1),
        matching_keywords=matching,
        missing_keywords=missing[:8],
        recommendations=recommendations
    )


class AIChatRequest(BaseModel):
    message: str
    language: Optional[str] = "en"  # "en" or "hi"
    track: Optional[str] = "tech"    # "tech" or "business"
    context: Optional[dict] = None

class AIChatResponse(BaseModel):
    reply: str
    suggestions: List[str] = []
    speech: Optional[str] = None

async def try_gemini_chat(prompt: str, language: str, track: str) -> Optional[dict]:
    """Call Google Gemini API if GEMINI_API_KEY or GOOGLE_API_KEY is configured in env"""
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not gemini_key:
        return None
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
    system_instruction = (
        f"You are the CVNex AI Career and ATS Coach for the CVNex Resume Builder platform. "
        f"The candidate is in the '{track.upper()}' track (either 'tech' developer or 'business' executive). "
        f"Respond in {'Hindi (Devanagari script)' if language == 'hi' else 'English'}. "
        f"Provide concise, highly actionable, ATS-friendly advice, bullet points, and metrics. "
        f"Do not use markdown tables. Keep replies within 120 words for smooth voice reading."
    )
    
    payload = {
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.6,
            "maxOutputTokens": 350
        }
    }
    
    try:
        if httpx is not None:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    clean_speech = re.sub(r'[*#_`\[\]]', '', text)
                    clean_speech = re.sub(r'\n+', '. ', clean_speech).strip()
                    return {"reply": text, "speech": clean_speech}
        else:
            def _sync_post():
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=5.0) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode("utf-8"))
                        text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                        clean_speech = re.sub(r'[*#_`\[\]]', '', text)
                        clean_speech = re.sub(r'\n+', '. ', clean_speech).strip()
                        return {"reply": text, "speech": clean_speech}
                    return None
            return await asyncio.to_thread(_sync_post)
    except Exception as e:
        logger.warning(f"Gemini API chat fallback: {e}")
    return None

@router.post("/chat-assist", response_model=AIChatResponse)
async def ai_chat_assist(request: AIChatRequest, authorization: Optional[str] = Header(None)):
    """Interactive AI Career & ATS Coach chatbot answering questions via text or voice in selected language"""
    user_id = None
    if authorization and isinstance(authorization, str):
        token = authorization.replace("Bearer ", "").strip()
        user_id = get_user_from_token(token)
    await check_feature_access(user_id, "ai_voice_assistant")

    raw_msg = request.message.strip()
    if not raw_msg:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    lang = (request.language or "en").lower()
    track = (request.track or "tech").lower()

    # Clean leading emojis and symbols (e.g. "💡 5 दमदार एक्शन वर्ब्स" -> "5 दमदार एक्शन वर्ब्स")
    clean_msg = re.sub(r'^[^\w\s\u0900-\u097F]+', '', raw_msg).strip().lower()
    clean_msg = re.sub(r'\s+', ' ', clean_msg)
    msg = clean_msg if clean_msg else raw_msg.lower()

    # Detect Hindi script or romanized Hindi keywords
    is_hindi = lang == "hi" or any('\u0900' <= char <= '\u097F' for char in msg) or any(
        w in msg for w in ["kaise", "kya", "batao", "karo", "likho", "badhaye", "tayari", "namaste", "chahiye", "galti", "madad", "banao"]
    )
    # Detect Business vs Tech track
    is_biz = track == "business" or any(
        w in msg for w in ["business", "biz", "mba", "bba", "sales", "executive", "p&l", "manager", "operations", "बिजनेस", "मैनेजमेंट", "सेल्स", "प्रॉफिट", "मार्केटिंग", "रेफरेंस"]
    )

    # 1. Try Gemini LLM First if API Key is configured
    gemini_result = await try_gemini_chat(raw_msg, "hi" if is_hindi else "en", "business" if is_biz else "tech")
    if gemini_result:
        default_suggestions = [
            "5 दमदार एक्शन वर्ब्स बताओ" if is_hindi else "Give me 5 strong action verbs",
            "ATS स्कोर 90%+ कैसे करें?" if is_hindi else "How to get 90%+ ATS Score?",
            "गलतियाँ चेक करें" if is_hindi else "Check Resume Mistakes"
        ]
        return AIChatResponse(
            reply=gemini_result["reply"],
            suggestions=default_suggestions,
            speech=gemini_result.get("speech")
        )

    reply = ""
    speech = None
    suggestions = []

    # 2. Action Verbs & Bullet Points (वर्ब्स / एक्शन)
    if any(k in msg for k in [
        "verb", "verbs", "action", "power verb", "bullet", "bullets", "point",
        "वर्ब", "वर्ब्स", "एक्शन", "दमदार", "क्रिया", "शक्तिशाली", "shabd", "damdar", "शब्द"
    ]):
        if is_biz:
            if is_hindi:
                reply = (
                    "💼 **बिजनेस और मैनेजमेंट रेज़्युमे के लिए 5 सबसे असरदार एक्शन वर्ब्स:**\n\n"
                    "1. 📈 **Spearheaded (नेतृत्व किया)**: '12 राज्यों में नई B2B मार्केट एक्सपेंशन स्ट्रैटेजी का नेतृत्व किया, जिससे सालाना रेवेन्यू 35% बढ़ा।'\n"
                    "2. 🤝 **Negotiated (सौदा तय किया)**: 'प्रमुख सप्लायर्स के साथ $1.8M ARR के एनुअल कॉन्ट्रैक्ट्स सफलतापूर्वक नेगोशिएट किए।'\n"
                    "3. 💰 **Optimized (बचत व मुनाफा बढ़ाया)**: 'ब्रांच के ऑपरेटिंग बजट को ऑप्टिमाइज़ करके ओवरहेड खर्च में 22% की बचत दर्ज की।'\n"
                    "4. 🎯 **Orchestrated (संचालन किया)**: '15 सदस्यीय क्रॉस-फंक्शनल सेल्स व डिस्ट्रीब्यूशन टीम का सफल संचालन किया।'\n"
                    "5. 🚀 **Accelerated (तेजी लाई)**: 'नई CRM पाइपलाइन लागू करके सेल्स कन्वर्जन साइकिल को 45 दिन से घटाकर 20 दिन किया।'"
                )
                speech = "बिजनेस रेज़्युमे के लिए 5 दमदार एक्शन वर्ब्स हैं: Spearheaded यानी नेतृत्व किया, Negotiated यानी बड़े सौदे क्लोज किए, Optimized यानी प्रॉफिट बढ़ाया, Orchestrated यानी टीम का संचालन किया, और Accelerated यानी सेल्स साइकिल को तेज़ किया।"
                suggestions = [
                    "बिजनेस ATS स्कोर 90%+ कैसे करें?",
                    "बिजनेस एग्जीक्यूटिव समरी लिखो",
                    "Michael Scott टेम्पलेट क्या है?"
                ]
            else:
                reply = (
                    "💼 **5 High-Impact Power Action Verbs for Business & Management:**\n\n"
                    "1. 📈 **Spearheaded**: 'Spearheaded regional market expansion delivering 140% of corporate revenue targets.'\n"
                    "2. 🤝 **Negotiated**: 'Negotiated and closed top-tier supplier contracts generating $1.8M ARR.'\n"
                    "3. 💰 **Optimized**: 'Optimized operational expenditure reducing branch overhead by 22%.'\n"
                    "4. 🎯 **Orchestrated**: 'Orchestrated 15-member sales team achieving lowest attrition in corporate history.'\n"
                    "5. 🚀 **Accelerated**: 'Accelerated B2B enterprise pipeline conversion cycle from 45 to 20 days.'"
                )
                speech = "Here are 5 executive action verbs: Spearheaded for market expansion, Negotiated for revenue contracts, Optimized for cost reduction, Orchestrated for team alignment, and Accelerated for sales cycle velocity."
                suggestions = [
                    "How to get 90%+ Business ATS score?",
                    "Write Business Executive summary",
                    "How to format References?"
                ]
        else:
            if is_hindi:
                reply = (
                    "💻 **सॉफ्टवेयर व टेक रेज़्युमे के लिए 5 सबसे असरदार एक्शन वर्ब्स:**\n\n"
                    "1. ⚙️ **Architected (सिस्टम डिज़ाइन किया)**: 'प्रति सेकंड 25,000 इवेंट्स प्रोसेस करने वाला हाई-थ्रूपुट इवेंट पाइपलाइन आर्किटेक्ट किया।'\n"
                    "2. 🚀 **Spearheaded (माइग्रेशन लीड किया)**: 'React और TypeScript पर माइग्रेशन का नेतृत्व किया, जिससे पेज लोड 50% तेज़ हुआ।'\n"
                    "3. ⚡ **Automated (ऑटोमेशन किया)**: 'CI/CD पाइपलाइन ऑटोमेट करके डिप्लॉयमेंट समय 4 घंटे से घटाकर 15 मिनट किया।'\n"
                    "4. 🛠️ **Engineered (इंजीनियर किया)**: 'FastAPI और PostgreSQL में 99.98% अपटाइम के साथ स्केलेबल REST APIs बनाईं।'\n"
                    "5. 📊 **Scaled (स्केल किया)**: 'Redis कैशिंग लागू करके 100,000+ एक्टिव यूज़र्स के लिए डेटाबेस लेटेंसी 65% घटाई।'"
                )
                speech = "टेक रेज़्युमे के लिए 5 सबसे दमदार एक्शन वर्ब्स हैं: Architected यानी सिस्टम डिज़ाइन किया, Spearheaded यानी माइग्रेशन लीड किया, Automated यानी डिप्लॉयमेंट ऑटोमेट किया, Engineered यानी स्केलेबल APIs बनाईं, और Scaled यानी लेटेंसी कम करके लाखों यूज़र्स तक पहुंचाया।"
                suggestions = [
                    "ATS स्कोर 90%+ कैसे करें?",
                    "सॉफ्टवेयर इंजीनियर की समरी लिखो",
                    "प्रोजेक्ट्स कैसे जोड़ें?"
                ]
            else:
                reply = (
                    "💻 **5 High-Impact Action Verbs for Software Engineering:**\n\n"
                    "1. ⚙️ **Architected**: 'Architected distributed event streaming pipeline processing 25k events/sec with Apache Kafka.'\n"
                    "2. 🚀 **Spearheaded**: 'Spearheaded frontend migration to React & TypeScript, boosting page load speeds by 50%.'\n"
                    "3. ⚡ **Automated**: 'Automated Docker CI/CD pipelines reducing deployment cycle from 4 hours to 15 minutes.'\n"
                    "4. 🛠️ **Engineered**: 'Engineered high-throughput REST APIs in FastAPI maintaining 99.98% SLA uptime.'\n"
                    "5. 📊 **Scaled**: 'Scaled backend with Redis caching, slashing database latency by 65% for 100,000+ users.'"
                )
                speech = "Here are 5 high-impact tech action verbs: Architected for distributed pipelines, Spearheaded for tech stack migrations, Automated for CI/CD speed, Engineered for high-uptime APIs, and Scaled for millions of queries."
                suggestions = [
                    "How to get 90%+ ATS Score?",
                    "Write a summary for Full Stack Engineer",
                    "How to format projects for ATS?"
                ]

    # 3. Professional Summary (समरी / सारांश)
    elif any(k in msg for k in [
        "summary", "about me", "intro", "bio", "objective", "parichay", "samari",
        "समरी", "सारांश", "परिचय", "बायो", "ऑब्जेक्टिव", "प्रोफाइल"
    ]):
        if is_biz:
            if is_hindi:
                reply = (
                    "👔 **बिजनेस व एग्जीक्यूटिव समरी का ATS-फ्रेंडली टेम्पलेट:**\n\n"
                    "\"परिणाम-उन्मुख और रणनीतिक बिजनेस लीडर, जिन्हें ब्रांच ऑपरेशंस, P&L मैनेजमेंट और B2B एंटरप्राइज सेल्स का 8+ वर्षों का अनुभव है। सालाना रेवेन्यू को 140% तक बढ़ाने, 15+ सदस्यों की क्रॉस-फंक्शनल टीम को मेंटर करने और प्रमुख कॉर्पोरेट क्लाइंट्स के साथ $2M+ के अनुबंध क्लोज करने का प्रमाणित ट्रैक रिकॉर्ड। रणनीतिक योजना और लागत नियंत्रण में माहिर।\"\n\n"
                    "💡 **टिप**: इसे स्टेप 2 (Summary) में पेस्ट करें और अपने वास्तविक अनुभव व पद के अनुसार एडिट करें!"
                )
                speech = "यह रहा बिजनेस एग्जीक्यूटिव समरी टेम्पलेट: परिणाम-उन्मुख बिजनेस लीडर, जिन्हें P&L मैनेजमेंट और B2B सेल्स का अनुभव है। 15 सदस्यों की टीम का नेतृत्व और सालाना रेवेन्यू में 140% की वृद्धि करने का प्रमाणित ट्रैक रिकॉर्ड। इसे स्टेप 2 में इस्तेमाल करें!"
                suggestions = [
                    "बिजनेस ATS स्कोर 90%+ कैसे करें?",
                    "5 दमदार एक्शन वर्ब्स बताओ",
                    "Michael Scott टेम्पलेट क्या है?"
                ]
            else:
                reply = (
                    "👔 **High-Converting ATS Business Executive Summary:**\n\n"
                    "\"Dynamic, results-driven Business Executive with 8+ years of leadership across branch operations, P&L management, and enterprise sales. Proven track record boosting annual branch revenue by 140%, leading high-performing cross-functional teams of 15+, and closing $2M+ in multi-year corporate client contracts. Expert in strategic budgeting and client retention.\"\n\n"
                    "💡 **Tip**: Paste this directly into Step 2 (Summary) and personalize your numbers!"
                )
                speech = "Here is your executive summary template: Dynamic Business Executive with 8+ years experience in P&L management and enterprise sales, proven record boosting revenue by 140% and leading 15-person teams. Paste this into Step 2!"
                suggestions = [
                    "How to get 90%+ Business ATS score?",
                    "Give me 5 strong action verbs",
                    "How to format References?"
                ]
        else:
            if is_hindi:
                reply = (
                    "💻 **सॉफ्टवेयर इंजीनियर समरी का ATS-फ्रेंडली टेम्पलेट:**\n\n"
                    "\"अनुभवी और परिणाम-उन्मुख सॉफ्टवेयर इंजीनियर, जिन्हें हाई-स्केलेबल वेब ऍप्लिकेशन्स, माइक्रोसर्विसेज और क्लाउड आर्किटेक्चर (AWS/Docker) का 3+ वर्षों का अनुभव है। API लेटेंसी को 40% घटाने और सिस्टम थ्रूपुट दोगुना करने का प्रमाणित ट्रैक रिकॉर्ड। React, Node.js, Python और आधुनिक DevOps टूल्स में दक्ष। समस्या निवारण और एजाइल डिलीवरी में विशेषज्ञ।\"\n\n"
                    "💡 **टिप**: इसे स्टेप 2 (Summary) में पेस्ट करें और अपनी पसंदीदा टेक्नोलॉजीज के नाम जोड़ें!"
                )
                speech = "यह रहा सॉफ्टवेयर इंजीनियर समरी टेम्पलेट: अनुभवी सॉफ्टवेयर इंजीनियर जिन्हें स्केलेबल वेब ऐप्स, माइक्रोसर्विसेज और क्लाउड का 3 साल का अनुभव है। API लेटेंसी 40% कम करने का ट्रैक रिकॉर्ड। React, Node और Python में दक्ष। इसे स्टेप 2 में जोड़ें!"
                suggestions = [
                    "ATS स्कोर 90%+ कैसे करें?",
                    "5 दमदार एक्शन वर्ब्स बताओ",
                    "प्रोजेक्ट्स कैसे जोड़ें?"
                ]
            else:
                reply = (
                    "💻 **High-Converting ATS Software Engineer Summary:**\n\n"
                    "\"Innovative and results-driven Software Engineer with 3+ years of experience engineering scalable web applications, distributed microservices, and cloud systems (AWS/Docker). Proven track record reducing API response latency by 40% and optimizing infrastructure throughput. Proficient in React, Node.js, Python, and automated CI/CD pipelines.\"\n\n"
                    "💡 **Tip**: Paste this into Step 2 (Summary) and tailor your core stack!"
                )
                speech = "Here is your software engineer summary: Innovative Software Engineer with 3+ years engineering scalable web applications and cloud microservices, proven record reducing API latency by 40% with React, Node, and Python."
                suggestions = [
                    "How to get 90%+ ATS Score?",
                    "Give me 5 strong action verbs",
                    "How to format projects for ATS?"
                ]

    # 4. ATS Score & Google XYZ Formula
    elif any(k in msg for k in [
        "score", "ats", "rank", "badhaye", "improve", "increase", "xyz", "formula",
        "स्कोर", "बढ़ाएं", "सुधारें", "90%", "फॉर्मूला", "फार्मूला"
    ]):
        if is_biz:
            if is_hindi:
                reply = (
                    "🎯 **बिजनेस रेज़्युमे में 90%+ ATS स्कोर पाने के 4 नियम:**\n\n"
                    "1. 📊 **P&L व रेवेन्यू आंकड़े (Experience)**: वर्क एक्सपीरियंस में आंकड़े ज़रूर लिखें (उदा. 'सालाना सेल्स 35% बढ़ाई', '$2.5M ऑपरेटिंग बजट संभाला')।\n"
                    "2. 💼 **10-12 मुख्य बिजनेस स्किल्स**: स्टेप 4 में Strategic Planning, P&L Management, CRM, Budgeting & Forecasting जोड़ें।\n"
                    "3. 🌟 **Michael Scott 2-कॉलम लेआउट**: साइडबार में फोटो, कांटेक्ट, रेफरेंसेज और हॉबीज; मुख्य कॉलम में वर्क एक्सपीरियंस व एजुकेशन।\n"
                    "4. 🤝 **रेफरेंसेस व भाषाएं**: स्टेप 5 में सीनियर मेंटर्स के 2 रेफरेंस और स्टेप 9 में भाषा प्रोफिशिएंसी बार जोड़ें।"
                )
                speech = "बिजनेस रेज़्युमे में 90%+ ATS स्कोर पाने के लिए: पहले, वर्क एक्सपीरियंस में 35% सेल्स ग्रोथ और बजट के आंकड़े लिखें। दूसरे, स्टेप 4 में स्ट्रैटेजिक प्लानिंग और P&L स्किल्स जोड़ें। तीसरे, Michael Scott लेआउट चुनें, और चौथे, स्टेप 5 में रेफरेंसेस ज़रूर दें।"
                suggestions = [
                    "बिजनेस एग्जीक्यूटिव समरी लिखो",
                    "5 दमदार एक्शन वर्ब्स बताओ",
                    "रेफरेंसेज कैसे जोड़ें?"
                ]
            else:
                reply = (
                    "🎯 **4 Essential Rules to Hit 90%+ ATS on a Business Resume:**\n\n"
                    "1. 📊 **Quantify P&L & Revenue Metrics**: Include financial wins (e.g. 'boosted sales by 35%', 'managed $2.5M operating budget').\n"
                    "2. 💼 **Add 10-12 Core Business Skills**: Include Strategic Planning, P&L, Sales & Negotiations, CRM, Budgeting in Step 4.\n"
                    "3. 🌟 **Use Michael Scott 2-Column Template**: Proven executive layout optimized for managerial parsing.\n"
                    "4. 🤝 **Corporate References & Languages**: Include 2 professional references in Step 5 and spoken languages in Step 9."
                )
                speech = "To achieve a 90%+ ATS score on a business resume: 1. Quantify revenue and P&L metrics in experience. 2. Include core business skills like Strategic Planning and CRM. 3. Use the Michael Scott 2-column layout. 4. Add verified references."
                suggestions = [
                    "Write Business Executive summary",
                    "Give me 5 strong action verbs",
                    "How to format References?"
                ]
        else:
            if is_hindi:
                reply = (
                    "🎯 **टेक रेज़्युमे में 90%+ ATS स्कोर पाने के 4 सिद्ध नियम:**\n\n"
                    "1. 💡 **Google XYZ फॉर्मूला**: हर बुलेट पॉइंट 'Accomplished [X] as measured by [Y], by doing [Z]' फॉर्मेट में लिखें (उदा. 'API लेटेंसी 40% कम की')।\n"
                    "2. 💻 **कोर टेक स्टैक**: जॉब डिस्क्रिप्शन से मेल खाते हुए 10-15 मुख्य टूल्स (React, Python, Docker, AWS) स्टेप 4 में जोड़ें।\n"
                    "3. 🛡️ **LeetCode और GitHub प्रोफाइल्स**: स्टेप 1 में लाइव GitHub रिपॉजिटरी और एक्टिव कोडिंग प्रोफाइल्स के लिंक्स दें।\n"
                    "4. 🔍 **ATS Job Matcher**: CVNex के जॉब मैचर टूल में जॉब डिस्क्रिप्शन पेस्ट करके मिसिंग कीवर्ड्स तुरंत जांचें!"
                )
                speech = "टेक रेज़्युमे में 90%+ ATS स्कोर पाने के लिए: पहले, Google XYZ फॉर्मूले से लेटेंसी और यूज़र्स के आंकड़े लिखें। दूसरे, स्टेप 4 में 10 से 15 मुख्य टेक स्किल्स जोड़ें। तीसरे, GitHub और LeetCode प्रोफाइल्स लिंक करें, और चौथे, जॉब मैचर से मिसिंग कीवर्ड्स चेक करें।"
                suggestions = [
                    "5 दमदार एक्शन वर्ब्स बताओ",
                    "सॉफ्टवेयर इंजीनियर की समरी लिखो",
                    "प्रोजेक्ट्स कैसे जोड़ें?"
                ]
            else:
                reply = (
                    "🎯 **4 Proven Rules to Achieve 90%+ ATS Score on Tech Resumes:**\n\n"
                    "1. 💡 **Google's XYZ Formula**: 'Accomplished [X] as measured by [Y], by doing [Z]' (e.g. 'reduced latency by 40% for 15k users').\n"
                    "2. 💻 **Core Technical Stack**: Match 10-15 keywords from the job description (React, Python, Docker, AWS) in Step 4.\n"
                    "3. 🛡️ **Coding Profiles (GitHub & LeetCode)**: Link your active GitHub and LeetCode URLs in Step 1 for recruiter verification.\n"
                    "4. 🔍 **Use ATS Job Matcher**: Paste target job posts into CVNex ATS Matcher to identify and insert missing skills!"
                )
                speech = "To achieve 90%+ ATS score in tech: 1. Use Google's XYZ formula with quantifiable metrics like 40% latency reduction. 2. Match 10 to 15 core tech keywords. 3. Add GitHub and LeetCode links. 4. Run the ATS Job Matcher."
                suggestions = [
                    "Give me 5 strong action verbs",
                    "Write a summary for Full Stack Engineer",
                    "How to format projects for ATS?"
                ]

    # 5. Projects & Coding Profiles (प्रोजेक्ट्स / GitHub / LeetCode)
    elif any(k in msg for k in [
        "project", "projects", "github", "leetcode", "portfolio", "code", "coding",
        "प्रोजेक्ट", "प्रोजेक्ट्स", "गिटहब", "लीटकोड", "पोर्टफोलियो", "कोडिंग"
    ]):
        if is_biz:
            if is_hindi:
                reply = (
                    "💼 **बिजनेस रेज़्युमे में प्रोजेक्ट्स / केस स्टडीज कैसे लिखें:**\n\n"
                    "• **प्रोजेक्ट का नाम**: क्लाइंट या इंटरनल इनिशिएटिव (उदा. 'Enterprise ERP Migration' या 'Q3 Regional Sales Blitz')\n"
                    "• **आपकी भूमिका**: Project Lead / Strategy Director\n"
                    "• **ठोस नतीजे**: '6 महीने में $1.2M का नया रेवेन्यू उत्पन्न किया और क्लाइंट ऑनबोर्डिंग समय 30% घटाया।'\n\n"
                    "💡 बिजनेस प्रोफाइल्स के लिए कोडिंग लिंक की आवश्यकता नहीं होती; इसकी जगह **Case Studies Deck** या **LinkedIn** लिंक दें!"
                )
                speech = "बिजनेस रेज़्युमे में प्रोजेक्ट्स की जगह केस स्टडीज और बड़े इनिशिएटिव्स लिखें, जैसे Enterprise ERP Migration जिसमें 1.2 मिलियन डॉलर का रेवेन्यू उत्पन्न हुआ। कोडिंग लिंक की जगह लिंक्डइन और केस स्टडी डेक लिंक दें!"
            else:
                reply = (
                    "💼 **Formatting Business Case Studies & Initiatives:**\n\n"
                    "• **Project Title**: Initiative name (e.g., 'ERP Enterprise Rollout' or 'Q4 Regional Sales Blitz')\n"
                    "• **Leadership Role**: Project Lead / Strategy Consultant\n"
                    "• **Measurable Outcome**: 'Generated $1.2M incremental ARR and accelerated onboarding by 30%.'\n\n"
                    "💡 Business profiles do not require code repos; link your **LinkedIn** and **Case Studies Deck** instead!"
                )
                speech = "For business profiles, frame projects as high-impact case studies highlighting revenue growth and strategic rollouts. Link your LinkedIn and Case Study deck instead of GitHub."
            suggestions = ["बिजनेस ATS स्कोर 90%+ कैसे करें?", "बिजनेस एग्जीक्यूटिव समरी लिखो"]
        else:
            if is_hindi:
                reply = (
                    "💻 **टेक प्रोजेक्ट्स को 90%+ ATS फ्रेंडली बनाने का फॉर्मूला:**\n\n"
                    "1. 🛠️ **Tech Stack स्पष्ट करें**: टाइटल के साथ उपयोग की गई टेक्नोलॉजीज लिखें (उदा. `React • FastAPI • PostgreSQL • Docker`)\n"
                    "2. 🚀 **Google XYZ बुलेट पॉइंट्स**:\n"
                    "   • 'FastAPI में स्केलेबल RESTful APIs आर्किटेक्ट कीं, जिससे सर्वर रिस्पांस टाइम 45% तेज़ हुआ।'\n"
                    "   • 'Redis कैशिंग लागू करके 15,000+ यूज़र्स के लिए डेटाबेस लोड 60% घटाया।'\n"
                    "3. 🔗 **लाइव लिंक्स**: GitHub रिपॉजिटरी और लाइव होस्टेड डेमो लिंक अवश्य शामिल करें!"
                )
                speech = "टेक प्रोजेक्ट्स लिखते समय टेक स्टैक स्पष्ट लिखें, जैसे React, FastAPI और Docker। बुलेट पॉइंट्स में 45% तेज़ रिस्पांस टाइम और 15 हजार यूज़र्स जैसे आंकड़े लिखें, और गिटहब व लाइव डेमो लिंक ज़रूर दें!"
            else:
                reply = (
                    "💻 **High-Impact ATS Project Formatting Formula:**\n\n"
                    "1. 🛠️ **Tech Stack Line**: Clearly list technologies below the title (e.g. `React • FastAPI • PostgreSQL • Docker`)\n"
                    "2. 🚀 **Google XYZ Bullets**:\n"
                    "   • 'Architected asynchronous REST APIs in FastAPI, improving response latency by 45%.'\n"
                    "   • 'Integrated Redis cache, slashing database queries by 60% for 15k active users.'\n"
                    "3. 🔗 **Live Links**: Always include working GitHub repository and deployed demo URLs!"
                )
                speech = "Format tech projects with clear stack tags like React, FastAPI, and Docker. Use XYZ bullets with metrics like 45% latency improvement, and include GitHub and live demo links."
            suggestions = ["5 दमदार एक्शन वर्ब्स बताओ", "सॉफ्टवेयर इंजीनियर की समरी लिखो"]

    # 6. Work Experience & Metrics (एक्सपीरियंस / नौकरी / आंकड़े)
    elif any(k in msg for k in [
        "experience", "work experience", "job", "career", "company", "metrics",
        "एक्सपीरियंस", "अनुभव", "कार्य अनुभव", "नौकरी", "कंपनी", "आंकड़े", "anubhav"
    ]):
        if is_biz:
            if is_hindi:
                reply = (
                    "💼 **बिजनेस वर्क एक्सपीरियंस में आंकड़े (Numbers) जोड़ने का तरीका:**\n\n"
                    "कमज़ोर लाइन: *'कंपनी के लिए सेल्स का काम किया।'* ❌\n"
                    "पावरफुल लाइन: *'15 सदस्यीय सेल्स टीम का नेतृत्व करते हुए सालाना रेवेन्यू $2.4M तक पहुंचाया और क्वार्टरली टारगेट 135% हासिल किया।'* ✅\n\n"
                    "हमेशा 4 चीजें शामिल करें: **P&L / बजट साइज**, **ग्रोथ %**, **टीम साइज**, और **लागत में बचत**।"
                )
                speech = "बिजनेस वर्क एक्सपीरियंस में हमेशा नंबर्स लिखें। जैसे 15 सदस्यों की टीम का नेतृत्व कर सालाना रेवेन्यू 2.4 मिलियन डॉलर पहुंचाया और टारगेट 135% हासिल किया। रेवेन्यू, बजट और टीम साइज के आंकड़े जरूर दें।"
            else:
                reply = (
                    "💼 **How to Quantify Business Work Experience:**\n\n"
                    "Weak: *'Responsible for sales in the company.'* ❌\n"
                    "Impactful: *'Spearheaded 15-member sales division generating $2.4M ARR, delivering 135% of quota.'* ✅\n\n"
                    "Always quantify: **P&L / Budget**, **Revenue Growth %**, **Team Size**, and **Cost Reduction**."
                )
                speech = "Quantify your business work experience with numbers: include team size, revenue targets like 135% of quota, and budget figures rather than generic duties."
            suggestions = ["बिजनेस ATS स्कोर 90%+ कैसे करें?", "5 दमदार एक्शन वर्ब्स बताओ"]
        else:
            if is_hindi:
                reply = (
                    "💻 **टेक वर्क एक्सपीरियंस में आंकड़े जोड़ने का तरीका:**\n\n"
                    "कमज़ोर लाइन: *'वेबसाइट का बैकएंड बनाया।'* ❌\n"
                    "पावरफुल लाइन: *'FastAPI और Docker में माइक्रो-सर्विसेज बनाकर API लेटेंसी 40% घटाई और 25,000+ दैनिक यूज़र्स को 99.9% अपटाइम दिया।'* ✅\n\n"
                    "हमेशा शामिल करें: **लेटेंसी कमी %**, **सिस्टम स्केल (यूज़र्स/रिक्वेस्ट्स)**, और **क्लाउड लागत बचत**।"
                )
                speech = "टेक वर्क एक्सपीरियंस में आंकड़े लिखें: जैसे FastAPI और Docker में माइक्रोसर्विसेज बनाकर लेटेंसी 40% कम की और 25 हजार यूज़र्स को 99.9% अपटाइम दिया। हमेशा लेटेंसी, स्केल और अपटाइम लिखें।"
            else:
                reply = (
                    "💻 **How to Quantify Technical Work Experience:**\n\n"
                    "Weak: *'Built backend for company web app.'* ❌\n"
                    "Impactful: *'Architected microservices in FastAPI & Docker, reducing latency by 40% and serving 25k daily users with 99.9% uptime.'* ✅\n\n"
                    "Always include: **Latency reduction %**, **Scale / TPS**, and **Cost savings**."
                )
                speech = "Quantify tech experience with metrics: include latency reductions, throughput numbers, user scale, and uptime percentage."
            suggestions = ["5 दमदार एक्शन वर्ब्स बताओ", "ATS स्कोर 90%+ कैसे करें?"]

    # 7. Skills & Stack (स्किल्स / तकनीकी कौशल)
    elif any(k in msg for k in [
        "skill", "skills", "stack", "technologies", "tools",
        "स्किल्स", "स्किल", "कौशल", "हुनर", "तकनीक", "टूल्स", "स्टैक"
    ]):
        if is_biz:
            if is_hindi:
                reply = (
                    "💼 **टॉप 10 बिजनेस व मैनेजमेंट स्किल्स (Step 4 में जोड़ें):**\n\n"
                    "1. **Strategic Planning** (रणनीतिक योजना)\n"
                    "2. **P&L Management** (लाभ व हानि प्रबंधन)\n"
                    "3. **Sales & Negotiations** (सेल्स व अनुबंध)\n"
                    "4. **Budgeting & Forecasting** (बजट व पूर्वानुमान)\n"
                    "5. **CRM & Account Management** (क्लाइंट संबंध)\n"
                    "6. **Operations Management** (दैनिक ऑपरेशंस)\n"
                    "7. **Cross-Functional Team Leadership** (टीम लीडरशिप)\n"
                    "8. **Financial Modeling** (वित्तीय विश्लेषण)\n\n"
                    "💡 Step 4 में **'✨ + Load Top Business Skills'** बटन दबाकर आप इन्हें 1-क्लिक में जोड़ सकते हैं!"
                )
                speech = "टॉप बिजनेस स्किल्स हैं: Strategic Planning, P&L Management, Sales and Negotiations, Budgeting and Forecasting, और CRM। आप Step 4 में Load Top Business Skills बटन दबाकर इन्हें एक क्लिक में जोड़ सकते हैं!"
            else:
                reply = (
                    "💼 **Top 10 Business & Leadership Skills for Step 4:**\n\n"
                    "1. **Strategic Planning**\n"
                    "2. **P&L Ownership & Management**\n"
                    "3. **B2B Sales & Contract Negotiation**\n"
                    "4. **Budgeting & Financial Forecasting**\n"
                    "5. **CRM Systems (Salesforce/HubSpot)**\n"
                    "6. **Operations & Process Optimization**\n"
                    "7. **Cross-Functional Team Leadership**\n"
                    "8. **Key Account Management**\n\n"
                    "💡 Tap **'✨ + Load Top Business Skills'** in Step 4 to populate these in 1 click!"
                )
                speech = "Top business competencies include Strategic Planning, P&L Management, B2B Sales, Budgeting, and CRM. You can load them in one click in Step 4!"
            suggestions = ["बिजनेस ATS स्कोर 90%+ कैसे करें?", "बिजनेस एग्जीक्यूटिव समरी लिखो"]
        else:
            if is_hindi:
                reply = (
                    "💻 **टॉप टेक स्किल्स और स्टैक (Step 4 में जोड़ें):**\n\n"
                    "• **Frontend**: React.js, TypeScript, Next.js, Tailwind CSS, Redux / Zustand\n"
                    "• **Backend**: Python (FastAPI/Django), Node.js, Express, REST APIs, GraphQL\n"
                    "• **Databases**: PostgreSQL, MongoDB, Redis, MySQL\n"
                    "• **DevOps & Cloud**: Docker, Kubernetes, AWS, Git, GitHub Actions, CI/CD\n\n"
                    "💡 Step 4 में **'✨ + Load Top Tech Skills'** बटन दबाकर इन्हें तुरंत जोड़ें!"
                )
                speech = "टॉप टेक स्किल्स हैं: React, TypeScript, Python FastAPI, Node, PostgreSQL, Redis, और Docker AWS। आप Step 4 में Load Top Tech Skills बटन दबाकर इन्हें तुरंत जोड़ सकते हैं!"
            else:
                reply = (
                    "💻 **Top Technical Skills & Stack for Step 4:**\n\n"
                    "• **Frontend**: React.js, TypeScript, Next.js, Tailwind CSS, Redux\n"
                    "• **Backend**: Python (FastAPI/Django), Node.js, REST APIs, Microservices\n"
                    "• **Databases**: PostgreSQL, MongoDB, Redis\n"
                    "• **DevOps & Cloud**: Docker, Kubernetes, AWS, Git, CI/CD Pipelines\n\n"
                    "💡 Tap **'✨ + Load Top Tech Skills'** in Step 4 to populate these instantly!"
                )
                speech = "Top technical skills include React, TypeScript, Python FastAPI, Node.js, PostgreSQL, Redis, and Docker AWS. Tap Load Top Tech Skills in Step 4 to populate them!"
            suggestions = ["5 दमदार एक्शन वर्ब्स बताओ", "ATS स्कोर 90%+ कैसे करें?"]

    # 8. Education & Degree (एजुकेशन / पढ़ाई / डिग्री)
    elif any(k in msg for k in [
        "education", "degree", "college", "school", "university", "cgpa", "marks", "percentage",
        "एजुकेशन", "शिक्षा", "पढ़ाई", "डिग्री", "कॉलेज", "विश्वविद्यालय", "अंक"
    ]):
        if is_hindi:
            reply = (
                "🎓 **एजुकेशन सेक्शन को सही तरीके से कैसे भरें (Step 3):**\n\n"
                "1. **डिग्री व स्पेशलाइजेशन**: स्पष्ट लिखें (उदा. `MBA in Marketing & Finance` या `B.Tech in Computer Science`)\n"
                "2. **कॉलेज का पूरा नाम व स्थान**: (उदा. `IIT Delhi` या `Symbiosis Institute of Business Management`)\n"
                "3. **पासिंग वर्ष**: (उदा. `2021 - 2025`)\n"
                "4. **CGPA / Percentage**: यदि 7.5 CGPA या 75% से अधिक है, तो अवश्य दर्ज करें (उदा. `8.7 / 10.0 CGPA`)।\n"
                "5. **अकादमिक सम्मान**: मेरिट लिस्ट, डीन्स स्कॉलरशिप या प्रमुख कोर्सवर्क संक्षेप में लिखें।"
            )
            speech = "एजुकेशन सेक्शन में अपनी पूरी डिग्री का नाम, कॉलेज का नाम, पासिंग वर्ष और सीजीपीए लिखें। अगर सीजीपीए 7.5 से ज्यादा है तो उसे जरूर दर्ज करें!"
        else:
            reply = (
                "🎓 **How to Format Education Correctly (Step 3):**\n\n"
                "1. **Degree & Major**: Full official title (e.g. `B.Tech in Computer Science` or `MBA in Marketing & Finance`)\n"
                "2. **Institution & Location**: (e.g. `IIT Delhi` or `Symbiosis Institute`)\n"
                "3. **Graduation Years**: (e.g. `2021 - 2025`)\n"
                "4. **CGPA / Percentage**: Include if above 7.5 / 75% (e.g. `8.7 / 10.0 CGPA`)\n"
                "5. **Academic Honors**: Mention Dean's list, scholarships, or relevant coursework."
            )
            speech = "Format education with your official degree title, institution name, graduation year, and GPA if above 7.5. Mention academic honors or top coursework."
        suggestions = ["ATS स्कोर 90%+ कैसे करें?", "सॉफ्टवेयर इंजीनियर की समरी लिखो"]

    # 9. References & Recommendations (रेफरेंस / सिफारिश)
    elif any(k in msg for k in [
        "reference", "references", "mentor", "manager", "recommendation",
        "रेफरेंस", "रेफरेंसेज", "सिफारिश", "मेंटर", "मैनेजर"
    ]):
        if is_biz:
            if is_hindi:
                reply = (
                    "🤝 **बिजनेस रेज़्युमे में रेफरेंसेज (Step 5) क्यों जरूरी हैं:**\n\n"
                    "कॉर्पोरेट रिक्रूटर्स और हायरिंग मैनेजर्स बिजनेस कैंडिडेट्स के लिए क्रेडिबिलिटी सबसे पहले देखते हैं।\n"
                    "• **किसे जोड़ें**: अपने पूर्व मैनेजर, सीनियर डायरेक्टर, या कॉलेज प्रोफेसर को।\n"
                    "• **क्या विवरण दें**:\n"
                    "  1. पूरा नाम (Full Name)\n"
                    "  2. कंपनी व पद (Company & Executive Role)\n"
                    "  3. आधिकारिक ईमेल और फोन नंबर (Official Email & Phone)\n\n"
                    "💡 Michael Scott टेम्पलेट में रेफरेंसेज साइडबार में बेहद आकर्षक तरीके से प्रदर्शित होते हैं!"
                )
                speech = "बिजनेस रेज़्युमे में रेफरेंसेज बेहद महत्वपूर्ण हैं। Step 5 में अपने पूर्व मैनेजर या डायरेक्टर का नाम, कंपनी, पद, ईमेल और फोन नंबर जोड़ें। Michael Scott टेम्पलेट में यह बहुत प्रभावशाली दिखता है!"
            else:
                reply = (
                    "🤝 **Why References in Step 5 Matter for Business Resumes:**\n\n"
                    "Corporate hiring managers prioritize credibility and verified executive background.\n"
                    "• **Who to list**: Former managers, senior directors, or MBA faculty mentors.\n"
                    "• **What to include**: Full Name, Company, Designation, Professional Email, and Contact Number.\n\n"
                    "💡 The Michael Scott template showcases your references elegantly in the executive sidebar!"
                )
                speech = "References in Step 5 build credibility for business roles. Include your former manager's name, company, executive title, and direct contact details."
            suggestions = ["बिजनेस ATS स्कोर 90%+ कैसे करें?", "Michael Scott टेम्पलेट क्या है?"]
        else:
            if is_hindi:
                reply = (
                    "💻 **टेक रेज़्युमे में रेफरेंसेज:**\n\n"
                    "टेक डेवलपर्स के लिए स्पेस बचाकर GitHub, प्रोजेक्ट्स और कोडिंग उपलब्धियों को दिखाना अधिक महत्वपूर्ण होता है।\n"
                    "इसलिए टेक रेज़्युमे में Step 5 में Projects होते हैं, और रेफरेंसेज केवल इंटरव्यू के अंतिम राउंड में मांगे जाने पर दिए जाते हैं।"
                )
                speech = "टेक रेज़्युमे में रेफरेंस की जगह कोडिंग प्रोजेक्ट्स और GitHub लिंक्स को प्राथमिकता दें। रेफरेंसेज केवल अंतिम इंटरव्यू राउंड में मांगे जाने पर दें।"
            else:
                reply = (
                    "💻 **References for Tech Resumes:**\n\n"
                    "Tech developers should prioritize valuable page space for live projects, GitHub code repos, and stack depth. In CVNex Tech track, Step 5 is dedicated to Projects. References are typically requested at the offer stage."
                )
                speech = "For tech resumes, reserve page real estate for coding projects and GitHub repositories. Formal references are usually shared at the final offer stage."
            suggestions = ["प्रोजेक्ट्स कैसे जोड़ें?", "5 दमदार एक्शन वर्ब्स बताओ"]

    # 10. Spoken Languages & Hobbies (भाषाएं व हॉबीज)
    elif any(k in msg for k in [
        "language", "languages", "hobby", "hobbies", "interest",
        "भाषा", "भाषाएं", "हॉबी", "हॉबीज", "रूचि", "रुचि", "शौक", "shauk"
    ]):
        if is_hindi:
            reply = (
                "🌐 **स्पोकन भाषाएं और हॉबीज (Step 9):**\n\n"
                "1. **भाषाएं (Languages)**: अपनी भाषाओं (उदा. Hindi, English, German) को प्रोफिशिएंसी बार के साथ जोड़ें (*Native, Fluent, Professional*)। यह मल्टीनेशनल कंपनियों के लिए बड़ा एडवांटेज है।\n"
                "2. **प्रोफेशनल हॉबीज (Hobbies)**: ऐसी हॉबीज चुनें जो लीडरशिप या प्रॉब्लम सॉल्विंग दिखाएं (उदा. *Strategic Chess, Tech Blogging, Marathon Running, Public Speaking*)।\n"
                "कमज़ोर हॉबीज ('watching movies', 'listening to music') से बचें।"
            )
            speech = "Step 9 में स्पोकन भाषाएं प्रोफिशिएंसी लेवल के साथ जोड़ें, जैसे हिंदी, इंग्लिश या जर्मन। हॉबीज में ऐसी रुचियां लिखें जो लीडरशिप दिखाएं जैसे शतरंज, टेक्निकल ब्लॉगिंग या पब्लिक स्पीकिंग।"
        else:
            reply = (
                "🌐 **Spoken Languages & Strategic Hobbies (Step 9):**\n\n"
                "1. **Languages**: List languages (English, Hindi, German) with proficiency levels (*Native, Fluent, Professional*). Highly valued by MNCs.\n"
                "2. **Professional Hobbies**: Choose interests demonstrating focus and intellect (e.g. *Strategic Chess, Open Source Contributing, Public Speaking, Marathon Running*). Avoid generic lines like 'watching TV'."
            )
            speech = "In Step 9, add spoken languages with proficiency bars. Highlight leadership hobbies like Chess, Technical Blogging, or Public Speaking rather than passive entertainment."
        suggestions = ["ATS स्कोर 90%+ कैसे करें?", "सॉफ्टवेयर इंजीनियर की समरी लिखो"]

    # 11. Resume Mistakes & Audit (गलतियाँ चेक करें / कमियाँ)
    elif any(k in msg for k in [
        "mistake", "mistakes", "galti", "galtiyan", "audit", "kami", "kamiyan", "error", "weakness",
        "गलती", "गलतियाँ", "कमियाँ", "कमी", "दोष", "खामियां", "review"
    ]):
        if is_hindi:
            reply = (
                "⚠️ **रेज़्युमे में होने वाली 4 सबसे घातक गलतियाँ (और समाधान):**\n\n"
                "1. ❌ **आंकड़े (Numbers) न होना**: 'कंपनी के लिए काम किया' की जगह लिखें '15,000+ यूज़र्स के लिए लेटेंसी 40% घटाई'।\n"
                "2. ❌ **कमज़ोर समरी**: समरी बहुत छोटी (<25 शब्द) न रखें। उसमें अपने अनुभव के साल और 3 मुख्य स्किल्स ज़रूर लिखें।\n"
                "3. ❌ **गलत स्ट्रीम फील्ड्स**: Tech छात्र GitHub/LeetCode प्रोजेक्ट्स जोड़ें; Business छात्र P&L आंकड़े और रेफरेंस दें।\n"
                "4. ❌ **अधूरी संपर्क जानकारी**: ईमेल, फोन और लिंक्डइन का एक्टिव लिंक ज़रूर दें।\n\n"
                "💡 Builder के ऊपर **'🔍 गलतियाँ चेक करें (Audit Mistakes)'** बटन दबाकर आप अपने मौजूदा रेज़्युमे की लाइव गलतियाँ सुन सकते हैं!"
            )
            speech = "रेज़्युमे की 4 सबसे घातक गलतियाँ हैं: बुलेट पॉइंट्स में नंबर्स न होना, समरी बहुत छोटी होना, स्ट्रीम के अनुसार गलत फील्ड्स भरना, और लिंक्डइन लिंक मिस होना। ऊपर दिए गए गलतियाँ चेक करें बटन से आप अपने रेज़्युमे की लाइव ऑडिट सुन सकते हैं!"
        else:
            reply = (
                "⚠️ **The 4 Fatal Resume Mistakes (and How to Fix Them):**\n\n"
                "1. ❌ **Lack of Numbers / Metrics**: Replace vague lines with Google XYZ formula (e.g. 'Reduced latency by 40% for 15k users').\n"
                "2. ❌ **Weak or Short Summary**: Keep your summary 40-80 words packed with years of experience and top wins.\n"
                "3. ❌ **Mismatched Track Content**: Tech developers must include GitHub & projects; Business students must highlight P&L metrics and references.\n"
                "4. ❌ **Missing Contact Links**: Always verify valid phone, email, and LinkedIn profile URLs.\n\n"
                "💡 Tap the **'🔍 Audit Resume'** badge at the top of the builder to hear a real-time voice audit of your draft!"
            )
            speech = "The four most common resume mistakes are missing quantifiable numbers, a weak summary, mismatched track content, and missing LinkedIn links. Tap the Audit Resume button at the top to hear a live audit!"
        suggestions = ["5 दमदार एक्शन वर्ब्स बताओ", "ATS स्कोर 90%+ कैसे करें?"]

    # 12. Freshers & Entry Level (फ्रेशर्स / पहली नौकरी)
    elif any(k in msg for k in [
        "fresher", "freshers", "first job", "no experience", "entry level", "graduate", "passout",
        "फ्रेशर", "फ्रेशर्स", "पहला", "पहली नौकरी", "बिना अनुभव", "शुरुआती"
    ]):
        if is_hindi:
            reply = (
                "🎓 **फ्रेशर्स और कॉलेज पासआउट्स के लिए 90%+ ATS ब्लूप्रिंट:**\n\n"
                "1. 🚀 **प्रोजेक्ट्स को सबसे ऊपर रखें**: यदि कॉर्पोरेट अनुभव नहीं है, तो अपने 2-3 सबसे मजबूत कॉलेज/पर्सनल प्रोजेक्ट्स को वर्क एक्सपीरियंस की तरह विस्तार से लिखें।\n"
                "2. 🛡️ **LeetCode और GitHub**: अपने गिटहब कोड और कोडिंग प्रोफाइल्स का लिंक जरूर दें ताकि रिक्रूटर आपके कोडिंग स्किल्स देख सके।\n"
                "3. 📜 **सर्टिफिकेशन्स व हैकथॉन**: हैकथॉन में भागीदारी, ऑनलाइन कोर्स (Coursera/Udemy/AWS) और कॉलेज क्लब लीडरशिप जोड़ें।\n"
                "4. 📝 **फ्रेशर समरी**: लिखें कि आपने कौन सी टेक्नोलॉजीज में प्रोजेक्ट्स बनाए हैं और आप कितनी तेजी से नई चीजें सीखते हैं।"
            )
            speech = "फ्रेशर्स के लिए सबसे महत्वपूर्ण है कि वे अपने कॉलेज और पर्सनल प्रोजेक्ट्स को ऊपर रखें, गिटहब और LeetCode प्रोफाइल लिंक करें, और हैकथॉन व सर्टिफिकेशन्स को प्राथमिकता दें!"
        else:
            reply = (
                "🎓 **90%+ ATS Blueprint for Freshers & College Graduates:**\n\n"
                "1. 🚀 **Put Projects Front and Center**: Feature 2-3 substantial capstone projects detailed with tech stack and metrics.\n"
                "2. 🛡️ **Showcase GitHub & LeetCode**: Demonstrate active problem solving and clean repository commits.\n"
                "3. 📜 **Certifications & Hackathons**: Highlight competitive programming, cloud certifications, and leadership roles.\n"
                "4. 📝 **Impactful Fresher Summary**: Focus on core programming foundations and eagerness to deliver business value."
            )
            speech = "For freshers with no corporate experience, feature substantive capstone projects, link your GitHub and LeetCode, and highlight hackathons and certifications!"
        suggestions = ["प्रोजेक्ट्स कैसे जोड़ें?", "सॉफ्टवेयर इंजीनियर की समरी लिखो"]

    # 13. Templates & Formats (Michael Scott / Modern / Tech)
    elif any(k in msg for k in [
        "template", "templates", "format", "layout", "michael scott", "modern", "design", "column",
        "टेम्पलेट", "फॉर्मेट", "लेआउट", "कॉलम", "डिज़ाइन"
    ]):
        if is_biz:
            if is_hindi:
                reply = (
                    "🌟 **Michael Scott 2-कॉलम एग्जीक्यूटिव टेम्पलेट:**\n\n"
                    "• **लेफ्ट साइडबार**: डार्क चारकोल बैकग्राउंड जिसमें प्रोफाइल फोटो, संपर्क विवरण, लिंक्स, प्रोफेशनल रेफरेंसेज और हॉबीज आते हैं।\n"
                    "• **राइट मेन कॉलम**: समरी, वर्क एक्सपीरियंस टाइमलाइन और एजुकेशन डिटेल्स।\n"
                    "• यह टेम्पलेट लीडरशिप, एमबीए, सेल्स और मैनेजमेंट प्रोफाइल्स के लिए विशेष रूप से डिज़ाइन किया गया है!"
                )
                speech = "Michael Scott टेम्पलेट 2-कॉलम एग्जीक्यूटिव लेआउट है। लेफ्ट साइडबार में फोटो, रेफरेंसेज और कांटेक्ट आते हैं, जबकि राइट कॉलम में वर्क एक्सपीरियंस और एजुकेशन। यह बिजनेस प्रोफाइल्स के लिए बेस्ट है!"
            else:
                reply = (
                    "🌟 **Michael Scott 2-Column Executive Template:**\n\n"
                    "• **Executive Sidebar**: Dark charcoal column featuring your Photo, Contact Info, Corporate References, and Languages.\n"
                    "• **Main Column**: Dedicated to Professional Summary, Work Experience Timeline, and Education.\n"
                    "• Built specifically for MBAs, Sales Directors, and Corporate Executives!"
                )
                speech = "The Michael Scott template is a two-column executive layout featuring references and photo in the sidebar, and experience in the main column. Tailored for business leaders!"
            suggestions = ["बिजनेस ATS स्कोर 90%+ कैसे करें?", "रेफरेंसेज कैसे जोड़ें?"]
        else:
            if is_hindi:
                reply = (
                    "💻 **Modern & Tech सिंगल-कॉलम टेम्पलेट्स:**\n\n"
                    "• टेक सॉफ्टवेयर रोल्स के लिए सिंगल-कॉलम 'Modern' या 'Tech' लेआउट सबसे बेस्ट है।\n"
                    "• यह ATS बॉट्स द्वारा 100% एक्यूरेसी के साथ पार्स होता है और स्क्रीन पर पढ़ने में आसान रहता है।"
                )
                speech = "टेक सॉफ्टवेयर डेवलपर्स के लिए सिंगल-कॉलम Modern या Tech टेम्पलेट सबसे उत्तम है। यह ATS बॉट्स द्वारा सौ प्रतिशत एक्यूरेसी के साथ पढ़ा जाता है।"
            else:
                reply = (
                    "💻 **Modern & Tech Single-Column Templates:**\n\n"
                    "• For software engineering, single-column layouts (Modern or Tech) ensure flawless 100% ATS parser scanning.\n"
                    "• Keeps clear separation between Experience, Projects, and Skills."
                )
                speech = "Single-column Modern and Tech templates are ideal for software developers, ensuring flawless ATS parsing and easy recruiter skimming."
            suggestions = ["ATS स्कोर 90%+ कैसे करें?", "5 दमदार एक्शन वर्ब्स बताओ"]

    # 14. Interview Preparation & STAR Method (इंटरव्यू / STAR मेथड)
    elif any(k in msg for k in [
        "interview", "star method", "star technique", "round", "tayari", "hr",
        "इंटरव्यू", "साक्षात्कार", "तैयारी", "सवाल", "मॉक"
    ]):
        if is_hindi:
            reply = (
                "🎯 **इंटरव्यू के लिए STAR मेथड का फॉर्मूला:**\n\n"
                "• **S (Situation)**: चुनौती या प्रोजेक्ट की पृष्ठभूमि (1-2 वाक्य)\n"
                "• **T (Task)**: आपको कौन सी समस्या हल करनी थी?\n"
                "• **A (Action)**: आपने व्यक्तिगत रूप से कौन से टूल्स और टेक्नोलॉजीज का इस्तेमाल किया?\n"
                "• **R (Result)**: क्या ठोस नतीजा निकला (उदा. 'लेटेंसी 40% घटी' या 'रेवेन्यू 35% बढ़ा')?\n\n"
                "💡 हर उत्तर को 90-120 सेकंड में समेटने का अभ्यास करें!"
            )
            speech = "इंटरव्यू में STAR मेथड अपनाएं: S से परिस्थिति, T से आपका टास्क, A से आपके द्वारा किए गए एक्शन, और R से ठोस परिणाम जैसे 40% लेटेंसी सुधार। अपने उत्तर को 90 सेकंड में पूरा करें!"
        else:
            reply = (
                "🎯 **The STAR Method for Behavioral & Technical Interviews:**\n\n"
                "• **S (Situation)**: Set the context in 1-2 concise sentences.\n"
                "• **T (Task)**: Define the core challenge or goal.\n"
                "• **A (Action)**: Highlight specific engineering/business decisions YOU implemented.\n"
                "• **R (Result)**: Quantify the outcome (e.g. 'boosted throughput by 40%').\n\n"
                "💡 Practice delivering your answer within 90-120 seconds!"
            )
            speech = "Use the STAR method: Situation, Task, Action, and Result with quantifiable metrics. Keep answers tight within 90 to 120 seconds."
        suggestions = ["5 दमदार एक्शन वर्ब्स बताओ", "ATS स्कोर 90%+ कैसे करें?"]

    # 15. Contact Details & Social Links (कांटेक्ट डिटेल्स / लिंक्स)
    elif any(k in msg for k in [
        "contact", "phone", "email", "linkedin", "details",
        "कांटेक्ट", "संपर्क", "ईमेल", "फोन", "नंबर", "लिंक्स"
    ]):
        if is_hindi:
            reply = (
                "📞 **कांटेक्ट डिटेल्स में क्या शामिल करें (Step 1):**\n\n"
                "1. **प्रोफेशनल ईमेल**: साफ़ ईमेल दें (उदा. `rahul.sharma@gmail.com`), फनी ईमेल्स न दें।\n"
                "2. **फोन नंबर**: कंट्री कोड (+91) के साथ 10 अंकों का मोबाइल नंबर।\n"
                "3. **लिंक्डइन प्रोफाइल**: अपनी अपडेटेड लिंक्डइन प्रोफाइल का कस्टमाइज्ड यूआरएल।\n"
                "4. **पोर्टफोलियो / GitHub**: टेक कैंडिडेट्स GitHub और बिजनेस कैंडिडेट्स पोर्टफोलियो लिंक दें।"
            )
            speech = "कांटेक्ट डिटेल्स में प्रोफेशनल ईमेल, कंट्री कोड के साथ मोबाइल नंबर, लिंक्डइन प्रोफाइल और गिटहब या पोर्टफोलियो लिंक अवश्य दें।"
        else:
            reply = (
                "📞 **What to Include in Contact Info (Step 1):**\n\n"
                "1. **Professional Email**: Standard format (e.g. `first.last@email.com`).\n"
                "2. **Phone Number**: Valid 10-digit number with country code (+91).\n"
                "3. **LinkedIn URL**: Customized clean LinkedIn URL.\n"
                "4. **Portfolio / GitHub**: Live code or executive portfolio link."
            )
            speech = "Include a professional email, phone number with country code, active LinkedIn URL, and your GitHub or portfolio link."
        suggestions = ["ATS स्कोर 90%+ कैसे करें?", "सॉफ्टवेयर इंजीनियर की समरी लिखो"]

    # 16. Photo in Resume (फोटो लगानी चाहिए या नहीं)
    elif any(k in msg for k in [
        "photo", "image", "picture", "headshot",
        "तस्वीर", "फोटो", "चित्र", "प्रोफाइल फोटो"
    ]):
        if is_biz:
            if is_hindi:
                reply = (
                    "📸 **बिजनेस रेज़्युमे में फोटो:**\n\n"
                    "हाँ! बिजनेस, सेल्स और एग्जीक्यूटिव प्रोफाइल्स के लिए हमारे **Michael Scott 2-कॉलम टेम्पलेट** में प्रोफेशनल हाई-क्वालिटी हेडशॉट लगाना बेहद असरदार रहता है। यह कॉर्पोरेट लीडरशिप और मजबूत प्रेजेंस दिखाता है।"
                )
                speech = "बिजनेस और एग्जीक्यूटिव प्रोफाइल्स के लिए Michael Scott टेम्पलेट में प्रोफेशनल हेडशॉट लगाना बहुत प्रभावशाली रहता है।"
            else:
                reply = (
                    "📸 **Photos on Business Resumes:**\n\n"
                    "Yes! For executive and managerial roles, a clean professional headshot in our **Michael Scott 2-Column Template** adds strong corporate presence and executive branding."
                )
                speech = "For executive and business roles, a crisp professional headshot in the Michael Scott template establishes strong executive credibility."
            suggestions = ["Michael Scott टेम्पलेट क्या है?", "बिजनेस ATS स्कोर 90%+ कैसे करें?"]
        else:
            if is_hindi:
                reply = (
                    "📸 **टेक रेज़्युमे में फोटो:**\n\n"
                    "ग्लोबल टेक कंपनियों और US/UK रिमोट रोल्स के लिए टेक रेज़्युमे में फोटो न लगाना ही बेहतर माना जाता है, ताकि ATS बॉट्स बिना किसी रुकावट के सिर्फ आपके कोडिंग स्किल्स और प्रोजेक्ट्स को स्कैन करें।"
                )
                speech = "टेक और सॉफ्टवेयर रेज़्युमे के लिए फोटो न लगाना ही बेहतर होता है, ताकि ATS बॉट्स केवल आपके कोडिंग स्किल्स और प्रोजेक्ट्स को स्कैन करें।"
            else:
                reply = (
                    "📸 **Photos on Tech Resumes:**\n\n"
                    "For software and technical roles (especially US/international tech ATS), photos are generally omitted to maximize parsing accuracy and focus purely on your technical stack and project impact."
                )
                speech = "For technical roles, omitting photos is standard practice to maximize ATS parsing accuracy and keep focus on code and projects."
            suggestions = ["ATS स्कोर 90%+ कैसे करें?", "प्रोजेक्ट्स कैसे जोड़ें?"]

    # 17. How to Start / Getting Started (शुरुआत कैसे करें)
    elif any(k in msg for k in [
        "guide", "start", "shuru", "madad", "help", "kese", "kaise", "step", "banao", "create", "onboard", "new", "tour",
        "शुरुआत", "शुरू", "गाइड", "मदद", "बनाएं", "बनाऊं", "सिखाओ"
    ]):
        if is_biz:
            if is_hindi:
                reply = (
                    "✨ **बिजनेस रेज़्युमे बनाने के 4 आसान स्टेप्स (CVNex Business Guide):**\n\n"
                    "1. 🚀 **शुरुआत (Start)**: Dashboard पर **'Create Resume'** दबाएं और **Michael Scott 2-कॉलम लेआउट** चुनें।\n"
                    "2. 📝 **एग्जीक्यूटिव समरी**: 50-80 शब्दों में अपनी लीडरशिप, P&L मैनेजमेंट और मुख्य उपलब्धियां लिखें।\n"
                    "3. 💼 **बिजनेस स्किल्स**: स्टेप 4 में **'✨ + Load Top Business Skills'** दबाकर Strategic Planning और CRM जोड़ें।\n"
                    "4. 🤝 **रेफरेंसेस व आंकड़े**: स्टेप 5 में सीनियर मेंटर्स के 2 रेफरेंस और वर्क एक्सपीरियंस में रेवेन्यू के आंकड़े (%/$) जरूर लिखें!"
                )
                speech = "बिजनेस रेज़्युमे बनाने के लिए: Michael Scott 2-कॉलम लेआउट चुनें, एग्जीक्यूटिव समरी लिखें, स्टेप 4 में बिजनेस स्किल्स लोड करें, और स्टेप 5 में प्रोफेशनल रेफरेंसेस अवश्य जोड़ें!"
            else:
                reply = (
                    "✨ **4 Fast Steps to Build a Business Executive Resume on CVNex:**\n\n"
                    "1. 🚀 **Get Started**: Click **'Create Resume'** and select the **Michael Scott 2-Column Template**.\n"
                    "2. 📝 **Executive Summary**: Craft a 50-80 word leadership summary highlighting P&L and revenue wins.\n"
                    "3. 💼 **Business Skills**: In Step 4, click **'✨ + Load Top Business Skills'** to add Strategic Planning and CRM.\n"
                    "4. 🤝 **References & Numbers**: Add corporate references in Step 5 and quantifiable revenue growth metrics in Step 6!"
                )
                speech = "To build a business resume: Select the Michael Scott template, write an executive summary, load business skills in Step 4, and add corporate references in Step 5!"
            suggestions = ["बिजनेस ATS स्कोर 90%+ कैसे करें?", "बिजनेस एग्जीक्यूटिव समरी लिखो", "Michael Scott टेम्पलेट क्या है?"]
        else:
            if is_hindi:
                reply = (
                    "✨ **CVNex पर 90%+ ATS टेक रेज़्युमे बनाने के 4 आसान स्टेप्स:**\n\n"
                    "1. 🚀 **शुरुआत (Start)**: Dashboard पर **'Create Resume'** दबाएं या **'1-Click AI Sample'** लोड करें।\n"
                    "2. 📝 **समरी व प्रोफाइल्स**: Google XYZ फॉर्मूला से 50 शब्दों की समरी लिखें और LeetCode/GitHub जोड़ें।\n"
                    "3. 💼 **10-15 स्किल्स व प्रोजेक्ट्स**: अपने फील्ड की कोर स्किल्स और प्रोजेक्ट्स में लेटेंसी/स्केल के आंकड़े शामिल करें।\n"
                    "4. 🔍 **गलतियाँ चेक करें**: ऊपर दिए गए '🔍 गलतियाँ चेक करें' बटन से ऑडियो ऑडिट सुनें और PDF डाउनलोड करें!"
                )
                speech = "CVNex पर टेक रेज़्युमे बनाने के लिए: पहले Create Resume दबाएं, समरी में आंकड़े लिखें, GitHub और प्रोजेक्ट्स जोड़ें, और गलतियाँ चेक करके PDF डाउनलोड करें!"
            else:
                reply = (
                    "✨ **4 Fast Steps to Build a 90%+ ATS Tech Resume on CVNex:**\n\n"
                    "1. 🚀 **Get Started**: Click **'Create Resume'** or load the **'1-Click AI Sample'** from your dashboard.\n"
                    "2. 📝 **Summary & Profiles**: Write a 50-word impact summary and connect your GitHub/LeetCode links.\n"
                    "3. 💼 **Skills & Experience**: Add 10-15 core tech skills and quantify project latency reductions.\n"
                    "4. 🔍 **Audit & Download**: Run the 1-click Resume Audit and export your high-res PDF!"
                )
                speech = "To build your tech resume on CVNex: Start with Create Resume, write an impact summary with metrics, add GitHub links and skills, and run the Resume Audit before exporting!"
            suggestions = ["ATS स्कोर 90%+ कैसे करें?", "5 दमदार एक्शन वर्ब्स बताओ", "प्रोजेक्ट्स कैसे जोड़ें?"]

    # 18. Greetings ONLY (when query is short: <= 4 words)
    elif any(k in msg for k in [
        "hi", "hello", "hey", "namaste", "pranam", "greetings", "hola",
        "नमस्ते", "प्रणाम", "नमस्कार", "हेलो", "हाय"
    ]) and len(msg.split()) <= 4:
        if is_hindi:
            reply = (
                "👋 **नमस्ते! मैं आपका CVNex AI करियर और ATS कोच हूँ।**\n\n"
                "मैं आपके रेज़्युमे का ATS स्कोर 90%+ तक ले जाने, Google XYZ फॉर्मूला से बुलेट पॉइंट्स लिखने, या गलतियाँ पकड़ने में मदद कर सकता हूँ।\n"
                "आप नीचे दिए गए किसी भी सुझाव पर क्लिक कर सकते हैं या माइक 🎙️ दबाकर सीधे पूछ सकते हैं!"
            )
            speech = "नमस्ते! मैं आपका CVNex AI करियर और ATS कोच हूँ। आप माइक दबाकर या नीचे दिए गए सुझावों से अपना सवाल पूछ सकते हैं!"
        else:
            reply = (
                "👋 **Hello! I'm your CVNex AI Career & ATS Coach.**\n\n"
                "I'm here to help you optimize your resume to 90%+ ATS score, write powerful bullet points, and check for fatal errors.\n"
                "Feel free to tap any suggestion chip or speak into the microphone 🎙️!"
            )
            speech = "Hello! I am your CVNex AI Career and ATS Coach. Ask me anything about your resume, bullet points, or ATS score!"
        suggestions = [
            "5 दमदार एक्शन वर्ब्स बताओ" if is_hindi else "Give me 5 strong action verbs",
            "ATS स्कोर 90%+ कैसे करें?" if is_hindi else "How to get 90%+ ATS Score?",
            "गलतियाँ चेक करें" if is_hindi else "Check Resume Mistakes"
        ]

    # 19. DYNAMIC SMART CAREER COACH FALLBACK (For ANY unlisted question)
    # NEVER return a canned greeting when the user asks a real question!
    else:
        topic_preview = raw_msg[:60]
        if is_hindi:
            reply = (
                f"💡 **आपके सवाल '_{topic_preview}_' के संदर्भ में CVNex AI करियर सलाह:**\n\n"
                "रेज़्युमे को रिक्रूटर और ATS सिस्टम दोनों के अनुकूल बनाने के लिए ये 3 मुख्य सिद्धांत अपनाएं:\n\n"
                "1. 🎯 **प्रासंगिक कीवर्ड्स (Keywords)**: जिस जॉब रोल या इंडस्ट्री के लिए आप अप्लाई कर रहे हैं, उससे जुड़े ठोस तकनीकी व डोमेन शब्द शामिल करें।\n"
                "2. 📊 **संख्याएं और आंकड़े (Metrics)**: अपने वर्क एक्सपीरियंस और प्रोजेक्ट्स में हमेशा ठोस आंकड़े जोड़ें (जैसे: '% वृद्धि', 'समय की बचत', 'यूज़र्स की संख्या')।\n"
                "3. 🏛️ **स्पष्ट संरचना (Clean Layout)**: साफ़ हेडिंग्स (Summary, Skills, Experience, Education) का उपयोग करें ताकि ATS पार्सर आसानी से डेटा पढ़ सके।\n\n"
                "👉 आप नीचे दिए गए बटनों से एक्शन वर्ब्स, समरी टेम्पलेट्स या लाइव गलतियाँ भी तुरंत चेक कर सकते हैं!"
            )
            speech = f"आपके सवाल के अनुसार: रेज़्युमे में सही कीवर्ड्स, ठोस आंकड़े और स्पष्ट हेडिंग्स का प्रयोग करें ताकि आपका ATS स्कोर 90% से ऊपर रहे। आप समरी या एक्शन वर्ब्स के सुझाव भी ले सकते हैं!"
            suggestions = [
                "5 दमदार एक्शन वर्ब्स बताओ",
                "ATS स्कोर 90%+ कैसे करें?",
                "सॉफ्टवेयर इंजीनियर की समरी लिखो" if not is_biz else "बिजनेस एग्जीक्यूटिव समरी लिखो",
                "गलतियाँ चेक करें (Audit Mistakes)"
            ]
        else:
            reply = (
                f"💡 **Regarding your query '_{topic_preview}_', here is CVNex Career guidance:**\n\n"
                "To optimize your profile for ATS algorithms and hiring managers, follow these 3 core principles:\n\n"
                "1. 🎯 **Targeted Keywords**: Align terminology closely with your desired job description and industry standards.\n"
                "2. 📊 **Quantifiable Outcomes**: Back your responsibilities with measurable figures (e.g., % growth, latency reduction, cost savings, budget sizes).\n"
                "3. 🏛️ **Clean Section Hierarchy**: Maintain clear standard headings (Summary, Experience, Skills, Education) for accurate parsing.\n\n"
                "👉 Tap any suggestion below to generate power action verbs, tailor your summary, or run a live resume mistake audit!"
            )
            speech = f"Regarding your question: ensure your points include targeted keywords, quantifiable metrics with percentages, and clean section headers. Feel free to explore our action verbs and mistake audit!"
            suggestions = [
                "Give me 5 strong action verbs",
                "How to get 90%+ ATS Score?",
                "Write a summary for Full Stack Engineer" if not is_biz else "Write Business Executive summary",
                "Check Resume Mistakes (Audit)"
            ]

    if not speech:
        clean_speech = re.sub(r'[*#_`\[\]]', '', reply)
        speech = re.sub(r'\n+', '. ', clean_speech).strip()

    return AIChatResponse(reply=reply, suggestions=suggestions, speech=speech)

