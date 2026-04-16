import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join("backend", ".env"))
api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
client = genai.Client(api_key=api_key)

try:
    print("Testing AUDIO modality...")
    response = client.models.generate_content(
        model="gemini-2.5-flash-preview-tts", # user string
        contents="Say hello in an audio format.",
        # config=types.GenerateContentConfig(
        #    response_modalities=["AUDIO"]
        # )
        # Wait, the user literally asked for "gemini-2.5-flash-preview-tts". 
        # Is that model directly returning TTS audio like an API? 
        # Generally, Gemini provides `config.response_modalities` for models like "gemini-2.0-flash-exp"
    )
    for part in response.candidates[0].content.parts:
        print("Part:", dir(part))
        if part.inline_data:
            print("Audio returned! Size:", len(part.inline_data.data))
        else:
            print("Text:", part.text)
except Exception as e:
    print("ERROR:", e)
