import os
from google import genai
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join("backend", ".env"))
api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')

client = genai.Client(api_key=api_key)

try:
    for model in client.models.list():
        print(f"Model ID: {model.name}, Display: {model.displayName}")
except Exception as e:
    print(f"Error listing models: {e}")
