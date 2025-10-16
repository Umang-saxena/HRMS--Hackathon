# ai_video_interview/utils/transcription_utils.py
from faster_whisper import WhisperModel
import torch

# --- Initialization (runs once) ---
# Check for device, but it will be 'cpu' on Render's free tier
device = "cuda" if torch.cuda.is_available() else "cpu"

# Load the optimized 'small' model with int8 quantization for speed
model = WhisperModel("small.en", device=device, compute_type="int8")
print("✅ faster-whisper model loaded successfully.")

def transcribe_audio(audio_file_path: str) -> str:
    """Transcribes an audio file using the faster-whisper implementation."""
    try:
        # The 'transcribe' method returns an iterator of segments
        segments, _ = model.transcribe(audio_file_path, beam_size=5)

        # Join the text from all segments into a single string
        full_transcript = " ".join([segment.text.strip() for segment in segments])
        return full_transcript

    except Exception as e:
        print(f"Error during transcription with faster-whisper: {e}")
        return ""