import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join("backend", ".env"))
api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')

client = genai.Client(api_key=api_key)

try:
    print("Testing TTS model...")
    response = client.models.generate_content(
        model="gemini-2.5-flash", # tts preview model doesn't exist maybe? Wait, user provided gemini-2.5-flash-preview-tts
        # let's test it first.
        contents="Hello from Gemini TTS test."
    )
    print("KEYS:", dir(response))
    print("TEXT:", response.text)
    # Check if we can get Audio buffer.
    has_audio = False
    for chunk in response.candidates:
        if chunk.content and chunk.content.parts:
            for p in chunk.content.parts:
                print("PART DIR:", dir(p))
                if getattr(p, "inline_data", None) or getattr(p, "audio", None):
                    print("Found audio/inline_data part!")
                    has_audio = True
    print("Audio detected:", has_audio)
except Exception as e:
    print("ERROR:", e)
