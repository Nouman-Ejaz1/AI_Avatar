import os
from google import genai
from google.genai import types
from dotenv import load_dotenv
import base64

load_dotenv(dotenv_path=os.path.join("backend", ".env"))
api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
client = genai.Client(api_key=api_key)

try:
    print("Testing AUDIO modality properly...")
    response = client.models.generate_content(
        model="gemini-2.5-flash-preview-tts",
        contents="Hello world!",
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"]
        )
    )
    for part in response.candidates[0].content.parts:
        if part.inline_data:
            print("Audio returned! MIME type:", part.inline_data.mime_type)
            print("Audio returned! Size:", len(part.inline_data.data))
            # The data is usually raw bytes. We can base64 encode it for the frontend.
            # Convert partial base64 to check
            b64 = base64.b64encode(part.inline_data.data).decode('utf-8')
            print("B64 preview:", b64[:50])
except Exception as e:
    print("ERROR:", e)
