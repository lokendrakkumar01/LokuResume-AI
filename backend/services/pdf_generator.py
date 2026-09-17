from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from io import BytesIO
from datetime import datetime
import base64
import re
from config import settings

try:
    from PIL import Image as PILImage, ImageDraw, ImageOps
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

def process_profile_photo(photo_str: str, target_size=(200, 200), circular: bool = True):
    """Process a base64 image or url into a clean, circular thumbnail for ReportLab PDF"""
    if not PIL_AVAILABLE or not photo_str or not isinstance(photo_str, str):
        return None
    try:
        photo_str = photo_str.strip()
        if not photo_str:
            return None
        
        # Check if photo is a remote URL (e.g. Cloudinary CDN)
        if photo_str.startswith("http://") or photo_str.startswith("https://"):
            import urllib.request
            req = urllib.request.Request(photo_str, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                raw_bytes = resp.read()
        else:
            # Handle data uri prefix
            if "," in photo_str:
                photo_data = photo_str.split(",", 1)[1]
            else:
                photo_data = photo_str
            raw_bytes = base64.b64decode(photo_data)

        img = PILImage.open(BytesIO(raw_bytes)).convert("RGBA")
        
        # Fit / crop to square
        img = ImageOps.fit(img, target_size, method=PILImage.Resampling.LANCZOS)
        
        if circular:
            # Create circular mask
            mask = PILImage.new("L", target_size, 0)
            draw = ImageDraw.Draw(mask)
            draw.ellipse((0, 0, target_size[0], target_size[1]), fill=255)
            
            # Put mask into alpha channel
            output_img = PILImage.new("RGBA", target_size, (255, 255, 255, 0))
            output_img.paste(img, (0, 0), mask=mask)
        else:
            output_img = img
            
        out_buf = BytesIO()
        output_img.save(out_buf, format="PNG")
        out_buf.seek(0)
        return out_buf
    except Exception as e:
        return None

def clean_url(url: str) -> str:
    """Ensure url has a valid protocol for clickable links, filtering out bare filenames or invalid data URIs"""
    if not url:
        return ""
    url = url.strip()
    if url.startswith("data:") or url.startswith("blob:") or url.startswith("file:"):
        return ""
    # Filter out bare filenames like cert.png or proof.pdf
    if re.search(r"^[a-zA-Z0-9_\-\s]+\.(png|jpe?g|webp|pdf|gif|svg|docx?)$", url, re.I):
        return ""
    if not url.startswith("http://") and not url.startswith("https://"):
        if "." in url and not url.endswith((".", "/")):
            return f"https://{url}"
        return ""
    return url

def escape_xml(text: str) -> str:
    """Escape XML entities for ReportLab Paragraphs"""
    if not text:
        return ""
    return str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

class PDFGenerator:
    """Generate professional, ATS-optimized executive resume PDFs matching user reference layout"""
    
    def generate_resume_pdf(self, resume: dict, score: float = 0, pdf_preferences: dict = None) -> BytesIO:
        """Generate an executive-grade PDF resume from resume data matching selected theme color and template"""
        if pdf_preferences is None:
            pdf_preferences = {}
        
        # Safe Hex Color Extraction & Validation
        raw_accent = str(pdf_preferences.get('accent_color') or '#111827').strip()
        if not re.match(r'^#[0-9a-fA-F]{6}$', raw_accent):
            raw_accent = '#111827'
        accent_color = raw_accent
        divider_color = accent_color
        link_color = accent_color
        
        template_style = str(resume.get('template_style') or 'modern').lower().strip()
        
        # Dual-track template dispatch
        if template_style in ('business_executive', 'business'):
            return self._generate_business_executive_pdf(resume, score, pdf_preferences)
        if template_style == 'business_timeline':
            return self._generate_business_timeline_pdf(resume, score, pdf_preferences)
        
        # Compact template uses slightly tighter page margins
        margin = 0.35 * inch if template_style == 'compact' else 0.45 * inch
        page_width = 8.5 * inch - (2 * margin)
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=letter,
            rightMargin=margin, leftMargin=margin,
            topMargin=margin, bottomMargin=margin
        )
        
        elements = []
        styles = getSampleStyleSheet()
        
        # Typography Styles
        name_font_size = 17 if template_style == 'compact' else (21 if template_style == 'executive' else 19)
        name_align = TA_CENTER if template_style == 'executive' else TA_LEFT
        
        name_style = ParagraphStyle(
            'CandidateName',
            parent=styles['Heading1'],
            fontSize=name_font_size,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=2,
            alignment=name_align,
            fontName='Helvetica-Bold',
            leading=name_font_size + 3
        )
        
        headline_style = ParagraphStyle(
            'CandidateHeadline',
            parent=styles['Normal'],
            fontSize=9.5,
            textColor=colors.HexColor(accent_color) if template_style == 'tech' else colors.HexColor('#334155'),
            spaceAfter=3,
            alignment=name_align,
            fontName='Helvetica-Oblique',
            leading=12
        )
        
        contact_style = ParagraphStyle(
            'ContactBar',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#1e293b'),
            spaceAfter=2,
            alignment=name_align,
            fontName='Helvetica',
            leading=11
        )
        
        section_title_style = ParagraphStyle(
            'SectionTitle',
            parent=styles['Heading2'],
            fontSize=9.5,
            textColor=colors.HexColor(accent_color),
            spaceAfter=2,
            spaceBefore=5,
            fontName='Helvetica-Bold',
            leading=11
        )
        
        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#1e293b'),
            spaceAfter=1.5,
            alignment=TA_LEFT,
            fontName='Helvetica',
            leading=10.5
        )
        
        bullet_style = ParagraphStyle(
            'BulletStyle',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#1e293b'),
            spaceAfter=2,
            leftIndent=10,
            fontName='Helvetica',
            leading=10.5
        )
        
        sub_bullet_style = ParagraphStyle(
            'SubBulletStyle',
            parent=styles['Normal'],
            fontSize=7.5,
            textColor=colors.HexColor('#475569'),
            spaceAfter=2,
            leftIndent=18,
            fontName='Helvetica',
            leading=9.5
        )
        
        item_left_style = ParagraphStyle(
            'ItemLeft',
            parent=styles['Normal'],
            fontSize=8.5,
            textColor=colors.HexColor('#0f172a'),
            fontName='Helvetica-Bold',
            leading=11
        )
        
        item_right_style = ParagraphStyle(
            'ItemRight',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#334155'),
            alignment=TA_RIGHT,
            fontName='Helvetica-Oblique',
            leading=11
        )
        
        item_sub_style = ParagraphStyle(
            'ItemSub',
            parent=styles['Normal'],
            fontSize=7.8,
            textColor=colors.HexColor('#475569'),
            fontName='Helvetica-Oblique',
            leading=9.5,
            spaceAfter=1
        )
        
        def add_section_header(title: str):
            """Render section header with a crisp full-width underline"""
            elements.append(Paragraph(f"<b>{title.upper()}</b>", section_title_style))
            line_tbl = Table([['']], colWidths=[page_width])
            line_tbl.setStyle(TableStyle([
                ('LINEABOVE', (0, 0), (-1, 0), 1.0, colors.HexColor(divider_color)),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))
            elements.append(line_tbl)
            elements.append(Spacer(1, 0.03*inch))

        personal_info = resume.get('personal_info', {}) or {}
        
        # Executive Template: Top Accent Banner
        if template_style == 'executive':
            top_bar = Table([['']], colWidths=[page_width])
            top_bar.setStyle(TableStyle([
                ('LINEABOVE', (0, 0), (-1, 0), 4.0, colors.HexColor(accent_color)),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))
            elements.append(top_bar)
            elements.append(Spacer(1, 0.06*inch))
        
        # Check user's preference for photo
        # Preference defaults to True, but user can explicitly disable it or omit photo
        include_photo_pref = pdf_preferences.get('include_photo')
        if include_photo_pref is None:
            include_photo_pref = True
        
        raw_photo = personal_info.get('profile_photo', '')
        photo_buf = None
        if include_photo_pref and raw_photo:
            photo_buf = process_profile_photo(raw_photo, target_size=(200, 200), circular=True)

        # 1. Candidate Name
        candidate_name = personal_info.get('name', '').strip() or "Your Name"
        
        # 2. Headline / Professional Subtitle
        headline = personal_info.get('headline', '').strip()
        
        # 3. Contact Details & Social Links Bar
        contact_line_1 = []
        if personal_info.get('email'):
            email = personal_info['email'].strip()
            contact_line_1.append(f"✉ <a href='mailto:{email}' color='{link_color}'><u>{escape_xml(email)}</u></a>")
        if personal_info.get('phone'):
            phone = personal_info['phone'].strip()
            contact_line_1.append(f"📞 <a href='tel:{phone}' color='{link_color}'><u>{escape_xml(phone)}</u></a>")
        if personal_info.get('location'):
            loc = personal_info['location'].strip()
            contact_line_1.append(f"📍 <b>{escape_xml(loc)}</b>")
        
        contact_line_2 = []
        if personal_info.get('github'):
            g_url = clean_url(personal_info['github'])
            contact_line_2.append(f"⑂ <a href='{g_url}' color='{link_color}'><u>{escape_xml(g_url)}</u></a>")
        if personal_info.get('linkedin'):
            l_url = clean_url(personal_info['linkedin'])
            contact_line_2.append(f"in <a href='{l_url}' color='{link_color}'><u>{escape_xml(l_url)}</u></a>")
        if personal_info.get('portfolio'):
            p_url = clean_url(personal_info['portfolio'])
            contact_line_2.append(f"🌐 <a href='{p_url}' color='{link_color}'><u>Portfolio ↗</u></a>")

        if photo_buf:
            photo_col_w = 1.15 * inch
            text_col_w = page_width - photo_col_w
            photo_img = Image(photo_buf, width=0.98 * inch, height=0.98 * inch)
            
            # Use left-aligned styles when placed alongside photo
            photo_name_style = ParagraphStyle('PhotoName', parent=name_style, alignment=TA_LEFT)
            photo_head_style = ParagraphStyle('PhotoHead', parent=headline_style, alignment=TA_LEFT)
            photo_contact_style = ParagraphStyle('PhotoContact', parent=contact_style, alignment=TA_LEFT)
            
            text_elements = [Paragraph(escape_xml(candidate_name), photo_name_style)]
            if headline:
                text_elements.append(Paragraph(f"<i>{escape_xml(headline)}</i>", photo_head_style))
            if contact_line_1:
                text_elements.append(Paragraph(" &nbsp;|&nbsp; ".join(contact_line_1), photo_contact_style))
            if contact_line_2:
                text_elements.append(Paragraph(" &nbsp;|&nbsp; ".join(contact_line_2), photo_contact_style))
                
            header_table = Table([[text_elements, photo_img]], colWidths=[text_col_w, photo_col_w])
            header_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ]))
            elements.append(header_table)
        else:
            # Full width candidate header (No photo)
            elements.append(Paragraph(escape_xml(candidate_name), name_style))
            if headline:
                elements.append(Paragraph(f"<i>{escape_xml(headline)}</i>", headline_style))
            if contact_line_1:
                elements.append(Paragraph(" &nbsp;|&nbsp; ".join(contact_line_1), contact_style))
            if contact_line_2:
                elements.append(Paragraph(" &nbsp;|&nbsp; ".join(contact_line_2), contact_style))
        
        elements.append(Spacer(1, 0.03 * inch))
        
        # 4. Professional Summary (Optional)
        summary = resume.get('summary', '').strip()
        if summary:
            add_section_header("Professional Summary")
            elements.append(Paragraph(escape_xml(summary), body_style))
            elements.append(Spacer(1, 0.03*inch))
            
        # 5. Skills Section
        raw_skills = resume.get('skills', []) or []
        if raw_skills:
            add_section_header("Skills")
            
            # Categorize into Hard Skills and Soft Skills
            hard_skills = []
            soft_skills = []
            
            soft_keywords = {'collaboration', 'leadership', 'problem-solving', 'adaptability', 'decision-making', 
                             'communication', 'teamwork', 'critical thinking', 'time management', 'work ethic'}
            
            for s in raw_skills:
                s_name = s.get('name', '') if isinstance(s, dict) else str(s)
                s_clean = s_name.strip()
                if not s_clean:
                    continue
                if s_clean.lower() in soft_keywords or 'soft' in s_clean.lower():
                    soft_skills.append(escape_xml(s_clean))
                else:
                    hard_skills.append(escape_xml(s_clean))
            
            if hard_skills:
                elements.append(Paragraph(f"<b>Hard Skills:</b> {', '.join(hard_skills)}", body_style))
            if soft_skills:
                elements.append(Paragraph(f"<b>Soft Skills:</b> {', '.join(soft_skills)}", body_style))
            if not hard_skills and not soft_skills:
                clean_skills = [escape_xml(str(s).strip()) for s in raw_skills if str(s).strip()]
                elements.append(Paragraph(f"<b>Technical Skills:</b> {', '.join(clean_skills)}", body_style))
                
            elements.append(Spacer(1, 0.03*inch))
        
        # 6. Work Experience Section
        experiences = resume.get('experience', []) or []
        if experiences:
            add_section_header("Work Experience")
            for exp in experiences:
                role = escape_xml(exp.get('role', ''))
                comp = escape_xml(exp.get('company', ''))
                dur = escape_xml(exp.get('duration', ''))
                
                left_title = f"<b>{role}</b>"
                if comp:
                    left_title += f" - <b>{comp}</b>"
                
                row_tbl = Table([[Paragraph(left_title, item_left_style), Paragraph(dur, item_right_style)]], colWidths=[5.6*inch, 2.0*inch])
                row_tbl.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                    ('TOPPADDING', (0, 0), (-1, -1), 0),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
                ]))
                elements.append(row_tbl)
                
                # Technologies used in experience
                tech_used = exp.get('technologies') or exp.get('tech_stack')
                if tech_used:
                    elements.append(Paragraph(f"<i>{escape_xml(tech_used)}</i>", item_sub_style))
                
                if exp.get('description'):
                    elements.append(Paragraph(escape_xml(exp['description']), body_style))
                elements.append(Spacer(1, 0.03*inch))

        # 7. Technical Projects Section
        projects = resume.get('projects', []) or []
        if projects:
            add_section_header("Technical Projects")
            for proj in projects:
                p_title = escape_xml(proj.get('title', 'Project'))
                p_year = escape_xml(proj.get('date', ''))
                tech = escape_xml(proj.get('technologies', ''))
                
                row_tbl = Table([[Paragraph(f"<b>{p_title}</b>", item_left_style), Paragraph(p_year, item_right_style)]], colWidths=[5.8*inch, 1.8*inch])
                row_tbl.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                    ('TOPPADDING', (0, 0), (-1, -1), 0),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
                ]))
                elements.append(row_tbl)
                
                if tech:
                    elements.append(Paragraph(f"<i>{tech}</i>", item_sub_style))
                
                # Links: GitHub Repository & Live Demo
                proj_links = []
                repo = proj.get('repository_url') or proj.get('github_url')
                if repo:
                    clean_repo = clean_url(repo)
                    proj_links.append(f"🔗 <a href='{clean_repo}' color='{link_color}'><u><b>GitHub Repository</b></u></a>")
                
                demo = proj.get('live_demo_url') or proj.get('live_url') or proj.get('link')
                if demo:
                    clean_demo = clean_url(demo)
                    proj_links.append(f"↗ <a href='{clean_demo}' color='{link_color}'><u><b>Live Demo</b></u></a>")
                
                if proj_links:
                    elements.append(Paragraph(" &nbsp;&nbsp;&nbsp; ".join(proj_links), body_style))
                
                if proj.get('description'):
                    elements.append(Paragraph(escape_xml(proj['description']), body_style))
                elements.append(Spacer(1, 0.03*inch))

        # 8. Problem Solving & Data Structures Section
        ps_link = personal_info.get('problem_solving') or personal_info.get('leetcode')
        if ps_link:
            add_section_header("Problem Solving & Data Structures")
            clean_ps = clean_url(ps_link)
            elements.append(Paragraph(f"↗ <a href='{clean_ps}' color='{link_color}'><u><b>LeetCode / Problem Solving Profile</b></u></a>", body_style))
            ps_desc = personal_info.get('problem_solving_description') or "Enhanced problem-solving abilities through extensive programming practice, emphasizing logical thinking, data structures, and algorithms to create efficient solutions and improve performance in real-world applications."
            elements.append(Paragraph(escape_xml(ps_desc), body_style))
            elements.append(Spacer(1, 0.03*inch))

        # 9. Education Section
        education = resume.get('education', []) or []
        if education:
            add_section_header("Education")
            for edu in education:
                coll = escape_xml(edu.get('college', ''))
                deg = escape_xml(edu.get('degree', ''))
                yr = escape_xml(edu.get('year', ''))
                grd = escape_xml(edu.get('grade', ''))
                
                # Row 1: Degree (Left) + Grade/Percentage (Right)
                degree_text = f"<b>{deg}</b>" if deg else (f"<b>{coll}</b>" if coll else "Education")
                grade_text = f"<b>{grd}</b>" if grd else ""
                row1_tbl = Table([[Paragraph(degree_text, item_left_style), Paragraph(grade_text, item_right_style)]], colWidths=[5.6*inch, 2.0*inch])
                row1_tbl.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                    ('TOPPADDING', (0, 0), (-1, -1), 0),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                ]))
                elements.append(row1_tbl)
                
                # Row 2: College (Left) + Year (Right)
                college_text = coll if (deg and coll) else ""
                year_text = yr or ""
                if college_text or year_text:
                    row2_tbl = Table([[Paragraph(college_text, body_style), Paragraph(year_text, item_right_style)]], colWidths=[5.6*inch, 2.0*inch])
                    row2_tbl.setStyle(TableStyle([
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ('LEFTPADDING', (0, 0), (-1, -1), 0),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                        ('TOPPADDING', (0, 0), (-1, -1), 0),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
                    ]))
                    elements.append(row2_tbl)
                elements.append(Spacer(1, 0.02*inch))
            elements.append(Spacer(1, 0.02*inch))

        # 10. Certifications Section
        certifications = resume.get('certifications', []) or []
        resume_id = str(resume.get("id") or resume.get("_id") or "").strip()
        public_base_url = getattr(settings, "public_frontend_url", "https://lokuresume-ai-008k.onrender.com").rstrip("/")
        
        if certifications:
            add_section_header("Certifications")
            for cert_idx, cert in enumerate(certifications):
                if isinstance(cert, str):
                    c_name = cert.strip()
                    c_org = ""
                    c_date = ""
                    c_link = ""
                    c_skills = ""
                    has_file = False
                else:
                    c_name = (cert.get('name') or '').strip()
                    c_org = (cert.get('issued_by') or '').strip()
                    c_date = (cert.get('date') or '').strip()
                    c_link = (cert.get('link') or '').strip()
                    c_skills = (cert.get('skills_learned') or '').strip()
                    has_file = bool(cert.get('file_data') or cert.get('file_url') or cert.get('has_uploaded_file'))
                
                if not c_name:
                    continue
                
                # Row 1: Cert Name (Left) + Date (Right)
                row1_left = Paragraph(f"<b>{escape_xml(c_name)}</b>", item_left_style)
                row1_right = Paragraph(f"<b>{escape_xml(c_date)}</b>", item_right_style) if c_date else Paragraph("", item_right_style)
                row1_tbl = Table([[row1_left, row1_right]], colWidths=[5.6*inch, 2.0*inch])
                row1_tbl.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                    ('TOPPADDING', (0, 0), (-1, -1), 0),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                ]))
                elements.append(row1_tbl)
                
                # Row 2: Issuer (Left) + Verify link (Right)
                row2_left = Paragraph(escape_xml(c_org), body_style) if c_org else Paragraph("", body_style)
                row2_right_str = ""
                
                # Generate verified platform link if candidate attached a certificate photo/PDF file
                platform_proof_url = ""
                if has_file and resume_id:
                    platform_proof_url = f"{public_base_url}/verify-certificate/{resume_id}/{cert_idx}"
                
                clean_cert_link = clean_url(c_link) if c_link else ""
                
                if platform_proof_url and clean_cert_link:
                    row2_right_str = f"<a href='{clean_cert_link}' color='{link_color}'><u>[Verify ↗]</u></a> &nbsp;<a href='{platform_proof_url}' color='#059669'><u>[Verify Proof 📎]</u></a>"
                elif platform_proof_url:
                    row2_right_str = f"<a href='{platform_proof_url}' color='{link_color}'><u>[Verify Proof ↗]</u></a>"
                elif clean_cert_link:
                    row2_right_str = f"<a href='{clean_cert_link}' color='{link_color}'><u>[Verify Credential ↗]</u></a>"
                
                row2_right = Paragraph(row2_right_str, item_right_style) if row2_right_str else Paragraph("", item_right_style)
                
                if c_org or row2_right_str:
                    row2_tbl = Table([[row2_left, row2_right]], colWidths=[5.6*inch, 2.0*inch])
                    row2_tbl.setStyle(TableStyle([
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ('LEFTPADDING', (0, 0), (-1, -1), 0),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                        ('TOPPADDING', (0, 0), (-1, -1), 0),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
                    ]))
                    elements.append(row2_tbl)
                
                # Row 3: Skills learned
                if c_skills:
                    elements.append(Paragraph(f"• <i>Skills learned:</i> <b>{escape_xml(c_skills)}</b>", sub_bullet_style))
                
                elements.append(Spacer(1, 0.02*inch))
            
            elements.append(Spacer(1, 0.02*inch))

        # 11. Key Achievements Section
        achievements = resume.get('achievements', []) or []
        if achievements:
            add_section_header("Achievements")
            for ach in achievements:
                a_title = escape_xml(ach.get('title', 'Achievement'))
                a_desc = escape_xml(ach.get('description', ''))
                a_link = (ach.get('link') or ach.get('file_url') or '').strip()
                
                proof_link_str = ""
                if a_link:
                    clean_a_link = clean_url(a_link)
                    proof_link_str = f" &nbsp;<a href='{clean_a_link}' color='{link_color}'><u>[View Proof ↗]</u></a>"
                
                if a_desc:
                    elements.append(Paragraph(f"• <b>{a_title}:</b> {a_desc}{proof_link_str}", bullet_style))
                else:
                    elements.append(Paragraph(f"• <b>{a_title}</b>{proof_link_str}", bullet_style))
            
            elements.append(Spacer(1, 0.03*inch))

        # 12. Coding Profiles Section
        coding_profiles = resume.get('coding_profiles', []) or []
        if coding_profiles:
            add_section_header("Coding Profiles")
            for prof in coding_profiles:
                plat = escape_xml(prof.get('platform', ''))
                head = escape_xml(prof.get('headline', ''))
                p_link = (prof.get('link') or '').strip()
                
                link_str = ""
                if p_link:
                    c_link = clean_url(p_link)
                    link_str = f" &nbsp;<a href='{c_link}' color='{link_color}'><u><b>View Profile ↗</b></u></a>"
                
                elements.append(Paragraph(f"• <b>{plat}:</b> {head}{link_str}", bullet_style))
            
            elements.append(Spacer(1, 0.03*inch))

        # 13. References Section (Optional)
        references = resume.get('references', []) or []
        if references:
            add_section_header("References")
            for ref in references:
                if isinstance(ref, dict):
                    r_name = escape_xml(ref.get('name', ''))
                    r_comp = escape_xml(ref.get('company', ''))
                    r_role = escape_xml(ref.get('role', ''))
                    r_phone = escape_xml(ref.get('phone', ''))
                    r_email = escape_xml(ref.get('email', ''))
                    parts = []
                    if r_name: parts.append(f"<b>{r_name}</b>")
                    if r_comp: parts.append(r_comp)
                    if r_role: parts.append(f"<i>({r_role})</i>")
                    contacts = []
                    if r_phone: contacts.append(f"📞 {r_phone}")
                    if r_email: contacts.append(f"✉ {r_email}")
                    if contacts: parts.append(" | ".join(contacts))
                    elements.append(Paragraph(f"• {' - '.join(parts)}", bullet_style))
            elements.append(Spacer(1, 0.03*inch))

        # 14. Hobbies Section (Optional)
        hobbies = resume.get('hobbies', []) or []
        if hobbies:
            add_section_header("Hobbies")
            clean_hobbies = [escape_xml(str(h).strip()) for h in hobbies if str(h).strip()]
            elements.append(Paragraph(f"• {', '.join(clean_hobbies)}", body_style))
            elements.append(Spacer(1, 0.03*inch))

        # 15. Languages Section (Optional)
        languages = resume.get('languages', []) or []
        if languages:
            add_section_header("Languages")
            clean_langs = []
            for l in languages:
                if isinstance(l, dict):
                    nm = escape_xml(l.get('name', '') or l.get('language', ''))
                    lvl = escape_xml(l.get('level', ''))
                    clean_langs.append(f"<b>{nm}</b> ({lvl})" if lvl else f"<b>{nm}</b>")
                else:
                    clean_langs.append(escape_xml(str(l).strip()))
            elements.append(Paragraph(f"• {', '.join(clean_langs)}", body_style))
            elements.append(Spacer(1, 0.03*inch))

        # 16. Interests Section (Optional)
        interests = resume.get('interests', []) or []
        if interests:
            add_section_header("Interests")
            clean_interests = [escape_xml(str(i).strip()) for i in interests if str(i).strip()]
            elements.append(Paragraph(f"• {', '.join(clean_interests)}", body_style))
            elements.append(Spacer(1, 0.03*inch))

        # 17. Custom Sections (Optional)
        custom_sections = resume.get('custom_sections', []) or []
        for sec in custom_sections:
            if isinstance(sec, dict) and sec.get('title'):
                add_section_header(sec['title'])
                content = sec.get('content') or sec.get('description') or ''
                if content:
                    elements.append(Paragraph(escape_xml(content), body_style))
                    elements.append(Spacer(1, 0.03*inch))

        # Build document
        doc.build(elements)
        buffer.seek(0)
        return buffer

    def _generate_business_executive_pdf(self, resume: dict, score: float = 0, pdf_preferences: dict = None) -> BytesIO:
        """Generate 2-column Executive Business resume with charcoal left sidebar matching Michael Scott reference"""
        if pdf_preferences is None:
            pdf_preferences = {}
        
        # Color palettes
        raw_accent = str(pdf_preferences.get('accent_color') or '#3e3e42').strip()
        if not re.match(r'^#[0-9a-fA-F]{6}$', raw_accent):
            raw_accent = '#3e3e42'
        sidebar_bg = raw_accent
        
        margin = 0.25 * inch
        page_width = 8.5 * inch - (2 * margin)
        left_w = 2.50 * inch
        right_w = page_width - left_w  # ~ 5.50 inch
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=letter,
            rightMargin=margin, leftMargin=margin,
            topMargin=margin, bottomMargin=margin
        )
        
        styles = getSampleStyleSheet()
        personal_info = resume.get('personal_info', {}) or {}
        
        # Typography for Left Sidebar (White on Dark Charcoal)
        side_heading = ParagraphStyle(
            'SideHeading', parent=styles['Heading2'],
            fontSize=8.5, textColor=colors.HexColor('#ffffff'),
            fontName='Helvetica-Bold', spaceBefore=8, spaceAfter=2, leading=11
        )
        side_body = ParagraphStyle(
            'SideBody', parent=styles['Normal'],
            fontSize=7.4, textColor=colors.HexColor('#f1f5f9'),
            fontName='Helvetica', leading=10.2, spaceAfter=3
        )
        side_link = ParagraphStyle(
            'SideLink', parent=styles['Normal'],
            fontSize=7.2, textColor=colors.HexColor('#ffffff'),
            fontName='Helvetica', leading=9.5, spaceAfter=2
        )
        side_ref_name = ParagraphStyle(
            'SideRefName', parent=styles['Normal'],
            fontSize=7.8, textColor=colors.HexColor('#ffffff'),
            fontName='Helvetica-Bold', leading=9.5
        )
        side_ref_sub = ParagraphStyle(
            'SideRefSub', parent=styles['Normal'],
            fontSize=7.0, textColor=colors.HexColor('#cbd5e1'),
            fontName='Helvetica', leading=8.8
        )
        side_ref_contact = ParagraphStyle(
            'SideRefContact', parent=styles['Normal'],
            fontSize=6.8, textColor=colors.HexColor('#e2e8f0'),
            fontName='Helvetica', leading=8.5
        )
        side_hobby = ParagraphStyle(
            'SideHobby', parent=styles['Normal'],
            fontSize=7.2, textColor=colors.HexColor('#f1f5f9'),
            fontName='Helvetica', leading=9.5, spaceAfter=1.5
        )

        def make_side_divider():
            t = Table([['']], colWidths=[left_w - 0.25 * inch])
            t.setStyle(TableStyle([
                ('LINEABOVE', (0, 0), (-1, 0), 0.5, colors.HexColor('#94a3b8')),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))
            return t

        # --- BUILD LEFT COLUMN ---
        left_elements = []
        
        # 1. Circular Photo
        include_photo_pref = pdf_preferences.get('include_photo', True)
        raw_photo = personal_info.get('profile_photo', '')
        if include_photo_pref and raw_photo:
            photo_buf = process_profile_photo(raw_photo, target_size=(220, 220), circular=True)
            if photo_buf:
                img = Image(photo_buf, width=1.15 * inch, height=1.15 * inch)
                photo_tbl = Table([[img]], colWidths=[left_w - 0.25 * inch])
                photo_tbl.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (0, 0), 'CENTER'),
                    ('TOPPADDING', (0, 0), (-1, -1), 0),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ]))
                left_elements.append(photo_tbl)
                left_elements.append(Spacer(1, 0.05 * inch))

        # 2. ABOUT ME
        summary = resume.get('summary', '').strip()
        if summary:
            left_elements.append(Paragraph("<b>ABOUT ME</b>", side_heading))
            left_elements.append(make_side_divider())
            left_elements.append(Spacer(1, 0.03 * inch))
            left_elements.append(Paragraph(escape_xml(summary), side_body))
            left_elements.append(Spacer(1, 0.06 * inch))

        # 3. LINKS
        links = []
        if personal_info.get('linkedin'):
            c_link = clean_url(personal_info['linkedin'])
            links.append(("LinkedIn:", c_link))
        if personal_info.get('portfolio'):
            c_link = clean_url(personal_info['portfolio'])
            links.append(("Portfolio:", c_link))
        if personal_info.get('github'):
            c_link = clean_url(personal_info['github'])
            links.append(("GitHub:", c_link))

        if links:
            left_elements.append(Paragraph("<b>LINKS</b>", side_heading))
            left_elements.append(make_side_divider())
            left_elements.append(Spacer(1, 0.03 * inch))
            for label, url in links:
                left_elements.append(Paragraph(f"<b>{label}</b>", side_ref_sub))
                left_elements.append(Paragraph(f"<a href='{url}' color='#ffffff'><u>{escape_xml(url[:28])}</u></a>", side_link))
            left_elements.append(Spacer(1, 0.06 * inch))

        # 4. REFERENCES
        references = resume.get('references', []) or []
        if references:
            left_elements.append(Paragraph("<b>REFERENCES</b>", side_heading))
            left_elements.append(make_side_divider())
            left_elements.append(Spacer(1, 0.03 * inch))
            for ref in references:
                if isinstance(ref, dict):
                    r_name = escape_xml((ref.get('name') or '').strip())
                    r_comp = escape_xml((ref.get('company') or '').strip())
                    r_role = escape_xml((ref.get('role') or '').strip())
                    r_phone = escape_xml((ref.get('phone') or '').strip())
                    r_email = escape_xml((ref.get('email') or '').strip())
                    if r_name:
                        left_elements.append(Paragraph(r_name.upper(), side_ref_name))
                    if r_comp:
                        left_elements.append(Paragraph(r_comp, side_ref_sub))
                    if r_role:
                        left_elements.append(Paragraph(f"<i>{r_role}</i>", side_ref_sub))
                    if r_phone:
                        left_elements.append(Paragraph(f"T: <a href='tel:{r_phone}' color='#e2e8f0'><u>{r_phone}</u></a>", side_ref_contact))
                    if r_email:
                        left_elements.append(Paragraph(f"E: <a href='mailto:{r_email}' color='#e2e8f0'><u>{r_email}</u></a>", side_ref_contact))
                    left_elements.append(Spacer(1, 0.04 * inch))
            left_elements.append(Spacer(1, 0.04 * inch))

        # 5. HOBBIES
        hobbies = resume.get('hobbies', []) or resume.get('interests', []) or []
        if hobbies:
            left_elements.append(Paragraph("<b>HOBBIES</b>", side_heading))
            left_elements.append(make_side_divider())
            left_elements.append(Spacer(1, 0.03 * inch))
            for h in hobbies:
                h_name = escape_xml(str(h.get('name') if isinstance(h, dict) else h).strip().upper())
                if h_name:
                    left_elements.append(Paragraph(f"◆ {h_name}", side_hobby))
            left_elements.append(Spacer(1, 0.06 * inch))

        # --- BUILD RIGHT COLUMN ---
        right_elements = []
        
        # Typography for Right Column
        r_name_style = ParagraphStyle(
            'RName', parent=styles['Heading1'],
            fontSize=17, textColor=colors.HexColor('#0f172a'),
            fontName='Helvetica-Bold', leading=19, spaceAfter=2
        )
        r_head_style = ParagraphStyle(
            'RHead', parent=styles['Normal'],
            fontSize=8.5, textColor=colors.HexColor('#475569'),
            fontName='Helvetica', leading=11, spaceAfter=2
        )
        r_contact_style = ParagraphStyle(
            'RContact', parent=styles['Normal'],
            fontSize=7.2, textColor=colors.HexColor('#334155'),
            fontName='Helvetica', leading=9.5, alignment=TA_RIGHT
        )
        r_sec_title = ParagraphStyle(
            'RSecTitle', parent=styles['Heading2'],
            fontSize=9.0, textColor=colors.HexColor('#0f172a'),
            fontName='Helvetica-Bold', leading=11, spaceBefore=6, spaceAfter=2
        )
        r_tl_left = ParagraphStyle(
            'RTL_Left', parent=styles['Normal'],
            fontSize=7.2, textColor=colors.HexColor('#334155'),
            fontName='Helvetica-Bold', leading=9.0
        )
        r_tl_left_sub = ParagraphStyle(
            'RTL_LeftSub', parent=styles['Normal'],
            fontSize=6.8, textColor=colors.HexColor('#64748b'),
            fontName='Helvetica-Oblique', leading=8.5
        )
        r_tl_node = ParagraphStyle(
            'RTL_Node', parent=styles['Normal'],
            fontSize=8, textColor=colors.HexColor('#334155'),
            alignment=TA_CENTER, leading=9
        )
        r_tl_right_title = ParagraphStyle(
            'RTL_RightTitle', parent=styles['Normal'],
            fontSize=7.8, textColor=colors.HexColor('#0f172a'),
            fontName='Helvetica-Bold', leading=9.5
        )
        r_tl_right_body = ParagraphStyle(
            'RTL_RightBody', parent=styles['Normal'],
            fontSize=7.2, textColor=colors.HexColor('#1e293b'),
            fontName='Helvetica', leading=9.8
        )
        r_skill_label = ParagraphStyle(
            'RSkillLabel', parent=styles['Normal'],
            fontSize=7.2, textColor=colors.HexColor('#0f172a'),
            fontName='Helvetica-Bold', leading=8.5, spaceAfter=1
        )

        def make_right_section_header(title: str):
            right_elements.append(Paragraph(f"<b>{title.upper()}</b>", r_sec_title))
            div_tbl = Table([['']], colWidths=[right_w - 0.25 * inch])
            div_tbl.setStyle(TableStyle([
                ('LINEABOVE', (0, 0), (-1, 0), 1.0, colors.HexColor('#0f172a')),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))
            right_elements.append(div_tbl)
            right_elements.append(Spacer(1, 0.04 * inch))

        # 1. Header (Name + Title on Left, Contact on Right)
        cand_name = (personal_info.get('name') or "Your Name").strip()
        headline = (personal_info.get('headline') or "").strip()
        
        header_left_cells = [Paragraph(f"<b>{escape_xml(cand_name.upper())}</b>", r_name_style)]
        if headline:
            header_left_cells.append(Paragraph(escape_xml(headline.upper()), r_head_style))
            
        header_right_cells = []
        if personal_info.get('location'):
            header_right_cells.append(Paragraph(f"📍 {escape_xml(personal_info['location'])}", r_contact_style))
        if personal_info.get('phone'):
            p = personal_info['phone'].strip()
            header_right_cells.append(Paragraph(f"📞 <a href='tel:{p}' color='#0f172a'><u>{escape_xml(p)}</u></a>", r_contact_style))
        if personal_info.get('email'):
            em = personal_info['email'].strip()
            header_right_cells.append(Paragraph(f"✉ <a href='mailto:{em}' color='#0f172a'><u>{escape_xml(em)}</u></a>", r_contact_style))

        hdr_table = Table([[header_left_cells, header_right_cells]], colWidths=[(right_w - 0.25*inch)*0.55, (right_w - 0.25*inch)*0.45])
        hdr_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        right_elements.append(hdr_table)
        right_elements.append(Spacer(1, 0.05 * inch))

        # 2. WORK EXPERIENCE (Vertical Timeline with Dots & Line)
        experiences = resume.get('experience', []) or []
        if experiences:
            make_right_section_header("WORK EXPERIENCE")
            tl_rows = []
            c_left_w = 1.35 * inch
            c_mid_w = 0.16 * inch
            c_right_w = (right_w - 0.25 * inch) - c_left_w - c_mid_w
            
            for exp in experiences:
                comp = escape_xml((exp.get('company') or '').strip().upper())
                dur = escape_xml((exp.get('duration') or '').strip())
                role = escape_xml((exp.get('role') or '').strip())
                desc = escape_xml((exp.get('description') or '').strip())
                
                left_cell = [Paragraph(f"<b>{comp}</b>", r_tl_left)]
                if dur:
                    left_cell.append(Paragraph(dur, r_tl_left_sub))
                
                mid_cell = [Paragraph("●", r_tl_node)]
                
                right_cell = [Paragraph(f"<b>{role}</b>", r_tl_right_title)]
                if desc:
                    right_cell.append(Paragraph(desc.replace('\n', '<br/>'), r_tl_right_body))
                
                tl_rows.append([left_cell, mid_cell, right_cell])

            tl_table = Table(tl_rows, colWidths=[c_left_w, c_mid_w, c_right_w])
            tl_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ALIGN', (1, 0), (1, -1), 'CENTER'),
                ('LINEBEFORE', (1, 0), (1, -1), 0.8, colors.HexColor('#94a3b8')),
                ('TOPPADDING', (0, 0), (-1, -1), 2),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 2),
            ]))
            right_elements.append(tl_table)
            right_elements.append(Spacer(1, 0.05 * inch))

        # 3. EDUCATION (Timeline layout)
        education = resume.get('education', []) or []
        if education:
            make_right_section_header("EDUCATION")
            edu_rows = []
            c_left_w = 1.35 * inch
            c_mid_w = 0.16 * inch
            c_right_w = (right_w - 0.25 * inch) - c_left_w - c_mid_w
            
            for edu in education:
                coll = escape_xml((edu.get('college') or '').strip().upper())
                yr = escape_xml((edu.get('year') or '').strip())
                deg = escape_xml((edu.get('degree') or '').strip())
                grd = escape_xml((edu.get('grade') or '').strip())
                
                left_cell = [Paragraph(f"<b>{coll}</b>", r_tl_left)]
                if yr:
                    left_cell.append(Paragraph(yr, r_tl_left_sub))
                
                mid_cell = [Paragraph("●", r_tl_node)]
                
                right_cell = [Paragraph(f"<b>{deg}</b>", r_tl_right_title)]
                if grd:
                    right_cell.append(Paragraph(f"• {grd}", r_tl_right_body))
                
                edu_rows.append([left_cell, mid_cell, right_cell])

            edu_table = Table(edu_rows, colWidths=[c_left_w, c_mid_w, c_right_w])
            edu_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ALIGN', (1, 0), (1, -1), 'CENTER'),
                ('LINEBEFORE', (1, 0), (1, -1), 0.8, colors.HexColor('#94a3b8')),
                ('TOPPADDING', (0, 0), (-1, -1), 2),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 2),
            ]))
            right_elements.append(edu_table)
            right_elements.append(Spacer(1, 0.05 * inch))

        # 4. SKILLS (2-Column Grid with Underline Bars matching Michael Scott)
        skills = resume.get('skills', []) or []
        if skills:
            make_right_section_header("SKILLS")
            skill_pairs = []
            half = (len(skills) + 1) // 2
            col1 = skills[:half]
            col2 = skills[half:]
            
            w_skill_col = (right_w - 0.35 * inch) / 2
            
            for i in range(max(len(col1), len(col2))):
                s1 = col1[i] if i < len(col1) else None
                s2 = col2[i] if i < len(col2) else None
                
                cell1 = []
                if s1:
                    s_name = escape_xml(str(s1.get('name') if isinstance(s1, dict) else s1).strip().upper())
                    cell1.append(Paragraph(s_name, r_skill_label))
                    line_tbl = Table([['']], colWidths=[w_skill_col - 0.1 * inch])
                    line_tbl.setStyle(TableStyle([
                        ('LINEABOVE', (0, 0), (-1, 0), 1.5, colors.HexColor('#1e293b')),
                        ('TOPPADDING', (0, 0), (-1, -1), 0),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                    ]))
                    cell1.append(line_tbl)
                
                cell2 = []
                if s2:
                    s_name = escape_xml(str(s2.get('name') if isinstance(s2, dict) else s2).strip().upper())
                    cell2.append(Paragraph(s_name, r_skill_label))
                    line_tbl2 = Table([['']], colWidths=[w_skill_col - 0.1 * inch])
                    line_tbl2.setStyle(TableStyle([
                        ('LINEABOVE', (0, 0), (-1, 0), 1.5, colors.HexColor('#1e293b')),
                        ('TOPPADDING', (0, 0), (-1, -1), 0),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                    ]))
                    cell2.append(line_tbl2)
                
                skill_pairs.append([cell1, cell2])
                
            skill_tbl = Table(skill_pairs, colWidths=[w_skill_col, w_skill_col])
            skill_tbl.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 1),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            right_elements.append(skill_tbl)
            right_elements.append(Spacer(1, 0.05 * inch))

        # 5. LANGUAGES (With Underline Proficiency Bars)
        languages = resume.get('languages', []) or []
        if languages:
            make_right_section_header("LANGUAGES")
            lang_pairs = []
            half = (len(languages) + 1) // 2
            l1 = languages[:half]
            l2 = languages[half:]
            w_lang_col = (right_w - 0.35 * inch) / 2
            
            for i in range(max(len(l1), len(l2))):
                item1 = l1[i] if i < len(l1) else None
                item2 = l2[i] if i < len(l2) else None
                
                cell1 = []
                if item1:
                    nm = escape_xml((item1.get('name') if isinstance(item1, dict) else item1).strip().upper())
                    lvl = escape_xml((item1.get('level', '') if isinstance(item1, dict) else '').strip())
                    cell1.append(Paragraph(f"{nm} <font color='#64748b'>({lvl})</font>" if lvl else nm, r_skill_label))
                    line_tbl = Table([['']], colWidths=[w_lang_col - 0.1 * inch])
                    line_tbl.setStyle(TableStyle([
                        ('LINEABOVE', (0, 0), (-1, 0), 1.5, colors.HexColor('#1e293b')),
                        ('TOPPADDING', (0, 0), (-1, -1), 0),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                    ]))
                    cell1.append(line_tbl)
                
                cell2 = []
                if item2:
                    nm = escape_xml((item2.get('name') if isinstance(item2, dict) else item2).strip().upper())
                    lvl = escape_xml((item2.get('level', '') if isinstance(item2, dict) else '').strip())
                    cell2.append(Paragraph(f"{nm} <font color='#64748b'>({lvl})</font>" if lvl else nm, r_skill_label))
                    line_tbl2 = Table([['']], colWidths=[w_lang_col - 0.1 * inch])
                    line_tbl2.setStyle(TableStyle([
                        ('LINEABOVE', (0, 0), (-1, 0), 1.5, colors.HexColor('#1e293b')),
                        ('TOPPADDING', (0, 0), (-1, -1), 0),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                    ]))
                    cell2.append(line_tbl2)
                
                lang_pairs.append([cell1, cell2])

            lang_tbl = Table(lang_pairs, colWidths=[w_lang_col, w_lang_col])
            lang_tbl.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 1),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            right_elements.append(lang_tbl)
            right_elements.append(Spacer(1, 0.05 * inch))

        # 6. ACHIEVEMENTS & CERTIFICATIONS (if present)
        achievements = resume.get('achievements', []) or []
        if achievements:
            make_right_section_header("ACHIEVEMENTS")
            for ach in achievements:
                t = escape_xml(ach.get('title', 'Achievement'))
                d = escape_xml(ach.get('description', ''))
                right_elements.append(Paragraph(f"• <b>{t}:</b> {d}" if d else f"• <b>{t}</b>", r_tl_right_body))
            right_elements.append(Spacer(1, 0.04 * inch))

        # Combine Left and Right Columns into Single 2-Column Master Table
        master_table = Table([[left_elements, right_elements]], colWidths=[left_w, right_w])
        master_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), colors.HexColor(sidebar_bg)),
            ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#ffffff')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (0, 0), 10),
            ('RIGHTPADDING', (0, 0), (0, 0), 10),
            ('TOPPADDING', (0, 0), (0, 0), 12),
            ('BOTTOMPADDING', (0, 0), (0, 0), 12),
            ('LEFTPADDING', (1, 0), (1, 0), 12),
            ('RIGHTPADDING', (1, 0), (1, 0), 8),
            ('TOPPADDING', (1, 0), (1, 0), 10),
            ('BOTTOMPADDING', (1, 0), (1, 0), 10),
        ]))
        
        doc.build([master_table])
        buffer.seek(0)
        return buffer

    def _generate_business_timeline_pdf(self, resume: dict, score: float = 0, pdf_preferences: dict = None) -> BytesIO:
        """Generate Tyler Vader style Timeline Resume with circular badge nodes and left dates"""
        if pdf_preferences is None:
            pdf_preferences = {}
        
        raw_accent = str(pdf_preferences.get('accent_color') or '#6b7280').strip()
        if not re.match(r'^#[0-9a-fA-F]{6}$', raw_accent):
            raw_accent = '#6b7280'
        accent_color = raw_accent
        
        margin = 0.35 * inch
        page_width = 8.5 * inch - (2 * margin)
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=letter,
            rightMargin=margin, leftMargin=margin,
            topMargin=margin, bottomMargin=margin
        )
        
        styles = getSampleStyleSheet()
        elements = []
        personal_info = resume.get('personal_info', {}) or {}
        
        # Styles
        t_name = ParagraphStyle('TName', parent=styles['Heading1'], fontSize=20, textColor=colors.HexColor('#3f4e24'), fontName='Helvetica-Bold', leading=23, spaceAfter=2)
        t_contact = ParagraphStyle('TContact', parent=styles['Normal'], fontSize=7.6, textColor=colors.HexColor('#1f2937'), fontName='Helvetica', leading=10.5)
        t_badge = ParagraphStyle('TBadge', parent=styles['Heading2'], fontSize=9.5, textColor=colors.HexColor('#3f4e24'), fontName='Helvetica-Bold', leading=12, spaceBefore=4, spaceAfter=2)
        t_body = ParagraphStyle('TBody', parent=styles['Normal'], fontSize=7.8, textColor=colors.HexColor('#1f2937'), fontName='Helvetica', leading=10.5, spaceAfter=3)
        t_bullet = ParagraphStyle('TBullet', parent=styles['Normal'], fontSize=7.6, textColor=colors.HexColor('#374151'), fontName='Helvetica', leading=10.2, spaceAfter=2, leftIndent=8)

        # Header (Circular photo on left + Name & Contact on right)
        include_photo = pdf_preferences.get('include_photo', True)
        photo_buf = process_profile_photo(personal_info.get('profile_photo', ''), target_size=(200, 200), circular=True) if include_photo else None
        
        hdr_cells_text = [
            Paragraph(f"<b>{escape_xml(personal_info.get('name') or 'Candidate Name')}</b>", t_name),
            Spacer(1, 0.04 * inch),
            Paragraph(f"<b>Address:</b> {escape_xml(personal_info.get('location') or '')}", t_contact),
            Paragraph(f"<b>Phone:</b> {escape_xml(personal_info.get('phone') or '')} &nbsp;&nbsp;|&nbsp;&nbsp; <b>Email:</b> {escape_xml(personal_info.get('email') or '')}", t_contact),
        ]
        if personal_info.get('portfolio') or personal_info.get('linkedin'):
            l_str = personal_info.get('portfolio') or personal_info.get('linkedin')
            hdr_cells_text.append(Paragraph(f"<b>Web:</b> {escape_xml(l_str)}", t_contact))
            
        if photo_buf:
            photo_img = Image(photo_buf, width=1.1 * inch, height=1.1 * inch)
            hdr_tbl = Table([[photo_img, hdr_cells_text]], colWidths=[1.3 * inch, page_width - 1.3 * inch])
            hdr_tbl.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(hdr_tbl)
        else:
            elements.extend(hdr_cells_text)
            
        elements.append(Spacer(1, 0.06 * inch))

        def add_timeline_badge(title: str):
            elements.append(Paragraph(f"● <b>{title.upper()}</b>", t_badge))
            elements.append(Spacer(1, 0.02 * inch))

        # Profile
        summary = resume.get('summary', '').strip()
        if summary:
            add_timeline_badge("Profile")
            elements.append(Paragraph(escape_xml(summary), t_body))
            elements.append(Spacer(1, 0.05 * inch))

        # Experience
        experiences = resume.get('experience', []) or []
        if experiences:
            add_timeline_badge("Experience")
            for exp in experiences:
                role = escape_xml(exp.get('role', ''))
                comp = escape_xml(exp.get('company', ''))
                dur = escape_xml(exp.get('duration', ''))
                desc = escape_xml(exp.get('description', ''))
                
                exp_table = Table([[
                    Paragraph(f"<b>{dur}</b>", t_contact),
                    [
                        Paragraph(f"<b>{role}</b>", t_body),
                        Paragraph(f"<i>{comp}</i>", t_contact),
                        Paragraph(desc.replace('\n', '<br/>'), t_bullet) if desc else Paragraph("", t_body)
                    ]
                ]], colWidths=[1.6 * inch, page_width - 1.6 * inch])
                exp_table.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ]))
                elements.append(exp_table)
            elements.append(Spacer(1, 0.04 * inch))

        # Education
        education = resume.get('education', []) or []
        if education:
            add_timeline_badge("Education")
            for edu in education:
                yr = escape_xml(edu.get('year', ''))
                deg = escape_xml(edu.get('degree', ''))
                coll = escape_xml(edu.get('college', ''))
                grd = escape_xml(edu.get('grade', ''))
                
                edu_tbl = Table([[
                    Paragraph(f"<b>{yr}</b>", t_contact),
                    [
                        Paragraph(f"<b>{deg}</b>", t_body),
                        Paragraph(coll, t_contact),
                        Paragraph(f"• {grd}", t_bullet) if grd else Paragraph("", t_body)
                    ]
                ]], colWidths=[1.6 * inch, page_width - 1.6 * inch])
                edu_tbl.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ]))
                elements.append(edu_tbl)
            elements.append(Spacer(1, 0.04 * inch))

        # Achievements
        achievements = resume.get('achievements', []) or []
        if achievements:
            add_timeline_badge("Achievements")
            for ach in achievements:
                t = escape_xml(ach.get('title', 'Achievement'))
                d = escape_xml(ach.get('description', ''))
                elements.append(Paragraph(f"• <b>{t}:</b> {d}" if d else f"• <b>{t}</b>", t_bullet))
            elements.append(Spacer(1, 0.04 * inch))

        # Skills
        skills = resume.get('skills', []) or []
        if skills:
            add_timeline_badge("Skills & Competencies")
            clean_s = [escape_xml(str(s.get('name') if isinstance(s, dict) else s).strip()) for s in skills]
            elements.append(Paragraph(f"• {', '.join(clean_s)}", t_body))
            elements.append(Spacer(1, 0.04 * inch))

        # References
        references = resume.get('references', []) or []
        if references:
            add_timeline_badge("References")
            for ref in references:
                if isinstance(ref, dict):
                    rn = escape_xml(ref.get('name', ''))
                    rc = escape_xml(ref.get('company', ''))
                    rp = escape_xml(ref.get('phone', ''))
                    remail = escape_xml(ref.get('email', ''))
                    elements.append(Paragraph(f"• <b>{rn}</b> ({rc}) - Phone: {rp} | Email: {remail}", t_bullet))

        doc.build(elements)
        buffer.seek(0)
        return buffer

pdf_generator = PDFGenerator()

