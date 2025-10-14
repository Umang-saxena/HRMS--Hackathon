import whisper # OpenAI's Whisper library for speech-to-text

# Load the model once when the module is imported for efficiency
model = whisper.load_model("tiny.en") # Using the tiny English model for speed

def transcribe_audio(audio_file_path: str) -> str:
    """Transcribes an audio file using the Whisper model."""
    try:
        result = model.transcribe(audio_file_path, fp16=False) # Run transcription
        return result["text"] # Return only the text part of the result
    except Exception as e:
        print(f"Error during transcription: {e}")
        return ""