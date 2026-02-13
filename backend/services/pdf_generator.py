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
        # Extract color preferences
        if pdf_preferences is None:
            pdf_preferences = {}
        
        bg_color = pdf_preferences.get('background_color', '#ffffff')
        accent_color = pdf_preferences.get('accent_color', '#1a73e8')
        
        buffer = BytesIO()
        # Optimized for one page: tighter margins
        doc = SimpleDocTemplate(buffer, pagesize=letter,
                              rightMargin=0.5*inch, leftMargin=0.5*inch,
                              topMargin=0.4*inch, bottomMargin=0.4*inch)
        
        # Container for PDF elements
        elements = []
        
        # Styles
        styles = getSampleStyleSheet()
        
        # Custom styles
        name_style = ParagraphStyle(
            'NameStyle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=2,
            alignment=TA_LEFT,
            fontName='Helvetica-Bold',
            leading=20
        )
        
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#555555'),
            spaceAfter=4,
            alignment=TA_LEFT,
            fontName='Helvetica'
        )
        
        contact_style = ParagraphStyle(
            'ContactStyle',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor(accent_color),
            spaceAfter=2,
            alignment=TA_LEFT,
            fontName='Helvetica'
        )
        
        section_header_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=10,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=4,
            spaceBefore=6,
            fontName='Helvetica-Bold',
            borderWidth=0,
            borderPadding=0,
            leftIndent=0,
            leading=12
        )
        
        subsection_style = ParagraphStyle(
            'SubsectionStyle',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#333333'),
            spaceAfter=3,
            fontName='Helvetica-Bold',
            leading=10
        )
        
        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#333333'),
            spaceAfter=3,
            alignment=TA_JUSTIFY,
            fontName='Helvetica',
            leading=10
        )
        
        bullet_style = ParagraphStyle(
            'BulletStyle',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#333333'),
            spaceAfter=2,
            leftIndent=10,
            fontName='Helvetica',
            leading=9
        )
        
        # Header Section with Profile Photo
        personal_info = resume['personal_info']
        
        # Create header table with photo and info
        header_data = []
        
        # Profile photo (if available)
        photo_cell = ""
        if personal_info.get('profile_photo'):
            try:
                # Handle base64 encoded image
                photo_data = personal_info['profile_photo']
                if photo_data.startswith('data:image'):
                    photo_data = photo_data.split(',')[1]
                
                img_buffer = BytesIO(base64.b64decode(photo_data))
                photo = Image(img_buffer, width=0.8*inch, height=0.8*inch)
                photo_cell = photo
            except:
                photo_cell = ""
        
        # Name and contact info
        name = personal_info['name']
        
        # Name and Title
        name_para = Paragraph(personal_info['name'], name_style)
        
        # Use user-provided headline or default fallback if empty
        headline_text = personal_info.get('headline', '')
        if not headline_text:
            headline_text = "Full-Stack Developer | MERN & Java | Web Applications"
            
        title_para = Paragraph(headline_text, title_style)
        
        # Contact information with clickable links
        contact_lines = []
        if personal_info.get('email'):
            contact_lines.append(f"<a href='mailto:{personal_info['email']}' color='{accent_color}'>{personal_info['email']}</a>")
        if personal_info.get('phone'):
            contact_lines.append(f"<a href='tel:{personal_info['phone']}' color='{accent_color}'>{personal_info['phone']}</a>")
        if personal_info.get('github'):
            contact_lines.append(f"<a href='{personal_info['github']}' color='{accent_color}'>GitHub</a>")
        if personal_info.get('linkedin'):
            contact_lines.append(f"<a href='{personal_info['linkedin']}' color='{accent_color}'>LinkedIn</a>")
        if personal_info.get('leetcode'):
            contact_lines.append(f"<a href='{personal_info['leetcode']}' color='{accent_color}'>LeetCode</a>")
        if personal_info.get('portfolio'):
            contact_lines.append(f"<a href='{personal_info['portfolio']}' color='{accent_color}'>Portfolio</a>")
        
        contact_para = Paragraph(" | ".join(contact_lines), contact_style)
        
        # Build header
        if photo_cell:
            header_table = Table([[photo_cell, [name_para, title_para, contact_para]]], 
                                colWidths=[1*inch, 6*inch])
            header_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(header_table)
        else:
            elements.append(name_para)
            elements.append(title_para)
            elements.append(contact_para)
        
        elements.append(Spacer(1, 0.08*inch))
        
        # Add horizontal line
        line_table = Table([['']], colWidths=[7*inch])
        line_table.setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (-1, 0), 1, colors.HexColor('#cccccc')),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        elements.append(line_table)
        elements.append(Spacer(1, 0.05*inch))
        
        # Skills Section
        if resume.get('skills') and len(resume['skills']) > 0:
            elements.append(Paragraph("<b>Skills</b>", section_header_style))
            
            # Categorize skills (simple heuristic)
            hard_skills = []
            soft_skills = []
            
            soft_skill_keywords = ['leadership', 'communication', 'teamwork', 'problem-solving', 
                                  'adaptability', 'creativity', 'critical thinking', 'collaboration']
            
            for skill in resume['skills']:
                is_soft = any(keyword in skill.lower() for keyword in soft_skill_keywords)
                if is_soft:
                    soft_skills.append(skill)
                else:
                    hard_skills.append(skill)
            
            if hard_skills:
                elements.append(Paragraph("<b>Hard Skills:</b> " + ", ".join(hard_skills), body_style))
            if soft_skills:
                elements.append(Paragraph("<b>Soft Skills:</b> " + ", ".join(soft_skills), body_style))
            
            elements.append(Spacer(1, 0.05*inch))
        
        # Technical Projects Section
        if resume.get('projects') and len(resume['projects']) > 0:
            elements.append(Paragraph("<b>Technical Projects</b>", section_header_style))
            
            for project in resume['projects']:
                # Project title with year (if available)
                project_title = f"<b>{project['title']}</b>"
                if project.get('year'):
                    project_title += f" <i>({project['year']})</i>"
                elements.append(Paragraph(project_title, subsection_style))
                
                # Technologies
                if project.get('technologies'):
                    tech_text = f"<i>{project['technologies']}</i>"
                    elements.append(Paragraph(tech_text, body_style))
                
                # Description
                if project.get('description'):
                    elements.append(Paragraph(project['description'], body_style))
                
                links = []
                if project.get('repository_url'):
                    links.append(f"<a href='{project['repository_url']}' color='{accent_color}'>Repository</a>")
                if project.get('live_demo_url'):
                    links.append(f"<a href='{project['live_demo_url']}' color='{accent_color}'>Live Demo</a>")
                if links:
                    elements.append(Paragraph(" | ".join(links), contact_style))
                
                elements.append(Spacer(1, 0.04*inch))
        
        # Problem Solving & Data Structures (if LeetCode is present)
        if personal_info.get('leetcode'):
            elements.append(Paragraph("<b>Problem Solving &amp; Data Structures</b>", section_header_style))
            elements.append(Paragraph("• <a href='" + personal_info['leetcode'] + f"' color='{accent_color}'>LeetCode Profile</a>", bullet_style))
            elements.append(Paragraph("A dedicated Computer Science student with proven problem-solving skills and expertise in data structures and algorithms, demonstrated through developing scalable web applications using Java, JavaScript, and the MERN stack.", body_style))
            elements.append(Spacer(1, 0.05*inch))
        
        # Education Section
        if resume.get('education') and len(resume['education']) > 0:
            elements.append(Paragraph("<b>Education</b>", section_header_style))
            
            for edu in resume['education']:
                # Create table for education entry with right-aligned year
                edu_data = []
                
                # Degree and college
                degree_text = f"<b>{edu.get('degree', '')}</b>"
                college_text = edu.get('college', '')
                year_text = edu.get('year', '')
                
                edu_line = Paragraph(f"{degree_text}<br/>{college_text}", body_style)
                year_para = Paragraph(f"<b>{year_text}</b>", ParagraphStyle(
                    'YearStyle',
                    parent=body_style,
                    alignment=TA_RIGHT,
                    fontName='Helvetica-Bold'
                ))
                
                edu_table = Table([[edu_line, year_para]], colWidths=[5.5*inch, 1.5*inch])
                edu_table.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                    ('TOPPADDING', (0, 0), (-1, -1), 0),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ]))
                elements.append(edu_table)
                
                # Grade info
                if edu.get('grade'):
                    grade_para = Paragraph(f"<b>CGPA:</b> {edu['grade']}", body_style)
                    elements.append(grade_para)
                
                elements.append(Spacer(1, 0.08*inch))
        
        # Professional Summary (if available)
        if resume.get('summary'):
            elements.append(Paragraph("<b>Professional Summary</b>", section_header_style))
            elements.append(Paragraph(resume['summary'], body_style))
            elements.append(Spacer(1, 0.1*inch))
        
        # Experience Section
        if resume.get('experience') and len(resume['experience']) > 0:
            elements.append(Paragraph("<b>Professional Experience</b>", section_header_style))
            
            for exp in resume['experience']:
                # Role and company with duration
                role_text = f"<b>{exp.get('role', '')}</b> at {exp.get('company', '')}"
                elements.append(Paragraph(role_text, subsection_style))
                
                if exp.get('duration'):
                    elements.append(Paragraph(f"<i>{exp['duration']}</i>", body_style))
                
                if exp.get('description'):
                    elements.append(Paragraph(exp['description'], body_style))
                
                elements.append(Spacer(1, 0.04*inch))
        
        # Certifications Section
        if resume.get('certifications') and len(resume['certifications']) > 0:
            elements.append(Paragraph("<b>Certifications</b>", section_header_style))
            
            for cert in resume['certifications']:
                # Handle both string and dict formats
                if isinstance(cert, str):
                    cert_text = f"• {cert}"
                else:
                    cert_name = cert.get('name', '')
                    cert_issuer = cert.get('issued_by', '')
                    cert_date = cert.get('date', '')
                    
                    cert_parts = [cert_name]
                    if cert_issuer:
                        cert_parts.append(f"- {cert_issuer}")
                    if cert_date:
                        cert_parts.append(f"({cert_date})")
                    
                    cert_text = f"• {' '.join(cert_parts)}"
                    
                    # Add certificate file link if file_url is available
                    # Note: file_data contains base64 encoded certificate, but we only link if URL exists
                    if cert.get('file_url'):
                        cert_url = cert.get('file_url')
                        cert_text += f" <a href='{cert_url}' color='{accent_color}'>[View Certificate]</a>"
                    
                    # Add skills learned if available
                    if cert.get('skills_learned'):
                        cert_text += f"<br/>  <i>Skills learned:</i> {cert['skills_learned']}"
                
                elements.append(Paragraph(cert_text, bullet_style))
            
            elements.append(Spacer(1, 0.05*inch))
        
        # Achievements Section
        if resume.get('achievements') and len(resume['achievements']) > 0:
            elements.append(Paragraph("<b>Achievements & Awards</b>", section_header_style))
            
            for achievement in resume['achievements']:
                # Achievement title
                achievement_title = f"<b>{achievement.get('title', '')}</b>"
                if achievement.get('date'):
                    achievement_title += f" <i>({achievement['date']})</i>"
                elements.append(Paragraph(achievement_title, subsection_style))
                
                # Description
                if achievement.get('description'):
                    elements.append(Paragraph(achievement['description'], body_style))
                
                # Add link if available
                if achievement.get('link'):
                    link_text = f"<a href='{achievement['link']}' color='{accent_color}'>[View Details]</a>"
                    elements.append(Paragraph(link_text, contact_style))
                
                elements.append(Spacer(1, 0.04*inch))
        
        # Footer with copyright
        elements.append(Spacer(1, 0.15*inch))
        
        # Copyright and date
        current_year = datetime.now().year
        footer_text = f"<i>© {current_year} LokuResume AI. All rights reserved.</i>"
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=7,
            textColor=colors.HexColor('#999999'),
            alignment=TA_CENTER
        )
        elements.append(Paragraph(footer_text, footer_style))
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer

# Create singleton instance
pdf_generator = PDFGenerator()
