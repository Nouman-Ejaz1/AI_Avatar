# Meet Iris: Your Multilingual 3D AI companion 🌟

Iris isn't just another chatbot. She's a high-performance, real-time 3D assistant designed to feel human. Built with **React** and **FastAPI**, Iris uses the cutting-edge power of **Google Gemini** to bridge the gap between humans and computers.

The magic of Iris is that she truly *listens*. Whether you're speaking Urdu, English, or a natural mix of both, she understands the context, remembers your previous conversations, and responds with real-world emotions and perfectly synced animations.

---

## 🎓 How IRIS Works (The Human Connection)

If you're a student or new to the world of AI, you might wonder: *"How does a bunch of code actually talk and express emotions?"* Here is the big picture.

### 🎭 The Puppet Master (TalkingHead)
In traditional 3D, animations are pre-made. But Iris is dynamic! We use a tool called **TalkingHead** to act as a **Puppet Master**.
*   **Real-time Emotion**: Instead of playing a video, Iris's face moves as she thinks.
*   **Lip Syncing**: She analyzes the actual sounds of her voice to decide how her mouth should move. This makes her feel alive, not just a static model.

### 🧠 The Core Logic: How She Thinks
1.  **She Hears You (Recording)**: When you speak, Iris records your voice. It’s not just a file; it’s the starts of a conversation.
2.  **She Translates (Gemini 2.0)**: She uses a specialized "Multi-modal" model. This means she doesn't just read text; she can *understand audio*. This is how she can translate mixed Urdu/English (code-switching) perfectly.
3.  **She Connects the Dots (The Brain)**: Iris uses **Gemini 3 Flash** to look at your current question and everything you've said before. This gives her a "memory."
4.  **She Speaks (Voice)**: Her thoughts are turned into a voice that sounds natural, not robotic.
5.  **She Moves (Animation)**: **TalkingHead** takes that voice and instantly tells her face how to react, blink, and move her lips.

---

## ✨ What Makes Her Special

### 🎙️ Native Code-Switching
Forget the limits of standard Siri or Alexa. Iris understands the way real people talk in Pakistan—mixing languages naturally without skipping a beat.

### 🌔 Premium High-Tech Design
Her interface is inspired by high-end sci-fi. A sleek **Dark Mode** for deep focus and a crisp, glassmorphic **Light Mode** that feels modern and premium.

### 🛑 Real-time Control
You can interrupt her at any time. If you start talking again, she instantly stops and resets her internal "mouth" to listen to you once more.

---

## 🛠️ The Build Stack

### 💅 The Body (Frontend)
- **React 18** (The structure)
- **Three.js** (The 3D space)
- **Framer Motion** (The smooth UI movement)

### ⚙️ The Engine (Backend)
- **FastAPI** (The lightning-fast server)
- **GenAI SDK** (Access to the Gemini Brains)
- **4-Key Rotation** (A smart safety system that swaps API keys automatically so she never goes "offline.")

---

## 🚀 Bring Iris to Life

### 1. Requirements
- **Python 3.10+** & **Node.js 18+**
- Gemini API Keys ([Get one for free at AI Studio](https://aistudio.google.com/))

### 2. Startup
```bash
# Get the backend running
cd backend
python -m venv venv
# Enable venv, then:
pip install -r requirements.txt
python -m uvicorn main:app --port 8000 --reload

# Get the frontend running
cd frontend
npm install
npm run dev
```

---

## 📜 License
This project is licensed under the MIT License.
