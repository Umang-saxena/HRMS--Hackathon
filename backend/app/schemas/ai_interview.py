# backend/app/schemas/ai_interview.py
from pydantic import BaseModel
from typing import List, Dict, Any # Use Dict/Any for flexible history, or define Message strictly

# Define the structure for a single message in the history
class Message(BaseModel):
    role: str # Should be 'ai', 'human', or potentially 'system'
    content: str

# Schema for the /conversation endpoint request body
class ConversationRequest(BaseModel):
    job_description: str
    resume_text: str
    history: List[Message] # Use the Message schema for history items

# Schema for the /start-analysis endpoint request body
class AnalysisRequest(BaseModel):
    interview_id: str
    job_title: str
    job_description: str # Added this based on our previous discussion
    audio_file_name: str # e.g., "interview-123.webm"