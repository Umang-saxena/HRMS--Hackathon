# ai_video_interview/pipeline.py
import os
from .utils.queue_utils import celery_app
from .utils import transcription_utils, storage_utils
from .interview_agent import transcript_analyzer
from .audio_analysis import speech_analyzer
from supabase import create_client

# This code will run inside a Celery worker, so initialize a Supabase client here too
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")
supabase = create_client(url, key)

@celery_app.task(name="run_full_analysis")
def run_full_analysis(interview_id: str, job_title: str, audio_file_name: str):
    """A Celery task to run the entire post-interview analysis pipeline."""
    
    print(f"[{interview_id}] Starting analysis for audio file: {audio_file_name}")
    local_audio_path = f"/tmp/{audio_file_name}" # Temporary path to download the file
    
    # 1. Download audio from Supabase Storage
    storage_utils.download_file(audio_file_name, local_audio_path)
    
    # 2. Transcribe the audio
    transcript = transcription_utils.transcribe_audio(local_audio_path)
    if not transcript:
        print(f"[{interview_id}] Transcription failed. Aborting.")
        return {"status": "error", "message": "Transcription failed."}
    
    # 3. Analyze the transcript content
    content_analysis = transcript_analyzer.analyze_transcript(transcript, job_title)
    
    # 4. Analyze the audio metrics
    speech_metrics = speech_analyzer.analyze_audio_metrics(local_audio_path, transcript)
    
    # 5. Save the combined results to your Supabase database
    try:
        # Example: update a table named 'interviews' with the results
        supabase.table("interviews").update({
            "transcript": transcript,
            "content_analysis": content_analysis,
            "speech_analysis": speech_metrics,
            "status": "completed"
        }).eq("id", interview_id).execute()
        print(f"[{interview_id}] Analysis complete and results saved to database.")
    except Exception as e:
        print(f"[{interview_id}] Failed to save results to database: {e}")

    # 6. Clean up the downloaded file
    os.remove(local_audio_path)
    
    return {"status": "success"}