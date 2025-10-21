# backend/app/routes/ai_interview.py
from fastapi import APIRouter, HTTPException
import sys, os
# from ..schemas.ai_interview_schema import ConversationRequest, AnalysisRequest, Message 
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from ML_models.ai_video_interview.pipeline import run_full_analysis
from app.schemas.ai_interview_schema import ConversationRequest, AnalysisRequest, Message
from ML_models.ai_video_interview.interview_agent import conversation_agent

# Create a router instance with a prefix and tags for organization/documentation
router = APIRouter(
    prefix="/interview", # All routes in this file will start with /ai-interview
    tags=["interview"] # Tag for FastAPI automatic docs
)

@router.post("/conversation", response_model=Message) # Use Message schema for response type hint
def handle_conversation(request: ConversationRequest):
    """Endpoint for the live, back-and-forth interview conversation."""
    try:
        # Convert Pydantic Message objects to dicts for the conversation agent
        history_dicts = [msg.model_dump() for msg in request.history]
        # Call the conversation agent logic
        response_content = conversation_agent.generate_next_question(
            request.job_description, request.resume_text, history_dicts
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
        
        run_full_analysis.delay(
            request.interview_id,
            request.job_title,
            request.job_description, 
            request.audio_file_name
        )
        
        return {
            "status": "success",
            "message": f"Post-interview analysis for interview ID {request.interview_id} has been queued."
        }
    except Exception as e:
        print(f"Error in /start-analysis: {e}") # Log the error
        raise HTTPException(status_code=500, detail=f"Failed to queue analysis task: {str(e)}")


if __name__ == "__main__":
    #Testing main
    if __name__ == "__main__":
        from fastapi import FastAPI
        from fastapi.testclient import TestClient

        # Create a real FastAPI app instance
        app = FastAPI()
        app.include_router(router)

        client = TestClient(app)

        # Run test
        response = client.post("/interview/start-analysis", json={
            "interview_id": "34211153-a991-4f34-bb42-13e814ec1dc0",
            "job_title": "Software Engineer",
            "job_description": "Looking for a software engineer with experience in Python and machine learning.",
            "audio_file_name": r"C:\\Users\\PRATHAM\\OneDrive\Desktop\\HRMS--Hackathon\backend\\ML_models\\ai_video_interview\\interview_agent\\Record (online-voice-recorder.com).mp3"
        })

        print("Status code:", response.status_code)
        print("Response JSON:", response.json())
