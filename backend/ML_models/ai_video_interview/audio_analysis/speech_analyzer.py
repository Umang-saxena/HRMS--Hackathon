import sys
import os
import torch                                        # PyTorch is still needed for Silero
import librosa                                      # Used to get total audio duration
from .filler_detector import count_filler_words      # Your existing filler word detector
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../..')))
from ..utils import transcription_utils
from dotenv import load_dotenv

load_dotenv()


try:
    # Silero VAD is loaded directly from PyTorch Hub.
    silero_model, utils = torch.hub.load(
        repo_or_dir='snakers4/silero-vad',
        model='silero_vad',
        force_reload=False # Set to True if you have download issues
    )
    
    (get_speech_timestamps, _, read_audio, *_) = utils
    print("✅ Silero VAD model loaded successfully.")
    
except Exception as e:
    print(f"⚠️ Error loading Silero VAD model: {e}")
    silero_model = None


def analyze_audio_metrics(audio_file_path: str, transcript: str) -> dict:
    """Calculates speech metrics using Silero VAD for accurate speech detection."""
    # Check if the Silero model was loaded correctly
    if silero_model is None:
        return {"error": "Silero VAD model is not available."}
        
    try:

        wav = read_audio(audio_file_path, sampling_rate=16000)
        
        
        total_duration_sec = librosa.get_duration(y=wav.numpy(), sr=16000)
        
        speech_timestamps = get_speech_timestamps(wav, silero_model, sampling_rate=16000)
        
        
        speaking_duration_sec = sum(
            (segment['end'] - segment['start']) / 16000.0 for segment in speech_timestamps
        )
        
        # --- The rest of the logic remains the same ---
        
        # Calculate silence percentage using the new, more accurate speaking duration
        silence_percentage = ((total_duration_sec - speaking_duration_sec) / total_duration_sec) * 100 if total_duration_sec > 0 else 0
        
        # Calculate Words Per Minute (WPM)
        word_count = len(transcript.split())
        speaking_duration_min = speaking_duration_sec / 60
        wpm = word_count / speaking_duration_min if speaking_duration_min > 0 else 0
        
        # Count filler words
        filler_word_count = count_filler_words(transcript)
        
        return {
            "speech_rate_wpm": round(wpm),
            "silence_percentage": round(silence_percentage, 2),
            "filler_word_count": filler_word_count
        }
    except Exception as e:
        print(f"Error analyzing audio metrics with Silero: {e}")
        return {"error": "Failed to analyze audio."}


if __name__ == "__main__":
    sample_audio_path = "backend\\ML_models\\ai_video_interview\\interview_agent\\Record (online-voice-recorder.com).mp3" 
    
    print("Transcribing audio for test...")
    transcription = transcription_utils.transcribe_audio(sample_audio_path)
    
    if not transcription:
        print("Transcription failed.")
    else:
        print("Transcription:", transcription)
        print("\nAnalyzing audio metrics with Silero VAD...")
        metrics = analyze_audio_metrics(sample_audio_path, transcription)
        print("Audio Metrics:", metrics)