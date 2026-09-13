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

def clean_url(url: str) -> str:
    """Ensure url has a valid protocol for clickable links"""
    if not url:
        return ""
    url = url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        return f"https://{url}"
    return url

def escape_xml(text: str) -> str:
    """Escape XML entities for ReportLab Paragraphs"""
    if not text:
        return ""
    return str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

class PDFGenerator:
    """Generate professional, ATS-optimized executive resume PDFs using ReportLab"""
    
    def generate_resume_pdf(self, resume: dict, score: float, pdf_preferences: dict = None) -> BytesIO:
        """Generate an executive-grade PDF resume from resume data"""
        if pdf_preferences is None:
            pdf_preferences = {}
        
        accent_color = pdf_preferences.get('accent_color') or '#e11d48'
        template_style = resume.get('template_style') or 'modern'
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=letter,
            rightMargin=0.4*inch, leftMargin=0.4*inch,
            topMargin=0.35*inch, bottomMargin=0.35*inch
        )
        
        elements = []
        styles = getSampleStyleSheet()
        page_width = 7.7 * inch
        
        header_align = TA_CENTER if template_style == 'executive' else TA_LEFT
        
        name_style = ParagraphStyle(
            'NameStyle',
            parent=styles['Heading1'],
            fontSize=20 if template_style == 'executive' else 18,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=3,
            alignment=header_align,
            fontName='Helvetica-Bold',
            leading=22
        )
        
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Normal'],
            fontSize=10.5,
            textColor=colors.HexColor(accent_color),
            spaceAfter=5,
            alignment=header_align,
            fontName='Helvetica-Bold',
            leading=13
        )
        
        contact_style = ParagraphStyle(
            'ContactStyle',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#475569'),
            spaceAfter=4,
            alignment=header_align,
            fontName='Helvetica',
            leading=10
        )
        
        section_title_style = ParagraphStyle(
            'SectionTitle',
            parent=styles['Heading2'],
            fontSize=10,
            textColor=colors.HexColor(accent_color),
            spaceAfter=2,
            spaceBefore=6,
            fontName='Helvetica-Bold',
            leading=12
        )
        
        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#334155'),
            spaceAfter=2,
            alignment=TA_LEFT,
            fontName='Helvetica',
            leading=10.5
        )
        
        bullet_style = ParagraphStyle(
            'BulletStyle',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#334155'),
            spaceAfter=2,
            leftIndent=10,
            fontName='Helvetica',
            leading=10
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
            textColor=colors.HexColor('#64748b'),
            alignment=TA_RIGHT,
            fontName='Helvetica-Oblique',
            leading=11
        )
        
        def add_section_header(title):
            elements.append(Paragraph(f"<b>{title.upper()}</b>", section_title_style))
            line_tbl = Table([['']], colWidths=[page_width])
            line_tbl.setStyle(TableStyle([
                ('LINEABOVE', (0, 0), (-1, 0), 1.2, colors.HexColor(accent_color)),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))
            elements.append(line_tbl)
            elements.append(Spacer(1, 0.04*inch))

        # Header Section
        personal_info = resume.get('personal_info', {})
        photo_cell = ""
        if personal_info.get('profile_photo'):
            try:
                photo_data = personal_info['profile_photo']
                if photo_data.startswith('data:image'):
                    photo_data = photo_data.split(',')[1]
                
                img_buffer = BytesIO(base64.b64decode(photo_data))
                photo = Image(img_buffer, width=0.75*inch, height=0.75*inch)
                photo_cell = photo
            except Exception:
                photo_cell = ""
        
        name_para = Paragraph(escape_xml(personal_info.get('name', 'Your Name')), name_style)
        headline_text = personal_info.get('headline') or "Software Developer | Web Applications"
        title_para = Paragraph(escape_xml(headline_text), title_style)
        
        contact_parts = []
        if personal_info.get('email'):
            email = personal_info['email'].strip()
            contact_parts.append(f"<a href='mailto:{email}' color='{accent_color}'><b>{escape_xml(email)}</b></a>")
        if personal_info.get('phone'):
            phone = personal_info['phone'].strip()
            contact_parts.append(f"<a href='tel:{phone}' color='{accent_color}'><b>{escape_xml(phone)}</b></a>")
        if personal_info.get('location'):
            contact_parts.append(f"<b>{escape_xml(personal_info['location'].strip())}</b>")
        if personal_info.get('github'):
            g_url = clean_url(personal_info['github'])
            contact_parts.append(f"<a href='{g_url}' color='{accent_color}'><b>GitHub ↗</b></a>")
        if personal_info.get('linkedin'):
            l_url = clean_url(personal_info['linkedin'])
            contact_parts.append(f"<a href='{l_url}' color='{accent_color}'><b>LinkedIn ↗</b></a>")
        if personal_info.get('portfolio'):
            p_url = clean_url(personal_info['portfolio'])
            contact_parts.append(f"<a href='{p_url}' color='{accent_color}'><b>Portfolio ↗</b></a>")
        
        contact_para = Paragraph(" &nbsp;•&nbsp; ".join(contact_parts), contact_style)
        
        if photo_cell and template_style != 'executive':
            header_table = Table([[photo_cell, [name_para, title_para, contact_para]]], colWidths=[0.9*inch, 6.8*inch])
            header_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            elements.append(header_table)
        else:
            elements.append(name_para)
            elements.append(title_para)
            elements.append(contact_para)
        
        elements.append(Spacer(1, 0.04*inch))
        
        # Header divider line
        header_divider = Table([['']], colWidths=[page_width])
        header_divider.setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (-1, 0), 1.75, colors.HexColor(accent_color)),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        elements.append(header_divider)
        elements.append(Spacer(1, 0.05*inch))
        
        # Summary
        if resume.get('summary'):
            add_section_header("Professional Summary")
            elements.append(Paragraph(escape_xml(resume['summary']), body_style))
            elements.append(Spacer(1, 0.03*inch))
        
        # Skills
        if resume.get('skills'):
            add_section_header("Skills & Expertise")
            skill_items = []
            for s in resume['skills']:
                if isinstance(s, dict):
                    s_name = s.get('name', '')
                else:
                    s_name = str(s)
                if s_name.strip():
                    skill_items.append(escape_xml(s_name.strip()))
            elements.append(Paragraph(" • ".join(skill_items), body_style))
            elements.append(Spacer(1, 0.03*inch))
        
        # Experience
        if resume.get('experience'):
            add_section_header("Work Experience")
            for exp in resume['experience']:
                role = escape_xml(exp.get('role', ''))
                comp = escape_xml(exp.get('company', ''))
                left_text = f"<b>{role}</b>  <font color='#64748b'>|</font>  <font color='#1e293b'>{comp}</font>"
                right_text = escape_xml(exp.get('duration', ''))
                
                row_tbl = Table([[Paragraph(left_text, item_left_style), Paragraph(right_text, item_right_style)]], colWidths=[5.5*inch, 2.2*inch])
                row_tbl.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                    ('TOPPADDING', (0, 0), (-1, -1), 0),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
                ]))
                elements.append(row_tbl)
                if exp.get('description'):
                    elements.append(Paragraph(escape_xml(exp['description']), body_style))
                elements.append(Spacer(1, 0.03*inch))
        
        # Projects
        if resume.get('projects'):
            add_section_header("Key Projects")
            for proj in resume['projects']:
                p_title = escape_xml(proj.get('title', ''))
                tech = escape_xml(proj.get('technologies', ''))
                left_text = f"<b>{p_title}</b>"
                if tech:
                    left_text += f"  <font color='#64748b'><i>({tech})</i></font>"
                
                right_text = ""
                p_link = proj.get('link') or proj.get('live_url') or proj.get('github_url')
                if p_link:
                    clean_link = clean_url(p_link)
                    right_text = f"<a href='{clean_link}' color='{accent_color}'><b>View Project ↗</b></a>"
                
                row_tbl = Table([[Paragraph(left_text, item_left_style), Paragraph(right_text, item_right_style)]], colWidths=[5.5*inch, 2.2*inch])
                row_tbl.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                    ('TOPPADDING', (0, 0), (-1, -1), 0),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
                ]))
                elements.append(row_tbl)
                if proj.get('description'):
                    elements.append(Paragraph(escape_xml(proj['description']), body_style))
                elements.append(Spacer(1, 0.03*inch))
        
        # Education
        if resume.get('education'):
            add_section_header("Education")
            for edu in resume['education']:
                deg = escape_xml(edu.get('degree', ''))
                coll = escape_xml(edu.get('college', ''))
                left_text = f"<b>{deg}</b>  <font color='#64748b'>|</font>  <font color='#334155'>{coll}</font>"
                right_text = escape_xml(edu.get('year', ''))
                
                row_tbl = Table([[Paragraph(left_text, item_left_style), Paragraph(right_text, item_right_style)]], colWidths=[5.5*inch, 2.2*inch])
                row_tbl.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                    ('TOPPADDING', (0, 0), (-1, -1), 0),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
                ]))
                elements.append(row_tbl)
                if edu.get('grade'):
                    elements.append(Paragraph(f"<font color='#64748b'>Grade / Score:</font> {escape_xml(edu['grade'])}", body_style))
                elements.append(Spacer(1, 0.03*inch))
        
        # Coding Profiles
        if resume.get('coding_profiles'):
            add_section_header("Coding Profiles")
            for prof in resume['coding_profiles']:
                plat = escape_xml(prof.get('platform', ''))
                head = escape_xml(prof.get('headline', ''))
                left_text = f"• <b>{plat}:</b> {head}"
                right_text = ""
                if prof.get('link'):
                    c_link = clean_url(prof['link'])
                    right_text = f"<a href='{c_link}' color='{accent_color}'><b>Profile ↗</b></a>"
                
                row_tbl = Table([[Paragraph(left_text, body_style), Paragraph(right_text, item_right_style)]], colWidths=[5.8*inch, 1.9*inch])
                row_tbl.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                    ('TOPPADDING', (0, 0), (-1, -1), 0),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
                ]))
                elements.append(row_tbl)
            elements.append(Spacer(1, 0.03*inch))
        
        # Certifications
        if resume.get('certifications'):
            add_section_header("Certifications")
            for cert in resume['certifications']:
                c_name = cert if isinstance(cert, str) else cert.get('name', '')
                elements.append(Paragraph(f"• {escape_xml(c_name)}", bullet_style))
            elements.append(Spacer(1, 0.03*inch))
            
        # Achievements
        if resume.get('achievements'):
            add_section_header("Achievements & Honors")
            for ach in resume['achievements']:
                title = escape_xml(ach.get('title', 'Achievement'))
                desc = escape_xml(ach.get('description', ''))
                elements.append(Paragraph(f"• <b>{title}:</b> {desc}", bullet_style))
            elements.append(Spacer(1, 0.03*inch))
        
        # Footer
        elements.append(Spacer(1, 0.08*inch))
        current_year = datetime.now().year
        footer_text = f"<i>© {current_year} LokuResume AI • ATS-Optimized Executive Format</i>"
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=7,
            textColor=colors.HexColor('#94a3b8'),
            alignment=TA_CENTER
        )
        elements.append(Paragraph(footer_text, footer_style))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer

pdf_generator = PDFGenerator()

