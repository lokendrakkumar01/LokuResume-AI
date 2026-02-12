from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from io import BytesIO
from datetime import datetime

class PDFGenerator:
    """Generate professional resume PDFs using ReportLab"""
    
    def generate_resume_pdf(self, resume: dict, score: float) -> BytesIO:
        """Generate a PDF resume from resume data"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter,
                              rightMargin=0.5*inch, leftMargin=0.5*inch,
                              topMargin=0.5*inch, bottomMargin=0.5*inch)
        
        # Container for PDF elements
        elements = []
        
        # Styles
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=6,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#666666'),
            spaceAfter=20,
            alignment=TA_CENTER
        )
        
        section_header_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=13,
            textColor=colors.HexColor('#2c3e50'),
            spaceAfter=10,
            spaceBefore=15,
            fontName='Helvetica-Bold',
            borderWidth=1,
            borderColor=colors.HexColor('#3498db'),
            borderPadding=5,
            backColor=colors.HexColor('#ecf0f1')
        )
        
        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#333333'),
            spaceAfter=8,
            leading=14
        )
        
        # Personal Info
        personal_info = resume['personal_info']
        name = personal_info['name']
        elements.append(Paragraph(name.upper(), title_style))
        
        contact_info = f"{personal_info['email']} | {personal_info['phone']}"
        if personal_info.get('linkedin'):
            contact_info += f" | LinkedIn: {personal_info['linkedin']}"
        if personal_info.get('github'):
            contact_info += f" | GitHub: {personal_info['github']}"
        
        elements.append(Paragraph(contact_info, subtitle_style))
        elements.append(Spacer(1, 0.1*inch))
        
        # Professional Summary
        if resume.get('summary'):
            elements.append(Paragraph("PROFESSIONAL SUMMARY", section_header_style))
            elements.append(Paragraph(resume['summary'], body_style))
            elements.append(Spacer(1, 0.15*inch))
        
        # Skills
        if resume.get('skills'):
            elements.append(Paragraph("TECHNICAL SKILLS", section_header_style))
            skills_text = " • ".join(resume['skills'])
            elements.append(Paragraph(skills_text, body_style))
            elements.append(Spacer(1, 0.15*inch))
        
        # Education
        if resume.get('education'):
            elements.append(Paragraph("EDUCATION", section_header_style))
            for edu in resume['education']:
                edu_text = f"<b>{edu['degree']}</b> - {edu['college']}<br/>"
                edu_text += f"Year: {edu['year']} | Grade: {edu['grade']}"
                elements.append(Paragraph(edu_text, body_style))
                elements.append(Spacer(1, 0.1*inch))
        
        # Projects
        if resume.get('projects'):
            elements.append(Paragraph("PROJECTS", section_header_style))
            for project in resume['projects']:
                project_title = f"<b>{project['title']}</b>"
                elements.append(Paragraph(project_title, body_style))
                
                tech_text = f"<i>Technologies: {project['technologies']}</i>"
                elements.append(Paragraph(tech_text, body_style))
                
                elements.append(Paragraph(project['description'], body_style))
                elements.append(Spacer(1, 0.1*inch))
        
        # Experience
        if resume.get('experience'):
            elements.append(Paragraph("PROFESSIONAL EXPERIENCE", section_header_style))
            for exp in resume['experience']:
                exp_header = f"<b>{exp['role']}</b> at {exp['company']}"
                elements.append(Paragraph(exp_header, body_style))
                
                duration = f"<i>{exp['duration']}</i>"
                elements.append(Paragraph(duration, body_style))
                
                elements.append(Paragraph(exp['description'], body_style))
                elements.append(Spacer(1, 0.1*inch))
        
        # Certifications
        if resume.get('certifications') and len(resume['certifications']) > 0:
            elements.append(Paragraph("CERTIFICATIONS", section_header_style))
            cert_text = "<br/>".join([f"• {cert}" for cert in resume['certifications']])
            elements.append(Paragraph(cert_text, body_style))
        
        # Footer with score (optional)
        elements.append(Spacer(1, 0.2*inch))
        footer_text = f"<i>Generated by LokuResume AI | Score: {score}% | {datetime.now().strftime('%B %Y')}</i>"
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
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
