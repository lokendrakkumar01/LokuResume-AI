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

class PDFGenerator:
    """Generate professional resume PDFs using ReportLab"""
    
    def generate_resume_pdf(self, resume: dict, score: float, pdf_preferences: dict = None) -> BytesIO:
        """Generate a PDF resume from resume data"""
        if pdf_preferences is None:
            pdf_preferences = {}
        
        accent_color = pdf_preferences.get('accent_color') or '#4f46e5'
        template_style = resume.get('template_style') or 'modern'
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=letter,
            rightMargin=0.45*inch, leftMargin=0.45*inch,
            topMargin=0.4*inch, bottomMargin=0.4*inch
        )
        
        elements = []
        styles = getSampleStyleSheet()
        
        header_align = TA_CENTER if template_style == 'executive' else TA_LEFT
        
        name_style = ParagraphStyle(
            'NameStyle',
            parent=styles['Heading1'],
            fontSize=20 if template_style == 'executive' else 18,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=2,
            alignment=header_align,
            fontName='Helvetica-Bold',
            leading=22
        )
        
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor(accent_color),
            spaceAfter=4,
            alignment=header_align,
            fontName='Helvetica-Bold'
        )
        
        contact_style = ParagraphStyle(
            'ContactStyle',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#475569'),
            spaceAfter=2,
            alignment=header_align,
            fontName='Helvetica'
        )
        
        section_header_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=11,
            textColor=colors.HexColor(accent_color),
            spaceAfter=4,
            spaceBefore=6,
            fontName='Helvetica-Bold',
            leading=13
        )
        
        subsection_style = ParagraphStyle(
            'SubsectionStyle',
            parent=styles['Normal'],
            fontSize=8.5,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=2,
            fontName='Helvetica-Bold',
            leading=10
        )
        
        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#334155'),
            spaceAfter=3,
            alignment=TA_LEFT,
            fontName='Helvetica',
            leading=10
        )
        
        bullet_style = ParagraphStyle(
            'BulletStyle',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#334155'),
            spaceAfter=2,
            leftIndent=10,
            fontName='Helvetica',
            leading=9
        )
        
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
        
        name_para = Paragraph(personal_info.get('name', 'Your Name'), name_style)
        headline_text = personal_info.get('headline') or "Software Developer | Web Applications"
        title_para = Paragraph(headline_text, title_style)
        
        contact_lines = []
        if personal_info.get('email'):
            contact_lines.append(f"<a href='mailto:{personal_info['email']}' color='{accent_color}'>{personal_info['email']}</a>")
        if personal_info.get('phone'):
            contact_lines.append(f"<a href='tel:{personal_info['phone']}' color='{accent_color}'>{personal_info['phone']}</a>")
        if personal_info.get('github'):
            contact_lines.append(f"<a href='{personal_info['github']}' color='{accent_color}'>GitHub</a>")
        if personal_info.get('linkedin'):
            contact_lines.append(f"<a href='{personal_info['linkedin']}' color='{accent_color}'>LinkedIn</a>")
        if personal_info.get('portfolio'):
            contact_lines.append(f"<a href='{personal_info['portfolio']}' color='{accent_color}'>Portfolio</a>")
        
        contact_para = Paragraph(" | ".join(contact_lines), contact_style)
        
        if photo_cell and template_style != 'executive':
            header_table = Table([[photo_cell, [name_para, title_para, contact_para]]], colWidths=[0.9*inch, 6.2*inch])
            header_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(header_table)
        else:
            elements.append(name_para)
            elements.append(title_para)
            elements.append(contact_para)
        
        elements.append(Spacer(1, 0.05*inch))
        
        # Header divider line
        line_table = Table([['']], colWidths=[7.1*inch])
        line_table.setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (-1, 0), 1.5, colors.HexColor(accent_color)),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        elements.append(line_table)
        elements.append(Spacer(1, 0.05*inch))
        
        # Summary
        if resume.get('summary'):
            elements.append(Paragraph("<b>PROFESSIONAL SUMMARY</b>", section_header_style))
            elements.append(Paragraph(resume['summary'], body_style))
            elements.append(Spacer(1, 0.04*inch))
        
        # Skills
        if resume.get('skills'):
            elements.append(Paragraph("<b>SKILLS &amp; EXPERTISE</b>", section_header_style))
            elements.append(Paragraph(" • ".join(resume['skills']), body_style))
            elements.append(Spacer(1, 0.04*inch))
        
        # Projects
        if resume.get('projects'):
            elements.append(Paragraph("<b>PROJECTS</b>", section_header_style))
            for project in resume['projects']:
                p_title = f"<b>{project.get('title', '')}</b>"
                if project.get('technologies'):
                    p_title += f" <i>({project['technologies']})</i>"
                elements.append(Paragraph(p_title, subsection_style))
                if project.get('description'):
                    elements.append(Paragraph(project['description'], body_style))
                elements.append(Spacer(1, 0.03*inch))
        
        # Experience
        if resume.get('experience'):
            elements.append(Paragraph("<b>WORK EXPERIENCE</b>", section_header_style))
            for exp in resume['experience']:
                exp_head = f"<b>{exp.get('role', '')}</b> - {exp.get('company', '')}"
                if exp.get('duration'):
                    exp_head += f" <i>({exp['duration']})</i>"
                elements.append(Paragraph(exp_head, subsection_style))
                if exp.get('description'):
                    elements.append(Paragraph(exp['description'], body_style))
                elements.append(Spacer(1, 0.03*inch))
        
        # Education
        if resume.get('education'):
            elements.append(Paragraph("<b>EDUCATION</b>", section_header_style))
            for edu in resume['education']:
                edu_text = f"<b>{edu.get('degree', '')}</b> - {edu.get('college', '')} ({edu.get('year', '')})"
                if edu.get('grade'):
                    edu_text += f" | Grade: {edu['grade']}"
                elements.append(Paragraph(edu_text, body_style))
            elements.append(Spacer(1, 0.04*inch))
        
        # Coding Profiles
        if resume.get('coding_profiles'):
            elements.append(Paragraph("<b>CODING PROFILES</b>", section_header_style))
            for profile in resume['coding_profiles']:
                p_text = f"• <b>{profile.get('platform', '')}:</b> {profile.get('headline', '')} - {profile.get('link', '')}"
                elements.append(Paragraph(p_text, bullet_style))
            elements.append(Spacer(1, 0.04*inch))
        
        # Certifications
        if resume.get('certifications'):
            elements.append(Paragraph("<b>CERTIFICATIONS</b>", section_header_style))
            for cert in resume['certifications']:
                c_name = cert if isinstance(cert, str) else cert.get('name', '')
                elements.append(Paragraph(f"• {c_name}", bullet_style))
            elements.append(Spacer(1, 0.04*inch))
        
        # Footer
        elements.append(Spacer(1, 0.1*inch))
        current_year = datetime.now().year
        footer_text = f"<i>© {current_year} LokuResume AI. ATS Optimized.</i>"
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
