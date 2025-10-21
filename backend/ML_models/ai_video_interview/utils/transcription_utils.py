"""Transcription utilities for the AI interview module.

This module lazy-loads the faster-whisper model on first use to avoid heavy
imports and top-level side-effects during application import (which can be
triggered multiple times when using Uvicorn --reload or inconsistent import
paths).
"""
import threading
import torch
from typing import Optional

# Module-level cached model and lock
_model = None
_model_lock = threading.Lock()
_MODEL_NAME = "small.en"
_MODEL_COMPUTE = "int8"


def _get_model():
    """Thread-safe lazy loader for the faster-whisper WhisperModel.

    The actual import of faster_whisper and model construction happens here so
    importing this module doesn't trigger a heavy download or model load.
    """
    global _model
    if _model is not None:
        return _model

    with _model_lock:
        if _model is not None:
            return _model
        # Local import to avoid importing faster_whisper during module import
        try:
            from faster_whisper import WhisperModel
        except Exception as e:
            print(f"Failed to import faster_whisper: {e}")
            raise

        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Loading faster-whisper model {_MODEL_NAME} on {device} (compute_type={_MODEL_COMPUTE})...")
        try:
            _model_instance = WhisperModel(_MODEL_NAME, device=device, compute_type=_MODEL_COMPUTE)
            print("✅ faster-whisper model loaded successfully.")
        except Exception as e:
            print(f"Error loading faster-whisper model: {e}")
            raise

        _model = _model_instance
        return _model


def transcribe_audio(audio_file_path: str) -> str:
    """Transcribes an audio file using the faster-whisper implementation.

    Returns the full transcript string or an empty string on failure.
    """
    try:
        model = _get_model()
        segments, _ = model.transcribe(audio_file_path, beam_size=5)
        full_transcript = " ".join([getattr(seg, "text", "").strip() for seg in segments if getattr(seg, "text", None)])
        return full_transcript
    except Exception as e:
        print(f"Error during transcription with faster-whisper: {e}")
        return ""