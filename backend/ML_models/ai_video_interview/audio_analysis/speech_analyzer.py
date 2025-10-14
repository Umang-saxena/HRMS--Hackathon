import os
import torch
import librosa
from pyannote.audio import Pipeline
from . import filler_detector

try:
    hf_token = os.environ.get("HUGGING_FACE_TOKEN")
    if not hf_token:
        raise ValueError("Hugging Face token not found. Please set HUGGING_FACE_TOKEN.")
    
    # Check for GPU availability
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # Load the pre-trained Voice Activity Detection pipeline
    vad_pipeline = Pipeline.from_pretrained(
        "pyannote/voice-activity-detection",
        use_auth_token=hf_token
    ).to(device)
    print("✅ pyannote.audio VAD pipeline loaded successfully.")

except Exception as e:
    print(f"⚠️ Error loading pyannote.audio pipeline: {e}")
    vad_pipeline = None


def analyze_audio_metrics(audio_file_path: str, transcript: str) -> dict:
    """Calculates speech metrics using pyannote.audio for accurate VAD."""
    if vad_pipeline is None:
        return {"error": "pyannote.audio pipeline is not available."}
        
    try:
        # Load audio file to get total duration
        y, sr = librosa.load(audio_file_path, sr=16000) # pyannote works best with 16kHz
        total_duration_sec = librosa.get_duration(y=y, sr=sr)
        
        # --- NEW: Use pyannote for Voice Activity Detection ---
        # The pipeline directly processes the audio file path
        vad_result = vad_pipeline(audio_file_path)
        
        # Get the timeline of speech segments
        speech_timeline = vad_result.get_timeline().support()
        
        # Calculate the total speaking duration by summing the duration of all speech segments
        speaking_duration_sec = sum(segment.duration for segment in speech_timeline)
        
        # --- The rest of the logic remains the same ---
        
        # Calculate silence percentage
        silence_percentage = ((total_duration_sec - speaking_duration_sec) / total_duration_sec) * 100 if total_duration_sec > 0 else 0
        
        # Calculate Words Per Minute (WPM)
        word_count = len(transcript.split())
        speaking_duration_min = speaking_duration_sec / 60
        wpm = word_count / speaking_duration_min if speaking_duration_min > 0 else 0
        
        # Count filler words
        filler_word_count = filler_detector.count_filler_words(transcript)
        
        return {
            "speech_rate_wpm": round(wpm),
            "silence_percentage": round(silence_percentage, 2),
            "filler_word_count": filler_word_count
        }
    except Exception as e:
        print(f"Error analyzing audio metrics with pyannote: {e}")
        return {"error": "Failed to analyze audio."}