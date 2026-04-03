"""
Voice-to-Text API — transcribe audio input to text using OpenAI Whisper.
"""

import tempfile
import os

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.middleware.auth import get_current_user, require_viewer
from app.models.core import User
from app.core.config import settings
from app.core.logger import logger

router = APIRouter()


ALLOWED_AUDIO_TYPES = {
    "audio/wav", "audio/mpeg", "audio/mp3", "audio/webm",
    "audio/ogg", "audio/mp4", "audio/x-m4a",
}

MAX_FILE_SIZE_MB = 25


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user: User = Depends(require_viewer),
):
    """
    Transcribe an audio file to text using OpenAI Whisper API.
    Accepts: wav, mp3, webm, ogg, mp4, m4a (max 25 MB).
    """

    # ✅ Validate file type
    content_type = file.content_type or ""
    base_content_type = content_type.split(";")[0]  # remove codecs part

    if base_content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {content_type}. "
                   f"Supported: wav, mp3, webm, ogg, mp4, m4a",
        )

    # ✅ Read and validate size
    audio_data = await file.read()
    size_mb = len(audio_data) / (1024 * 1024)

    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f} MB). Max: {MAX_FILE_SIZE_MB} MB",
        )

    logger.info(
        f"🎤 Voice transcription request from {current_user.email} "
        f"({size_mb:.1f} MB, {content_type})"
    )

    # ✅ Write to temp file and transcribe
    suffix = _get_extension(base_content_type)
    tmp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name

        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        with open(tmp_path, "rb") as audio_file:
            response = client.audio.transcriptions.create(
                model=settings.WHISPER_MODEL,
                file=audio_file,
                language="en",
            )

        transcript = response.text.strip()
        logger.info(f"✅ Transcription complete: '{transcript[:80]}...'")

        return {
            "status": "success",
            "transcript": transcript,
            "language": "en",
        }

    except Exception as e:
        logger.error(f"❌ Transcription failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}",
        )

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


def _get_extension(content_type: str) -> str:
    """Map content type to file extension."""
    mapping = {
        "audio/wav": ".wav",
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
        "audio/webm": ".webm",
        "audio/ogg": ".ogg",
        "audio/mp4": ".mp4",
        "audio/x-m4a": ".m4a",
    }
    return mapping.get(content_type, ".wav")
