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
                a_link = (ach.get('link') or '').strip()
                
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

        # 13. Languages Section (Optional)
        languages = resume.get('languages', []) or []
        if languages:
            add_section_header("Languages")
            clean_langs = [escape_xml(str(l).strip()) for l in languages if str(l).strip()]
            elements.append(Paragraph(f"• {', '.join(clean_langs)}", body_style))
            elements.append(Spacer(1, 0.03*inch))

        # 14. Interests Section (Optional)
        interests = resume.get('interests', []) or []
        if interests:
            add_section_header("Interests")
            clean_interests = [escape_xml(str(i).strip()) for i in interests if str(i).strip()]
            elements.append(Paragraph(f"• {', '.join(clean_interests)}", body_style))
            elements.append(Spacer(1, 0.03*inch))

        # 15. Custom Sections (Optional)
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

pdf_generator = PDFGenerator()

