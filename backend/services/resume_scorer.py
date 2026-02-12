from models.resume import ResumeCreate, ScoreBreakdown
from typing import List
import re

class ResumeScorer:
    """Intelligent resume scoring algorithm (0-100 points)"""
    
    # ATS Keywords for scoring
    ATS_KEYWORDS = [
        'achieved', 'improved', 'increased', 'decreased', 'reduced', 'generated',
        'developed', 'implemented', 'designed', 'created', 'built', 'led',
        'managed', 'coordinated', 'analyzed', 'optimized', 'streamlined',
        'python', 'javascript', 'react', 'node', 'aws', 'docker', 'kubernetes',
        'agile', 'scrum', 'git', 'api', 'database', 'sql', 'nosql'
    ]
    
    ACTION_VERBS = [
        'achieved', 'improved', 'increased', 'developed', 'implemented',
        'designed', 'created', 'built', 'led', 'managed', 'coordinated',
        'analyzed', 'optimized', 'streamlined', 'accelerated', 'delivered'
    ]
    
    def score_resume(self, resume: dict) -> tuple[float, ScoreBreakdown, List[str], List[str]]:
        """
        Calculate resume score and provide suggestions
        Returns: (total_score, score_breakdown, suggestions, missing_keywords)
        """
        breakdown = ScoreBreakdown()
        suggestions = []
        missing_keywords = []
        
        # 1. Professional Summary (15 points)
        breakdown.summary = self._score_summary(resume.get('summary', ''), suggestions)
        
        # 2. Skills Quality (20 points)
        breakdown.skills = self._score_skills(resume.get('skills', []), suggestions)
        
        # 3. Projects Impact (20 points)
        breakdown.projects = self._score_projects(resume.get('projects', []), suggestions)
        
        # 4. Experience Strength (20 points)
        breakdown.experience = self._score_experience(resume.get('experience', []), suggestions)
        
        # 5. Keyword Optimization (15 points)
        breakdown.keywords = self._score_keywords(resume, missing_keywords)
        
        # 6. Formatting (10 points)
        breakdown.formatting = self._score_formatting(resume)
        
        total_score = (
            breakdown.summary + breakdown.skills + breakdown.projects +
            breakdown.experience + breakdown.keywords + breakdown.formatting
        )
        
        return round(total_score, 1), breakdown, suggestions, missing_keywords
    
    def _score_summary(self, summary: str, suggestions: List[str]) -> float:
        """Score professional summary (15 points max)"""
        if not summary:
            suggestions.append("Add a professional summary to introduce yourself")
            return 0
        
        words = summary.split()
        score = 0
        
        # Word count (5 points)
        if len(words) >= 50 and len(words) <= 150:
            score += 5
        elif len(words) >= 30:
            score += 3
            suggestions.append("Expand your summary to 50-150 words for better impact")
        else:
            score += 1
            suggestions.append("Your summary is too short. Aim for 50-150 words")
        
        # Action verbs (5 points)
        action_verb_count = sum(1 for verb in self.ACTION_VERBS if verb in summary.lower())
        if action_verb_count >= 2:
            score += 5
        elif action_verb_count == 1:
            score += 2.5
        else:
            suggestions.append("Use action verbs like 'achieved', 'developed', 'led' in your summary")
        
        # Specific achievements mentioned (5 points)
        has_numbers = bool(re.search(r'\d+[%x]?', summary))
        if has_numbers:
            score += 5
        else:
            score += 2
            suggestions.append("Include measurable achievements in your summary (e.g., '20% improvement')")
        
        return min(score, 15)
    
    def _score_skills(self, skills: List[str], suggestions: List[str]) -> float:
        """Score skills quality (20 points max)"""
        if not skills:
            suggestions.append("Add at least 5 relevant skills to your resume")
            return 0
        
        score = 0
        
        # Quantity (10 points)
        if len(skills) >= 8:
            score += 10
        elif len(skills) >= 5:
            score += 7
        elif len(skills) >= 3:
            score += 4
        else:
            score += 2
            suggestions.append("Add more skills. Aim for at least 5-8 key technical skills")
        
        # Diversity check (10 points)
        skill_text = ' '.join(skills).lower()
        categories_found = 0
        
        if any(tech in skill_text for tech in ['python', 'java', 'javascript', 'c++', 'go', 'rust']):
            categories_found += 1
        if any(tech in skill_text for tech in ['react', 'angular', 'vue', 'next', 'django', 'flask']):
            categories_found += 1
        if any(tech in skill_text for tech in ['aws', 'azure', 'gcp', 'docker', 'kubernetes']):
            categories_found += 1
        if any(tech in skill_text for tech in ['sql', 'mongodb', 'postgresql', 'mysql', 'redis']):
            categories_found += 1
        if any(tech in skill_text for tech in ['git', 'agile', 'scrum', 'ci/cd', 'testing']):
            categories_found += 1
        
        score += categories_found * 2
        
        if categories_found < 3:
            suggestions.append("Diversify your skills across different categories (languages, frameworks, tools, etc.)")
        
        return min(score, 20)
    
    def _score_projects(self, projects: List[dict], suggestions: List[str]) -> float:
        """Score projects impact (20 points max)"""
        if not projects:
            suggestions.append("Add at least 2-3 significant projects to showcase your work")
            return 0
        
        score = 0
        
        # Quantity (5 points)
        if len(projects) >= 3:
            score += 5
        elif len(projects) >= 2:
            score += 3
        else:
            score += 1
        
        # Quality check
        measurable_count = 0
        tech_mention_count = 0
        
        for project in projects:
            description = project.get('description', '') + ' ' + project.get('technologies', '')
            
            # Check for measurable results (10 points total)
            if re.search(r'\d+[%x]?', description):
                measurable_count += 1
            
            # Check for technology mentions (5 points total)
            if len(project.get('technologies', '').split(',')) >= 2:
                tech_mention_count += 1
        
        # Measurable results score
        if measurable_count >= len(projects):
            score += 10
        elif measurable_count >= len(projects) * 0.5:
            score += 6
        else:
            score += 2
            suggestions.append("Add measurable outcomes to your projects (e.g., '30% faster', '1000+ users')")
        
        # Technology mentions score
        if tech_mention_count >= len(projects):
            score += 5
        elif tech_mention_count >= len(projects) * 0.5:
            score += 3
        else:
            suggestions.append("Specify technologies used in each project")
        
        return min(score, 20)
    
    def _score_experience(self, experiences: List[dict], suggestions: List[str]) -> float:
        """Score experience strength (20 points max)"""
        if not experiences:
            # Experience is optional, give partial points
            return 8  # 40% of total (not penalize students/freshers too much)
        
        score = 0
        
        # Quantity (5 points)
        if len(experiences) >= 2:
            score += 5
        elif len(experiences) == 1:
            score += 3
        
        # Quality check
        impact_count = 0
        quantified_count = 0
        
        for exp in experiences:
            description = exp.get('description', '')
            
            # Check for impact statements (10 points)
            if any(verb in description.lower() for verb in self.ACTION_VERBS):
                impact_count += 1
            
            # Check for quantification (5 points)
            if re.search(r'\d+[%x]?', description):
                quantified_count += 1
        
        # Impact statements score
        if impact_count >= len(experiences):
            score += 10
        elif impact_count >= len(experiences) * 0.5:
            score += 6
        else:
            score += 2
            suggestions.append("Use action verbs to describe your impact in each role")
        
        # Quantification score
        if quantified_count >= len(experiences):
            score += 5
        elif quantified_count >= len(experiences) * 0.5:
            score += 3
        else:
            suggestions.append("Quantify your achievements (e.g., 'Reduced costs by 25%')")
        
        return min(score, 20)
    
    def _score_keywords(self, resume: dict, missing_keywords: List[str]) -> float:
        """Score ATS keyword optimization (15 points max)"""
        # Combine all text from resume
        resume_text = ' '.join([
            resume.get('summary', ''),
            ' '.join(resume.get('skills', [])),
            ' '.join([p.get('description', '') + p.get('technologies', '') for p in resume.get('projects', [])]),
            ' '.join([e.get('description', '') for e in resume.get('experience', [])])
        ]).lower()
        
        # Check for keywords
        keywords_found = sum(1 for keyword in self.ATS_KEYWORDS if keyword in resume_text)
        
        # Score based on keywords found
        score = min(keywords_found * 0.5, 15)
        
        # Find missing important keywords
        for keyword in self.ATS_KEYWORDS[:15]:  # Check top 15 keywords
            if keyword not in resume_text:
                missing_keywords.append(keyword)
        
        if score < 8:
            missing_keywords = missing_keywords[:5]  # Limit to 5 suggestions
        
        return score
    
    def _score_formatting(self, resume: dict) -> float:
        """Score overall formatting and completeness (10 points max)"""
        score = 0
        
        # Personal info completeness (3 points)
        personal_info = resume.get('personal_info', {})
        if all(personal_info.get(field) for field in ['name', 'email', 'phone']):
            score += 3
        elif any(personal_info.get(field) for field in ['name', 'email', 'phone']):
            score += 1.5
        
        # Education present (2 points)
        if resume.get('education'):
            score += 2
        
        # Skills present (2 points)
        if len(resume.get('skills', [])) >= 3:
            score += 2
        
        # Projects present (2 points)
        if resume.get('projects'):
            score += 2
        
        # LinkedIn/GitHub (1 point)
        if personal_info.get('linkedin') or personal_info.get('github'):
            score += 1
        
        return min(score, 10)

# Create singleton instance
scorer = ResumeScorer()
