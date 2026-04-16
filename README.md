# 🌟 Luna AI: The Multimodal 3D Assistant

Luna is a next-generation, high-performance 3D talking AI assistant. Built with **React** and **FastAPI**, it blends real-time 3D rendering with the power of **Google Gemini** to create an immersive, human-like conversational experience.

Whether you're speaking Urdu, English, or a mix of both, Luna hears you, understands you, and responds with natural lip-synced speech and expressive animations.

---

## ✨ Key Features

### 🎙️ Native Multilingual Understanding
Forget basic speech recognition. Luna uses Gemini's multimodal capabilities to understand **code-switching** (mixing English and Urdu) perfectly. Just hold the mic, speak naturally, and let the AI handle the rest.

### 🌔 Dynamic Theme Engine
Switch between a high-tech **Dark Mode** with neon orange accents and a sophisticated, glassmorphic **Light Mode** designed for clarity and elegance.

### 🛑 Real-time Interruption
Need to ask something else? Interrupt Luna at any time. The **Stop/Cancel** feature instantly kills the audio stream, stops the avatar's mouth, and resets the interface for your next command.

### 🧠 Smart Memory & Logic
Luna remembers your conversation history. Powered by **Gemini 2.0 Flash**, she connects the dots between your previous questions to provide contextually aware answers.

### 🔑 High-Availability Key Pool
The backend features an automatic **4-key API rotation** system. If one Gemini API key hits a quota limit, the system rotates to the next one seamlessly—no interruptions for the user.

---

## 🛠️ Tech Stack

### Frontend
- **React 18** + **Vite** (Ultra-fast development and bundling)
- **Three.js** + **TalkingHead.js** (3D Avatar rendering & Lip-syncing)
- **Framer Motion** (Premium UI animations and transitions)
- **Lucide React** (Clean, consistent iconography)

### Backend
- **FastAPI** (High-performance Python web framework)
- **Google GenAI SDK** (Gemini 2.0 & 3.0 Flash integration)
- **WebSockets** (Full-duplex real-time streaming)
- **Python-Multipart** (Binary audio processing for transcription)

---

## 🚀 Getting Started

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- One or more **Gemini API Keys** ([Get them here](https://aistudio.google.com/))

### 2. Backend Setup
```bash
cd backend
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file
echo "GEMINI_API_KEY=your_key_here" > .env

# Start the server
uvicorn main:app --port 8000 --reload
```

### 3. Frontend Setup
```bash
cd frontend
# Install dependencies
npm install

# Run the development server
npm run dev
```
Open your browser to `http://localhost:5173` and start talking!

---

## 📖 How it Works

1.  **Voice Input**: Your voice is recorded as a high-quality WebM buffer and sent to the `/transcribe` endpoint.
2.  **Multimodal STT**: Gemini 2.0 Flash "listens" to the audio directly and returns a perfect transcript, even for mixed-language speech.
3.  **Brain**: The transcript goes to the `/ws/stream` WebSocket. Luna's brain (Gemini 3 Flash) processes the conversation history and generates a response.
4.  **Speech & Sync**: The text is converted to audio (either via Gemini TTS or Browser Fallback). The `TalkingHead` engine analyzes the audio and moves the avatar's lips in real-time using morph targets.

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/ai_avatar/issues).

---

## 📜 License
This project is licensed under the MIT License.

