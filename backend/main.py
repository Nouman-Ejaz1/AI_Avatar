import os
import re
import json
import base64
import asyncio
from typing import Optional, List, Dict
from datetime import datetime

from google import genai
from google.genai import types
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# ─── API KEY POOL ──────────────────────────────────────────────────────────────
_ALL_KEYS = [
    os.getenv("GEMINI_API_KEY"),
    os.getenv("GEMINI_API_KEY_2"),
    os.getenv("GEMINI_API_KEY_3"),
    os.getenv("GEMINI_API_KEY_4"),
]
API_KEYS = [k for k in _ALL_KEYS if k]
if not API_KEYS:
    raise RuntimeError("No Gemini API keys found. Check backend/.env")

print(f"[Boot] Loaded {len(API_KEYS)} API key(s).")

_current_key_index = 0

def _get_client() -> genai.Client:
    return genai.Client(api_key=API_KEYS[_current_key_index])

def _rotate_key(reason: str = ""):
    global _current_key_index
    prev = _current_key_index
    _current_key_index = (_current_key_index + 1) % len(API_KEYS)
    print(f"[KeyRotate] key {prev} → {_current_key_index}. Reason: {reason[:80]}")

# ─── MODELS & PERSONA ─────────────────────────────────────────────────────────
TEXT_MODEL = "gemini-3-flash-preview"
TTS_MODEL  = "gemini-2.5-flash-preview-tts"

PERSONA = (
    "You are Luna, a friendly, intelligent, and context-aware AI assistant avatar. "
    "You remember everything the user has said in this conversation and build on it. "
    "When the user refers to something from earlier in the conversation, you connect the dots. "
    "For example, if the user asks about the weather and then gives a city name, you answer the weather for that city. "
    "Keep your responses engaging, concise, and natural — suitable for a talking avatar. "
    "Respond in short natural sentences so the answer flows well when spoken aloud. "
    "CRITICAL: Do not use emojis, hashtags, or any special characters in your text. "
    "Use only plain, standard English letters and punctuation. Never say words like 'smiley face' or 'asterisk'."
)

_SENT_RE = re.compile(r'(?<=[.!?])\s+|(?<=,)\s+')

# ─── CONVERSATION MEMORY ──────────────────────────────────────────────────────
MAX_HISTORY_TURNS = 20  # Keep last 20 exchanges (40 messages) to stay within context window

class ConversationMemory:
    """Per-session conversation memory with context awareness."""

    def __init__(self):
        self.history: List[types.Content] = []
        self.created_at = datetime.now()
        self.turn_count = 0

    def add_user_message(self, text: str):
        """Add a user message to history."""
        self.history.append(types.Content(role="user", parts=[types.Part.from_text(text=text)]))
        self.turn_count += 1
        self._trim()

    def add_model_message(self, text: str):
        """Add a model (Luna) response to history."""
        self.history.append(types.Content(role="model", parts=[types.Part.from_text(text=text)]))
        self._trim()

    def get_contents(self) -> List[types.Content]:
        """Return the full conversation history for the Gemini API."""
        return list(self.history)

    def _trim(self):
        """Keep history within limits to avoid token overflow."""
        max_messages = MAX_HISTORY_TURNS * 2  # 2 messages per turn (user + model)
        if len(self.history) > max_messages:
            # Always trim in pairs to maintain user/model alternation
            excess = len(self.history) - max_messages
            self.history = self.history[excess:]

    def get_summary(self) -> str:
        """Get a brief summary of the conversation state."""
        return f"Turns: {self.turn_count}, Messages: {len(self.history)}, Started: {self.created_at.strftime('%H:%M:%S')}"


# ─── APP ──────────────────────────────────────────────────────────────────────
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── HELPERS ──────────────────────────────────────────────────────────────────

def _retrying_call(fn, *args, **kwargs):
    """
    Tries fn with each key in the pool. Rotate on quota/auth/permission errors.
    This works for both standard functions and generators.
    """
    max_retries = len(API_KEYS)
    for attempt in range(max_retries):
        try:
            return fn(_get_client(), *args, **kwargs)
        except Exception as e:
            err = str(e).lower()
            # Catch various quota and permission related error strings
            is_quota = any(kw in err for kw in ("quota", "rate", "429", "resource_exhausted", "limit"))
            is_auth  = any(kw in err for kw in ("403", "invalid api key", "permission", "unauthorized"))
            
            if is_quota or is_auth:
                _rotate_key(reason=f"{'Quota' if is_quota else 'Auth'} Error: {str(e)[:100]}")
                if attempt == max_retries - 1:
                    raise Exception("⚠️ All 4 Gemini API keys are currently exhausted or blocked. Please try again in 5 minutes.")
            else:
                # Other errors (network, logic) should be raised immediately
                raise


def _generate_tts_sync(client: genai.Client, text: str) -> Optional[str]:
    """Generate TTS. Returns base64 PCM or None."""
    response = client.models.generate_content(
        model=TTS_MODEL,
        contents=text,
        config=types.GenerateContentConfig(response_modalities=["AUDIO"]),
    )
    for candidate in response.candidates:
        if candidate.content and candidate.content.parts:
            for part in candidate.content.parts:
                if part.inline_data:
                    return base64.b64encode(part.inline_data.data).decode("utf-8")
    return None


async def _generate_tts_async(text: str) -> Optional[str]:
    """
    Async TTS wrapper. Tries all keys.
    Returns None gracefully if all keys are quota-exhausted — 
    frontend will fall back to browser speech synthesis automatically.
    """
    loop = asyncio.get_event_loop()
    try:
        return await loop.run_in_executor(
            None,
            lambda: _retrying_call(_generate_tts_sync, text)
        )
    except Exception as e:
        print(f"[TTS Outage] All keys exhausted — using browser TTS fallback. Reason: {e}")
        return None


def _stream_text_with_memory(memory: ConversationMemory, text_model: str = TEXT_MODEL):
    """
    Stream Gemini text using full conversation history for context awareness.
    Yields complete sentences as they arrive.
    Returns the full response text for storage in memory.
    """
    max_restarts = len(API_KEYS)
    full_response = ""

    for restart_count in range(max_restarts):
        try:
            client = _get_client()
            buffer = ""
            contents = memory.get_contents()

            for chunk in client.models.generate_content_stream(
                model=text_model,
                config=types.GenerateContentConfig(system_instruction=PERSONA),
                contents=contents,
            ):
                if chunk.text:
                    buffer += chunk.text
                    parts = _SENT_RE.split(buffer)
                    for sentence in parts[:-1]:
                        s = sentence.strip()
                        if s:
                            full_response += s + " "
                            yield s
                    buffer = parts[-1]
            
            tail = buffer.strip()
            if tail:
                full_response += tail
                yield tail

            # Store the complete response in memory
            if full_response.strip():
                memory.add_model_message(full_response.strip())

            return

        except Exception as e:
            err = str(e).lower()
            if any(kw in err for kw in ("quota", "429", "rate", "limit", "resource_exhausted")):
                _rotate_key(f"Mid-stream quota failure: {str(e)[:50]}")
                if restart_count == max_restarts - 1:
                    raise Exception("⚠️ All API keys are exhausted. Response interrupted.")
                continue
            raise  # Unrelated error, bail out


# ─── ENDPOINTS ────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str


@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Multilingual audio transcription using Gemini.
    Handles code-switching (e.g. Urdu + English mixed in one sentence).
    Frontend records audio as WebM and POSTs it here.
    """
    try:
        audio_bytes = await file.read()
        mime = file.content_type or "audio/webm"

        def _do_transcribe(client: genai.Client) -> str:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[
                    types.Part.from_bytes(data=audio_bytes, mime_type=mime),
                    types.Part.from_text(text=(
                        "Transcribe this audio exactly as spoken. "
                        "The speaker may freely mix English and Urdu (common Pakistani code-switching). "
                        "Return ONLY the transcribed words — no labels, no explanations, no punctuation notes."
                    )),
                ],
            )
            return response.text.strip()

        loop = asyncio.get_event_loop()
        transcript = await loop.run_in_executor(
            None, lambda: _retrying_call(_do_transcribe)
        )
        print(f"[Transcribe] Result: {transcript[:100]}")
        return {"transcript": transcript}
    except Exception as e:
        print(f"[Transcribe] Error: {e}")
        return {"transcript": "", "error": str(e)}


@app.post("/chat")
async def chat_post(req: ChatRequest):
    """Legacy blocking endpoint — kept for testing. Use /ws/stream for production."""
    try:
        def _generate(client):
            return client.models.generate_content(
                model=TEXT_MODEL,
                config=types.GenerateContentConfig(system_instruction=PERSONA),
                contents=req.message,
            )
        response = _retrying_call(_generate)
        reply_text = response.text
        audio_b64 = await _generate_tts_async(reply_text)
        return {"reply": reply_text, "audioPCM": audio_b64}
    except Exception as e:
        return {"reply": f"Error: {e}", "audioPCM": None}


@app.websocket("/ws/stream")
async def stream_chat(ws: WebSocket, tts: bool = True, model: str = TEXT_MODEL):
    """
    Streaming WebSocket endpoint with conversation memory.

    Each WebSocket connection maintains its own conversation history,
    so Luna remembers everything said during the session.

    Query params:
      ?tts=true   (default) — use Gemini TTS audio per sentence
      ?tts=false  — text-only, frontend uses browser speech synthesis
      ?model=...  — optional text generation model override

    Protocol:
      Client  → ws.send_text(user_message)
      Server  → ws.send_json({ "sentence": str, "audioPCM": str|null, "done": false })
      Server  → ws.send_json({ "sentence": "", "audioPCM": null, "done": true })
    """
    await ws.accept()
    tts_enabled: bool = tts
    text_model: str = model

    # Create per-session memory
    memory = ConversationMemory()
    print(f"[WS /ws/stream] Client connected. TTS={tts_enabled}, Model={text_model}")

    try:
        while True:
            user_message = await ws.receive_text()
            print(f"[WS] Message: {user_message[:80]} | {memory.get_summary()}")

            # Store user message in conversation memory
            memory.add_user_message(user_message)

            loop = asyncio.get_event_loop()

            pending_tts: Optional[asyncio.Task] = None
            pending_sentence: Optional[str] = None

            # Stream with full conversation history
            sentences = await loop.run_in_executor(
                None, lambda: list(_stream_text_with_memory(memory, text_model))
            )

            for sentence in sentences:
                # Start TTS concurrently for this sentence (if enabled)
                tts_task = asyncio.create_task(_generate_tts_async(sentence)) if tts_enabled else None

                # Send previous sentence (with its resolved audio)
                if pending_sentence is not None:
                    audio_b64 = (await pending_tts) if pending_tts else None
                    await ws.send_json({
                        "sentence": pending_sentence,
                        "audioPCM": audio_b64,
                        "done": False,
                    })

                pending_tts = tts_task
                pending_sentence = sentence

            # Send last sentence
            if pending_sentence is not None:
                audio_b64 = (await pending_tts) if pending_tts else None
                await ws.send_json({
                    "sentence": pending_sentence,
                    "audioPCM": audio_b64,
                    "done": False,
                })

            # Signal end of response
            await ws.send_json({"sentence": "", "audioPCM": None, "done": True})

    except WebSocketDisconnect:
        print(f"[WS /ws/stream] Client disconnected after {memory.turn_count} turns")
    except Exception as e:
        print(f"[WS /ws/stream] Error: {e}")
        try:
            await ws.send_json({"error": str(e), "done": True})
            await ws.close()
        except Exception:
            pass
