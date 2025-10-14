# ai_video_interview/main.py
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from .interview_agent import conversation_agent
from .pipeline import run_full_analysis

# Pydantic models for API requests
class ConversationRequest(BaseModel):
    job_description: str
    resume_text: str
    history: list

class AnalysisRequest(BaseModel):
    interview_id: str
    job_title: str
    audio_file_name: str # e.g., "interview-123.wav"

app = FastAPI(title="AI Interviewer Module")

@app.post("/conversation")
def handle_conversation(request: ConversationRequest):
    """Endpoint for the live, back-and-forth interview conversation."""
    try:
        response_content = conversation_agent.generate_next_question(
            request.job_description, request.resume_text, request.history
        )
        return {"role": "ai", "content": response_content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/start-analysis")
def start_post_interview_analysis(request: AnalysisRequest):
    """Endpoint to trigger the asynchronous post-interview analysis pipeline."""
    
    # Use Celery to run the task in the background
    run_full_analysis.delay(request.interview_id, request.job_title, request.audio_file_name)
    
    return {
        "status": "success",
        "message": f"Post-interview analysis for interview ID {request.interview_id} has been queued."
    }