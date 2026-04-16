import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env1")) # Wait, I should use the same .env

def test_tts_model():
    # Use the root .env or backend/.env
    # I'll check which one exists and has the key
    env_path = os.path.join("backend", ".env")
    load_dotenv(dotenv_path=env_path)
    
    api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
    if not api_key:
        print("❌ Error: API key not found")
        return

    client = genai.Client(api_key=api_key)
    model_name = "gemini-2.5-flash-preview-tts"
    
    try:
        print(f"📡 Testing model: {model_name}...")
        # For TTS models, maybe we just send text and get audio?
        # Let's try a simple generation first.
        response = client.models.generate_content(
            model=model_name,
            contents="Hello! I am your AI avatar. I am here to help you."
        )
        print(f"✅ Response text: {response.text}")
        # Check if there's audio in the response
        # In Gemini 2.0+, audio can be part of the response if requested or supported.
        # But wait, gemini-2.5 might be very new.
    except Exception as e:
        print(f"❌ {model_name} failed: {str(e)}")

if __name__ == "__main__":
    test_tts_model()
