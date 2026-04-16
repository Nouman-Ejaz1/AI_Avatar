# 🌟 Iris AI: Multilingual 3D assistant

Iris is a premium, high-performance 3D talking AI assistant. Built with **React** and **FastAPI**, it blends real-time 3D rendering with the power of **Google Gemini** to create an immersive, human-like conversational experience.

Iris is designed to understand you naturally—whether you speak Urdu, English, or a mix of both (code-switching). She hears you, understands the context of your previous questions, and responds with natural lip-synced speech and expressive animations.

---

## 🎓 Student's Guide: How IRIS Works

If you are a computer science student or new to AI, here is the "big picture" of how we built Iris and why she feels so real.

### 🎭 What is "TalkingHead"? (The Puppet Master)
In a normal 3D game, an artist has to animate every single movement. For an AI that can say *anything*, we can't do that. Instead, we use a tool called **TalkingHead**.
*   **Think of it like a Digital Puppet**: TalkingHead is the logic that controls the avatar's face.
*   **Why we use it**: It automatically "listens" to the audio we generate and moves the avatar's lips to match the sounds (this is called *Lip-Syncing*). It also handles "idle" movements like blinking and breathing so the character doesn't look like a statue.

### 🧠 The Core Logic Flow
1.  **Recording (The Ears)**: When you click the mic, your browser records your voice as a small audio file.
2.  **Transcription (The Translator)**: We send that file to **Gemini 2.0 Flash**. It's smart enough to "read" your voice and turn it into text, even if you are mixing Urdu and English!
3.  **LLM Processing (The Brain)**: The text goes to the **Gemini 3 Flash** model. It looks at your question *and* your previous chat history to decide what to say back.
4.  **Speech Synthesis (The Voice)**: The brain's text response is turned back into audio.
5.  **Animation (The Face)**: This is where **TalkingHead** shines. It takes that audio, calculates the mouth shapes (visemes), and moves the 3D model's face in real-time.

---

## ✨ Key Features

### 🎙️ Native Multilingual Understanding
Iris uses Gemini's multimodal capabilities to understand **code-switching** perfectly. Speak naturally in Urdu/English mixed, and the AI handles the rest.

### 🌔 Premium "Jarvis" Interface
Switch between a sleek **Dark Mode** with vibrant orange accents and a sophisticated, glassmorphic **Light Mode** designed for clarity and depth.

### 🛑 Real-time Interruption
The **Stop/Cancel** feature instantly kills the audio stream, stops the avatar's mouth, and resets the brain for your next command.

### 🔑 High-Availability Key Pool
The backend features an automatic **4-key API rotation**. If one Gemini key hits a quota limit, the system rotates to the next one seamlessly.

---

## 🛠️ Tech Stack

### Frontend
- **React 18** + **Vite** (The engine that runs the UI)
- **Three.js** + **TalkingHead.js** (The 3D world and avatar logic)
- **Framer Motion** (The smooth "premium" animations you see)

### Backend
- **FastAPI** (The lightning-fast Python server)
- **Google GenAI SDK** (Connection to the Gemini "Brains")
- **WebSockets** (Real-time connection so Iris can talk back instantly)

---

## 🚀 How to Run Iris

### 1. Prerequisites
- **Python 3.10+** & **Node.js 18+**
- Gemini API Keys ([Get them here for free](https://aistudio.google.com/))

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
# Put your API key in the .env file
echo "GEMINI_API_KEY=your_key_here" > .env
uvicorn main:app --port 8000 --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📜 License
This project is licensed under the MIT License.
