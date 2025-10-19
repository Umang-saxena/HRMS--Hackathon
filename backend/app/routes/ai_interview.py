# backend/app/routes/ai_interview.py
from fastapi import APIRouter, HTTPException
# Import your Pydantic schemas correctly
from ..schemas.ai_interview import ConversationRequest, AnalysisRequest, Message
from ML_models.ai_video_interview.interview_agent import conversation_agent
from ML_models.ai_video_interview.pipeline import run_full_analysis

# Create a router instance with a prefix and tags for organization/documentation
router = APIRouter(
    prefix="/ai-interview", # All routes in this file will start with /ai-interview
    tags=["AI Interview"] # Tag for FastAPI automatic docs
)

@router.post("/conversation", response_model=Message) # Use Message schema for response type hint
def handle_conversation(request: ConversationRequest):
    """Endpoint for the live, back-and-forth interview conversation."""
    try:
        # Call the conversation agent logic
        response_content = conversation_agent.generate_next_question(
            request.job_description, request.resume_text, request.history # Pass Pydantic list directly
        )
        # Return data matching the Message schema
        return Message(role="ai", content=response_content)
    except Exception as e:
        print(f"Error in /conversation: {e}") # Log the error for debugging
        raise HTTPException(status_code=500, detail=f"Failed to generate AI response: {str(e)}")

@router.post("/start-analysis")
def start_post_interview_analysis(request: AnalysisRequest):
    """Endpoint to trigger the asynchronous post-interview analysis pipeline."""
    try:
        # Use Celery to run the task in the background
        # Pass all required arguments to the Celery task
        run_full_analysis.delay(
            request.interview_id,
            request.job_title,
            request.job_description, # Pass the job description
            request.audio_file_name
        )
        # Return a success message
        return {
            "status": "success",
            "message": f"Post-interview analysis for interview ID {request.interview_id} has been queued."
        }
    except Exception as e:
        print(f"Error in /start-analysis: {e}") # Log the error
        raise HTTPException(status_code=500, detail=f"Failed to queue analysis task: {str(e)}")