#!/usr/bin/env python3
# Wrapper para faster-whisper
import sys
import json
from faster_whisper import WhisperModel

def transcribe(audio_path, language="es"):
    model = WhisperModel("tiny", device="cpu", compute_type="int8")
    segments, info = model.transcribe(audio_path, language=language)
    
    result = {
        "text": "".join([s.text for s in segments]),
        "language": info.language,
        "language_probability": info.language_probability,
        "duration": info.duration
    }
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 whisper_wrapper.py <audio_file>")
        sys.exit(1)
    
    audio_file = sys.argv[1]
    result = transcribe(audio_file)
    print(json.dumps(result))
