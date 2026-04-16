import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

def test_generate():
    api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
    if not api_key:
        print("❌ Error: GEMINI_API_KEY not found in .env")
        return

    print(f"✅ Found API key: {api_key[:5]}...{api_key[-5:]}")

    client = genai.Client(api_key=api_key)
    
    # Models to try in order
    models_to_try = [
        "gemini-3-flash-preview",
        "gemini-2.0-flash",
        "gemini-1.5-flash"
    ]
    
    for model in models_to_try:
        try:
            print(f"📡 Testing model: {model}...")
            response = client.models.generate_content(
                model=model,
                contents="Say 'Hello from " + model + "!'"
            )
            print(f"✅ Successful response from {model}: {response.text}")
            return # Stop after first success
        except Exception as e:
            print(f"⚠️ {model} failed: {str(e)}")
    
    print("❌ All models failed.")

if __name__ == "__main__":
    test_generate()
