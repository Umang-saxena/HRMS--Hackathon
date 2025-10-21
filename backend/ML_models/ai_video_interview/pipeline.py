import os
from pathlib import Path
from .utils.queue_utils import celery_app
from .utils import transcription_utils, storage_utils
from .interview_agent import transcript_analyzer
from .audio_analysis import speech_analyzer
from supabase import create_client


# Initialize Supabase client once (used in worker)
SUPABASE_URL: str = os.environ.get("SUPABASE_URL")
SUPABASE_KEY: str = os.environ.get("SUPABASE_SERVICE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


@celery_app.task(name="ML_models.ai_video_interview.pipeline.run_full_analysis")
def run_full_analysis(
    interview_id: str,
    job_title: str,
    job_description: str,
    audio_file_name: str,
):
    """Celery task: complete end-to-end post-interview analysis."""

    print(f"[{interview_id}] Starting analysis for audio file: {audio_file_name}")

    # --- Build a valid local temp path ---
    # Extract just the filename from any given path
    audio_filename = os.path.basename(audio_file_name)
    temp_dir = Path(os.getenv("TEMP", "/tmp"))
    local_audio_path = temp_dir / audio_filename
    local_audio_path = str(local_audio_path)

    print(f"[{interview_id}] Local audio path resolved to: {local_audio_path}")

    # --- 1. Download the file from Supabase (uncomment if needed) ---
    try:
        storage_utils.download_file(audio_file_name, local_audio_path)
    except Exception as e:
        print(f"[{interview_id}] Failed to download audio: {e}")
        return {"status": "error", "message": "Download failed"}

    # --- 2. Transcribe the audio ---
    try:
        transcript = transcription_utils.transcribe_audio(local_audio_path)
    except Exception as e:
        print(f"[{interview_id}] Error during transcription: {e}")
        transcript = None

    if not transcript:
        print(f"[{interview_id}] Transcription failed. Aborting.")
        return {"status": "error", "message": "Transcription failed."}

    # --- 3. Analyze transcript content ---
    try:
        content_analysis = transcript_analyzer.analyze_transcript(
            transcript, job_title, job_description
        )
    except Exception as e:
        print(f"[{interview_id}] Content analysis failed: {e}")
        content_analysis = {}

    # --- 4. Analyze audio metrics ---
    try:
        speech_metrics = speech_analyzer.analyze_audio_metrics(local_audio_path, transcript)
    except Exception as e:
        print(f"[{interview_id}] Audio metrics analysis failed: {e}")
        speech_metrics = {}

    from postgrest.exceptions import APIError

    try:
        response = supabase.table("interviews").update({
            "transcript": transcript,
            "content_analysis": content_analysis,
            "speech_analysis": speech_metrics,
            "status": "completed"
        }).eq("candidate_id", interview_id).execute()

        if not response.data:
            print(f"[{interview_id}] ⚠️ No existing record, creating a new one.")
            supabase.table("interviews").insert({
                "candidate_id": interview_id,
                "job_title": job_title,
                "transcript": transcript,
                "content_analysis": content_analysis,
                "speech_analysis": speech_metrics,
                "status": "completed"
            }).execute()

        print(f"[{interview_id}] ✅ Analysis results saved to Supabase.")
    except APIError as e:
        print(f"[{interview_id}] ❌ Supabase error: {e}")


    # --- 6. Clean up local file ---
    try:
        if os.path.exists(local_audio_path):
            os.remove(local_audio_path)
    except Exception as e:
        print(f"[{interview_id}] Failed to remove temp file: {e}")

    return {"status": "success"}
