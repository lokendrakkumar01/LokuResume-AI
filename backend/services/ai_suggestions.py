from typing import List, Dict
import re

class AISuggestions:
    """Rule-based AI suggestions for resume improvement"""
    
    # Strong action verbs for different contexts
    ACHIEVEMENT_VERBS = [
        'achieved', 'accomplished', 'attained', 'delivered', 'exceeded',
        'generated', 'improved', 'increased', 'maximized', 'optimized'
    ]
    
    LEADERSHIP_VERBS = [
        'led', 'managed', 'coordinated', 'directed', 'supervised',
        'mentored', 'guided', 'spearheaded', 'facilitated', 'orchestrated'
    ]
    
    TECHNICAL_VERBS = [
        'developed', 'engineered', 'built', 'designed', 'implemented',
        'created', 'architected', 'programmed', 'coded', 'deployed'
    ]
    
    WEAK_PHRASES = [
        'responsible for', 'worked on', 'helped with', 'involved in',
        'participated in', 'assisted with', 'contributed to'
    ]
    
    def improve_summary(self, summary: str) -> str:
        """Improve professional summary with AI suggestions"""
        if not summary:
            return "Passionate and results-driven professional with expertise in [Your Field]. Proven track record of delivering high-impact solutions and driving measurable results. Skilled in [Key Skills] with [X] years of experience in [Industry/Domain]."
        
        improved = summary
        
        # Replace weak phrases with stronger alternatives
        for weak_phrase in self.WEAK_PHRASES:
            if weak_phrase in improved.lower():
                improved = re.sub(
                    weak_phrase,
                    self._get_strong_alternative(weak_phrase),
                    improved,
                    flags=re.IGNORECASE
                )
        
        return improved
    
    def improve_project_description(self, description: str) -> str:
        """Suggest improvements for project descriptions"""
        if not description:
            return "Developed a [Technology] solution that [Impact]. Implemented [Features] using [Tech Stack], resulting in [Measurable Outcome]."
        
        suggestions = []
        
        # Check for measurable results
        if not re.search(r'\d+[%x]?', description):
            suggestions.append("Add measurable results (e.g., '40% faster performance', 'serving 10,000+ users')")
        
        # Check for action verbs
        has_action_verb = any(verb in description.lower() for verb in self.TECHNICAL_VERBS)
        if not has_action_verb:
            suggestions.append(f"Start with strong action verbs like: {', '.join(self.TECHNICAL_VERBS[:5])}")
        
        # Check for weak phrases
        for weak_phrase in self.WEAK_PHRASES:
            if weak_phrase in description.lower():
                suggestions.append(f"Replace '{weak_phrase}' with stronger language")
        
        return suggestions
    
    def improve_experience_description(self, description: str) -> str:
        """Suggest improvements for experience descriptions"""
        suggestions = []
        
        if not description:
            return ["Use the format: [Action Verb] + [What You Did] + [Measurable Impact]"]
        
        # Check for quantification
        if not re.search(r'\d+[%x]?', description):
            suggestions.append("Quantify your impact (e.g., 'Reduced deployment time by 50%')")
        
        # Check for action verbs
        has_achievement_verb = any(verb in description.lower() for verb in self.ACHIEVEMENT_VERBS)
        if not has_achievement_verb:
            suggestions.append(f"Use achievement verbs: {', '.join(self.ACHIEVEMENT_VERBS[:5])}")
        
        # Check for weak phrases
        for weak_phrase in self.WEAK_PHRASES:
            if weak_phrase in description.lower():
                suggestions.append(f"Avoid weak phrase: '{weak_phrase}'")
                suggestions.append(f"Try instead: '{self._get_strong_alternative(weak_phrase)}'")
                break
        
        return suggestions
    
    def enhance_resume_text(self, text: str, context: str = 'general') -> str:
        """
        Enhance any resume text using AI-powered suggestions
        Context can be: 'summary', 'project', 'experience', 'general'
        """
        if not text:
            return text
        
        enhanced = text
        
        # Remove weak phrases and replace with stronger alternatives
        for weak_phrase in self.WEAK_PHRASES:
            if weak_phrase in enhanced.lower():
                verb_list = self._select_verb_list(context)
                replacement = verb_list[0] if verb_list else 'delivered'
                enhanced = re.sub(
                    r'\b' + weak_phrase + r'\b',
                    replacement,
                    enhanced,
                    flags=re.IGNORECASE
                )
        
        # Ensure starts with action verb
        words = enhanced.split()
        if words and words[0].lower() not in (self.ACHIEVEMENT_VERBS + self.LEADERSHIP_VERBS + self.TECHNICAL_VERBS):
            verb_list = self._select_verb_list(context)
            if verb_list:
                enhanced = f"{verb_list[0].capitalize()} {enhanced.lower()}"
        
        return enhanced
    
    def suggest_missing_elements(self, resume: dict) -> List[str]:
        """Suggest missing resume elements"""
        suggestions = []
        
        if not resume.get('summary'):
            suggestions.append("Add a compelling professional summary (50-150 words)")
        
        if not resume.get('skills') or len(resume.get('skills', [])) < 5:
            suggestions.append("Add at least 5 relevant technical skills")
        
        if not resume.get('projects') or len(resume.get('projects', [])) < 2:
            suggestions.append("Include 2-3 significant projects to showcase your abilities")
        
        if not resume.get('education'):
            suggestions.append("Add your education details")
        
        personal_info = resume.get('personal_info', {})
        if not personal_info.get('linkedin') and not personal_info.get('github'):
            suggestions.append("Add your LinkedIn or GitHub profile URL")
        
        # Check for measurable results in projects
        if resume.get('projects'):
            has_measurable = any(
                re.search(r'\d+[%x]?', proj.get('description', ''))
                for proj in resume['projects']
            )
            if not has_measurable:
                suggestions.append("Include measurable outcomes in your projects (numbers, percentages)")
        
        return suggestions
    
    def _get_strong_alternative(self, weak_phrase: str) -> str:
        """Get a strong alternative for weak phrases"""
        alternatives = {
            'responsible for': 'managed',
            'worked on': 'developed',
            'helped with': 'contributed to',
            'involved in': 'participated in',
            'participated in': 'led',
            'assisted with': 'supported',
            'contributed to': 'delivered'
        }
        return alternatives.get(weak_phrase.lower(), 'achieved')
    
    def _select_verb_list(self, context: str) -> List[str]:
        """Select appropriate action verbs based on context"""
        if context == 'experience':
            return self.ACHIEVEMENT_VERBS + self.LEADERSHIP_VERBS
        elif context == 'project':
            return self.TECHNICAL_VERBS
        elif context == 'summary':
            return self.ACHIEVEMENT_VERBS
        else:
            return self.ACHIEVEMENT_VERBS + self.TECHNICAL_VERBS

# Create singleton instance
ai_suggestions = AISuggestions()
