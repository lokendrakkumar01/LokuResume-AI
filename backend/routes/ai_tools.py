from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional
from services.ai_suggestions import ai_suggestions
from services.resume_scorer import scorer
import re

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
async def enhance_bullet(request: BulletEnhanceRequest):
    """Generate high-impact ATS optimized bullet variations for project or experience descriptions"""
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
async def analyze_job_description(request: JDAnalysisRequest):
    """Analyze resume skills and summary against a target Job Description to compute ATS match score"""
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
    context: Optional[dict] = None

class AIChatResponse(BaseModel):
    reply: str
    suggestions: List[str] = []

@router.post("/chat-assist", response_model=AIChatResponse)
async def ai_chat_assist(request: AIChatRequest):
    """Interactive AI Career & ATS Coach chatbot answering questions via text or voice in selected language"""
    msg = request.message.strip().lower()
    if not msg:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    lang = (request.language or "en").lower()
    # Also detect Devanagari Hindi script automatically
    is_hindi = lang == "hi" or any('\u0900' <= char <= '\u097F' for char in msg) or any(w in msg for w in ["kaise", "kya", "batao", "karo", "likho", "badhaye", "tayari", "namaste"])

    reply = ""
    suggestions = []

    # 1. ATS Score & Optimization Queries
    if any(k in msg for k in ["score", "ats", "rank", "badhaye", "improve", "increase"]):
        if is_hindi:
            reply = (
                "अपना ATS स्कोर 90%+ करने के लिए ये 4 सबसे महत्वपूर्ण नियम अपनाएं:\n"
                "1. **Google XYZ फॉर्मूला**: 'Accomplished [X] as measured by [Y], by doing [Z]'. हमेशा आंकड़े लिखें (जैसे: 'API लेटेंसी 40% कम की', '15,000+ यूज़र्स के लिए बनाया').\n"
                "2. **10-15 मुख्य स्किल्स जोड़ें**: जॉब पोस्टिंग की अनिवार्य स्किल्स को अपने रेज़्युमे में ज़रूर शामिल करें।\n"
                "3. **क्लीन फॉर्मेटिंग**: सिंगल-कॉलम लेआउट रखें जिसमें साफ़ हेडिंग्स (Experience, Projects, Education) हों।\n"
                "4. **कोडिंग प्रोफाइल्स**: LeetCode, GitHub या पोर्टफोलियो का लिंक ज़रूर दें।"
            )
            suggestions = [
                "सॉफ्टवेयर इंजीनियर की समरी लिखो",
                "5 दमदार एक्शन वर्ब्स बताओ",
                "साइबर सिक्योरिटी के लिए क्या स्किल्स चाहिए?"
            ]
        else:
            reply = (
                "To achieve an ATS score above 90%+, follow these 4 proven rules:\n"
                "1. **Use Google's XYZ Formula**: 'Accomplished [X] as measured by [Y], by doing [Z]'. Always include numbers (e.g., 'reduced latency by 45%', 'serving 15,000+ users').\n"
                "2. **Include 10-15 Core Skills**: Match job posting requirements exactly.\n"
                "3. **Keep Formatting Clean**: Use single-column modern layouts with clear headings (Experience, Projects, Education).\n"
                "4. **Add Coding Profiles & Links**: Include GitHub, LeetCode, or portfolio links."
            )
            suggestions = [
                "Write a summary for Full Stack Engineer",
                "Give me 5 strong action verbs",
                "What skills to add for Cybersecurity?"
            ]

    # 2. Professional Summary Requests
    elif any(k in msg for k in ["summary", "about me", "intro", "parichay", "bio", "samari"]):
        if is_hindi:
            reply = (
                "यह एक बेहतरीन ATS-फ्रेंडली प्रोफेशनल समरी है जिसका आप उपयोग कर सकते हैं:\n\n"
                "\"अनुभवी और परिणाम-उन्मुख सॉफ्टवेयर इंजीनियर, जिन्हें हाई-स्केलेबल माइक्रोसर्विसेज, क्लाउड आर्किटेक्चर और आधुनिक वेब ऍप्लिकेशन्स बनाने का 4+ वर्षों का अनुभव है। API लेटेंसी को 40% कम करने और AWS क्लाउड लागत घटाने का प्रमाणित ट्रैक रिकॉर्ड। AI इंटीग्रेशन और एजाइल डेवलपमेंट में विशेषज्ञता।\""
            )
            suggestions = [
                "ATS स्कोर 90%+ कैसे करें?",
                "प्रोजेक्ट के लिए बुलेट पॉइंट्स बताओ",
                "इंटरव्यू का STAR मेथड क्या है?"
            ]
        else:
            reply = (
                "Here is a high-converting ATS summary template you can use:\n\n"
                "\"Innovative and results-driven Software Engineer with 4+ years of experience designing and deploying scalable microservices, cloud systems, and modern web applications. Proven track record reducing API latency by 40% and optimizing AWS cloud infrastructure costs. Passionate about AI integration and agile delivery.\""
            )
            suggestions = [
                "How to improve my ATS score?",
                "Suggest bullet points for project",
                "What is the STAR method for interviews?"
            ]

    # 3. Action Verbs & Bullet Points
    elif any(k in msg for k in ["verb", "bullet", "point", "project", "experience", "describe", "shabd"]):
        if is_hindi:
            reply = (
                "कमज़ोर शब्दों ('helped with', 'worked on') की जगह इन प्रभावशाली एक्शन वर्ब्स का उपयोग करें:\n"
                "• **Architected (आर्किटेक्ट किया)**: 'प्रति सेकंड 25,000 इवेंट्स प्रोसेस करने वाला डिस्ट्रीब्यूटेड पाइपलाइन आर्किटेक्ट किया।'\n"
                "• **Spearheaded (नेतृत्व किया)**: 'React और TypeScript पर माइग्रेशन का नेतृत्व किया, जिससे पेज लोड 50% तेज़ हुआ।'\n"
                "• **Automated (ऑटोमेट किया)**: 'CI/CD पाइपलाइन ऑटोमेट करके डिप्लॉयमेंट समय 4 घंटे से घटाकर 15 मिनट किया।'\n"
                "• **Engineered (इंजीनियर किया)**: 'FastAPI में 99.98% अपटाइम के साथ स्केलेबल REST APIs बनाईं।'"
            )
            suggestions = [
                "रेज़्युमे में प्रोजेक्ट कैसे लिखें?",
                "फुल स्टैक डेवलपर स्किल्स",
                "ATS स्कोर 90%+ कैसे करें?"
            ]
        else:
            reply = (
                "Replace weak phrases like 'worked on' or 'helped with' with these high-impact power verbs:\n"
                "• **Architected & Deployed**: 'Architected distributed event streaming pipeline processing 25k events/sec.'\n"
                "• **Spearheaded**: 'Spearheaded frontend migration to React & TypeScript, boosting page load speeds by 50%.'\n"
                "• **Automated**: 'Automated CI/CD pipelines reducing deployment cycle time from 4 hours to 15 minutes.'\n"
                "• **Engineered**: 'Engineered scalable REST APIs in FastAPI with 99.98% uptime SLA.'"
            )
            suggestions = [
                "How to format projects for ATS?",
                "Skills for Frontend Developer",
                "How to get 90%+ ATS Score?"
            ]

    # 4. Cybersecurity specific
    elif any(k in msg for k in ["cyber", "security", "soc", "penetration", "ethical", "suraksha"]):
        if is_hindi:
            reply = (
                "साइबर सिक्योरिटी रेज़्युमे के लिए ये टॉप स्किल्स और सर्टिफिकेशन्स सबसे असरदार हैं:\n"
                "• **मुख्य स्किल्स**: Network Security, SIEM (Splunk, Sentinel), Vulnerability Assessment (Nessus, Burp Suite), Incident Response, Wireshark, Linux, Python Scripting.\n"
                "• **सर्टिफिकेशन्स**: CompTIA Security+, CEH, CISSP, eJPT, AWS Certified Security.\n"
                "• **बुलेट पॉइंट उदाहरण**: 'SIEM की मदद से 1,000+ एंडपॉइंट्स की मॉनिटरिंग की और 150+ सुरक्षा खतरों को तुरंत न्यूट्रलाइज़ किया, जिससे ज़ीरो डेटा ब्रीच सुनिश्चित हुआ।'"
            )
            suggestions = [
                "साइबर सिक्योरिटी समरी लिखो",
                "ATS स्कोर कैसे सुधारें?",
                "इंटरव्यू का STAR मेथड क्या है?"
            ]
        else:
            reply = (
                "For a standout Cybersecurity resume, highlight these technical skills & certifications:\n"
                "• **Core Skills**: Network Security, SIEM (Splunk, Sentinel), Vulnerability Assessment (Nessus, Burp Suite), Incident Response, Wireshark, Linux, Python Scripting.\n"
                "• **High-Value Certifications**: CompTIA Security+, CEH, CISSP, eJPT, AWS Certified Security.\n"
                "• **Bullet Example**: 'Monitored 1,000+ endpoints via SIEM, investigating and neutralizing 150+ security incidents with zero data breach incidents.'"
            )
            suggestions = [
                "Write summary for Cybersecurity Analyst",
                "How to improve my ATS score?",
                "What is STAR interview method?"
            ]

    # 5. Full Stack / Frontend / Backend
    elif any(k in msg for k in ["full stack", "fullstack", "react", "python", "frontend", "backend", "developer", "engineer"]):
        if is_hindi:
            reply = (
                "फुल स्टैक इंजीनियरिंग के लिए अपने रेज़्युमे में इन स्किल्स को प्राथमिकता दें:\n"
                "• **Frontend**: React.js, TypeScript, Next.js, Tailwind CSS, Redux / Zustand.\n"
                "• **Backend**: Python (FastAPI/Django), Node.js, REST APIs, GraphQL, Microservices.\n"
                "• **Databases & DevOps**: PostgreSQL, MongoDB, Redis, Docker, Kubernetes, AWS, Git, CI/CD.\n"
                "खास टिप: अपने हर प्रोजेक्ट में फ्रंटएंड और बैकएंड दोनों टेक्नोलॉजीज़ का स्पष्ट विवरण दें।"
            )
            suggestions = [
                "ATS स्कोर 90%+ कैसे करें?",
                "फुल स्टैक इंजीनियर की समरी लिखो",
                "5 दमदार एक्शन वर्ब्स बताओ"
            ]
        else:
            reply = (
                "For Full-Stack Engineering roles, prioritize:\n"
                "• **Frontend**: React.js, TypeScript, Next.js, Tailwind CSS, State Management (Redux/Zustand).\n"
                "• **Backend**: Python (FastAPI/Django), Node.js, REST APIs, GraphQL, Microservices.\n"
                "• **Databases & DevOps**: PostgreSQL, MongoDB, Redis, Docker, Kubernetes, AWS, Git, CI/CD.\n"
                "Tip: Ensure every project lists both frontend AND backend technologies clearly!"
            )
            suggestions = [
                "How to improve my ATS score?",
                "Write a summary for Full Stack Engineer",
                "Give me 5 strong action verbs"
            ]

    # 6. Interview Preparation & STAR Method
    elif any(k in msg for k in ["interview", "star", "question", "tayari", "hr", "tips"]):
        if is_hindi:
            reply = (
                "इंटरव्यू के लिए **STAR मेथड** का अभ्यास करें:\n"
                "• **S (Situation)**: स्थिति का संक्षिप्त परिचय दें (1-2 वाक्य).\n"
                "• **T (Task)**: आपको क्या कार्य या समस्या हल करनी थी?\n"
                "• **A (Action)**: आपने खुद कौन से टूल्स और टेक्नोलॉजी का इस्तेमाल किया?\n"
                "• **R (Result)**: क्या ठोस नतीजा निकला (जैसे: 'परफॉरमेंस 35% बेहतर हुई')?\n"
                "अपने उत्तर को 90-120 सेकंड के भीतर समेटने की प्रैक्टिस करें।"
            )
            suggestions = [
                "ATS स्कोर 90%+ कैसे करें?",
                "सॉफ्टवेयर इंजीनियर की समरी लिखो",
                "साइबर सिक्योरिटी स्किल्स"
            ]
        else:
            reply = (
                "Master the **STAR Method** for behavioral and technical interviews:\n"
                "• **S (Situation)**: Set the scene and context (1-2 sentences).\n"
                "• **T (Task)**: What challenge or objective were you responsible for?\n"
                "• **A (Action)**: Specific technologies and architectural decisions YOU implemented.\n"
                "• **R (Result)**: Quantifiable business outcome (e.g., 'improved throughput by 35%').\n"
                "Practice structuring answers within 90-120 seconds!"
            )
            suggestions = [
                "How to improve my ATS score?",
                "Write a summary for Full Stack Engineer",
                "Skills for Cybersecurity"
            ]

    # 7. Default / Conversational
    else:
        if is_hindi:
            reply = (
                "नमस्ते! मैं आपका LokiResume AI करियर और ATS कोच हूँ। "
                "मैं आपके रेज़्युमे का ATS स्कोर बढ़ाने, Google XYZ फॉर्मूला से बुलेट पॉइंट्स लिखने, या जॉब के अनुसार स्किल्स चुनने में मदद कर सकता हूँ। "
                "आप माइक 🎙️ बटन दबाकर हिंदी में बोलकर भी सवाल पूछ सकते हैं!"
            )
            suggestions = [
                "ATS स्कोर 90%+ कैसे करें?",
                "सॉफ्टवेयर इंजीनियर की समरी लिखो",
                "5 दमदार एक्शन वर्ब्स बताओ",
                "साइबर सिक्योरिटी स्किल्स"
            ]
        else:
            reply = (
                "Hello! I am your LokiResume AI Career & ATS Coach. "
                "I can help you boost your ATS score, write impactful Google XYZ bullet points, recommend high-demand skills, or tailor your resume to any job posting. "
                "You can also use the microphone icon 🎙️ to ask me anything with your voice!"
            )
            suggestions = [
                "How to improve my ATS score?",
                "Write a summary for Full Stack Engineer",
                "Give me 5 strong action verbs",
                "What skills to add for Cybersecurity?"
            ]

    return AIChatResponse(reply=reply, suggestions=suggestions)

