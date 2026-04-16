import { useState, useRef, useEffect, useCallback } from 'react';
import { TalkingHead } from "./talkinghead.mjs";
import { 
  MessageSquare, 
  Settings, 
  Mic, 
  Send, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  X,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const WS_BASE = "ws://127.0.0.1:8000/ws/stream";

// Available browser voices
let _cachedVoices = [];
window.speechSynthesis.onvoiceschanged = () => { _cachedVoices = window.speechSynthesis.getVoices(); };
const _activeUtterances = [];

function decodePCMtoAudioBuffer(base64Data, audioCtx) {
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;
  const buf = audioCtx.createBuffer(1, float32.length, 24000);
  buf.getChannelData(0).set(float32);
  return buf;
}

function speakBrowserVoice(head, rawText, voiceURI = null) {
  const text = rawText.replace(/[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff]/g, '');
  let voices = window.speechSynthesis.getVoices();
  if (!voices.length) voices = _cachedVoices;
  let chosen = voiceURI ? voices.find(v => v.voiceURI === voiceURI) : null;
  if (!chosen) {
    const femalePrefer = ["Microsoft Zira", "Microsoft Maria", "Microsoft Linda", "Samantha", "Victoria", "Google UK English Female", "Microsoft Hazel", "English (United States)-Female", "Google US English Female"];
    for (const pref of femalePrefer) {
      chosen = voices.find(v => v.name.includes(pref));
      if (chosen) break;
    }
  }
  const excludes = ["David", "Mark", "Richard", "George", "Ravi", "James", "Kevin", "Michael"];
  if (!chosen) chosen = voices.find(v => (v.name.includes("Female") || v.name.includes("Woman") || v.name.includes("Girl")) && !excludes.some(n => v.name.includes(n)));
  if (!chosen) chosen = voices.find(v => v.lang.startsWith('en') && !excludes.some(n => v.name.includes(n)));
  chosen = chosen || voices[0];

  return new Promise((resolve) => {
    const utt = new SpeechSynthesisUtterance(text);
    if (chosen) utt.voice = chosen;
    else utt.lang = 'en-US';
    utt.rate = 1.1; 
    utt.pitch = 1.05;
    _activeUtterances.push(utt);
    utt.onstart = () => {
      try { head?.stopSpeaking(); } catch {}
      const estMs = Math.max(900, text.length * 60); 
      try {
        if (head?.audioCtx) {
          if (head.audioCtx.state !== 'running') head.audioCtx.resume();
          const silentBuf = head.audioCtx.createBuffer(1, Math.ceil((estMs / 1000) * 24000), 24000);
          head.speakAudio({ audio: silentBuf, words: [text], wtimes: [0], wdurations: [estMs] }, null, null);
        }
      } catch(e) { console.warn('Avatar animation failed:', e); }
    };
    utt.onend = () => {
      const idx = _activeUtterances.indexOf(utt);
      if (idx > -1) _activeUtterances.splice(idx, 1);
      resolve();
    };
    utt.onerror = () => {
      const idx = _activeUtterances.indexOf(utt);
      if (idx > -1) _activeUtterances.splice(idx, 1);
      resolve();
    };
    window.speechSynthesis.speak(utt);
  });
}

// Ambient Dynamic Background Component
const AmbientBlobs = ({ mode }) => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
    <motion.div
      animate={{ 
        x: [0, 80, -40, 0], 
        y: [0, -60, 40, 0], 
        scale: [1, 1.2, 0.9, 1],
        rotate: [0, 45, -45, 0]
      }}
      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      style={{ 
        position: "absolute", 
        top: "-10%", 
        left: "5%", 
        width: "70vw", 
        height: "70vh", 
        background: mode === 'dark' ? "radial-gradient(circle, rgba(249, 115, 22, 0.12) 0%, transparent 70%)" : "radial-gradient(circle, rgba(234, 88, 12, 0.08) 0%, transparent 70%)", 
        filter: "blur(80px)", 
        borderRadius: "50%" 
      }}
    />
    <motion.div
      animate={{ 
        x: [0, -60, 60, 0], 
        y: [0, 40, -60, 0], 
        scale: [1, 0.85, 1.1, 1],
        rotate: [0, -30, 30, 0]
      }}
      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      style={{ 
        position: "absolute", 
        bottom: "-5%", 
        right: "5%", 
        width: "60vw", 
        height: "60vh", 
        background: mode === 'dark' ? "radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)" : "radial-gradient(circle, rgba(124, 58, 237, 0.05) 0%, transparent 70%)", 
        filter: "blur(100px)", 
        borderRadius: "50%" 
      }}
    />
  </div>
);

export default function App() {
  const avatarRef    = useRef(null);
  const headRef      = useRef(null);
  const wsRef        = useRef(null);
  const audioQueue   = useRef([]);
  const isPlaying    = useRef(false);
  const isStreaming  = useRef(false);
  const scrollRef    = useRef(null);

  const [loading,       setLoading]       = useState(true);
  const [avatarStatus,  setAvatarStatus]  = useState("Initializing engine…");
  const [chatInput,     setChatInput]     = useState("");
  const [isSending,     setIsSending]     = useState(false);
  const [isTesting,     setIsTesting]     = useState(false);
  const [isListening,   setIsListening]   = useState(false);
  const [sttLang,       setSttLang]       = useState("auto");
  const [messages,      setMessages]      = useState([
    { role: 'user', text: "Iris, status report. Feed highlights and today's agenda?" },
    { role: 'ai', text: "On it. Trending: GitHub just moved **Copilot Workspace** out of technical preview, and **Mistral-7B v0.3** was just released with new tool-calling features. Your desk: 10:30 AM **Sprint Review with Ali and Sarah**, 1:00 PM lunch with **Ahmad @ Tuscany**, and your check-in for **Flight PK301** to Dubai is at 4:30 PM. I've pre-booked your ride for 3:45." },
    { role: 'user', text: "Perfect. Add a note for the lunch with Ahmad to discuss the final Q3 server budget." },
    { role: 'ai', text: "Handled. I've appended 'Q3 Server Budget Discussion' to the lunch event. I'll give you a quick nudge at 12:55 PM so you have the numbers ready. Anything else before you head out?" }
  ]);
  const [wsStatus,      setWsStatus]      = useState("disconnected");
  const [voiceMode,     setVoiceMode]     = useState("browser");
  const [textModel,     setTextModel]     = useState("gemini-3-flash-preview");
  const [showSettings,  setShowSettings]  = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [themeMode,     setThemeMode]     = useState("dark");
  const [sttModel,      setSttModel]      = useState("gemini-2.0-flash");
  
  const [availableVoices,   setAvailableVoices]   = useState([]);
  const [selectedVoiceURI,  setSelectedVoiceURI]  = useState("");

  const voiceModeRef    = useRef("browser");
  const selectedVoiceRef = useRef("");
  const textModelRef    = useRef("gemini-3-flash-preview");
  const sttLangRef      = useRef("auto");
  const sttModelRef    = useRef("gemini-2.0-flash");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef  = useRef([]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    let alive = true;
    (async () => {
      await new Promise(r => setTimeout(r, 150));
      if (!alive || headRef.current) return;
      try {
        if (avatarRef.current) avatarRef.current.innerHTML = "";
        
        const head = new TalkingHead(avatarRef.current, {
          cameraView: "upper", // HALF BODY as requested
          cameraDistance: 0.1,
          ttsEndpoint: "",
          lipsyncLang: "en",
          lipsyncModules: ["en"],
          pcmSampleRate: 24000,
          lightAmbientIntensity: 1.0,  // Softened ambient
          lightDirectIntensity: themeMode === 'dark' ? 4.5 : 5.8,   // Stronger light for white-on-white environments
          lightDirectColor: themeMode === 'dark' ? 0x88ccff : 0xffccaa,  // Cyan for dark, Warm-white for light
          lightDirectPhi: 0.5,         // Angle for Better rim light
          lightDirectTheta: 2.5
        });

        await head.showAvatar({ url: "/brunette.glb", body: "F", avatarMood: "happy", lipsyncLang: "en" });
        if (alive) {
          headRef.current = head;
          setAvatarStatus("Avatar ready ✅");
          setLoading(false);
        }
      } catch (e) {
        if (alive) {
          setAvatarStatus(`Load error: ${e?.message || e}`);
          setLoading(false);
        }
      }
    })();
    return () => { alive = false; headRef.current = null; };
  }, []);

  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
  useEffect(() => { textModelRef.current = textModel; }, [textModel]);
  useEffect(() => { selectedVoiceRef.current = selectedVoiceURI; }, [selectedVoiceURI]);
  useEffect(() => { sttLangRef.current = sttLang; }, [sttLang]);
  useEffect(() => { sttModelRef.current = sttModel; }, [sttModel]);

  useEffect(() => {
    const updateVoices = () => {
      const v = window.speechSynthesis.getVoices();
      const filtered = v.filter(v => v.lang.startsWith('en'));
      setAvailableVoices(filtered);
      if (!selectedVoiceRef.current && filtered.length > 0) {
        const femalePrefer = ["Zira", "Samantha", "Victoria", "Female"];
        const best = filtered.find(v => femalePrefer.some(p => v.name.includes(p))) || filtered[0];
        if (best) setSelectedVoiceURI(best.voiceURI);
      }
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, []);

  const connectWS = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= 1) return;
    const ws = new WebSocket(`${WS_BASE}?tts=${voiceModeRef.current === "gemini" ? "true" : "false"}&model=${textModelRef.current}`);
    wsRef.current = ws;
    setWsStatus("connecting");
    ws.onopen = () => setWsStatus("connected");
    ws.onclose = () => { setWsStatus("disconnected"); setTimeout(connectWS, 2000); };
    ws.onerror = () => setWsStatus("error");
    ws.onmessage = async (event) => {
      let data; try { data = JSON.parse(event.data); } catch { return; }
      if (data.error) {
        setMessages(prev => [...prev, { role: "assistant", text: `⚠️ ${data.error}` }]);
        setIsSending(false); isStreaming.current = false; return;
      }
      if (data.sentence) {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant" && last.streaming) {
            return [...prev.slice(0, -1), { ...last, text: last.text + " " + data.sentence }];
          }
          return [...prev, { role: "assistant", text: data.sentence, streaming: true }];
        });
        if (headRef.current && data.sentence) {
          if (voiceModeRef.current === "gemini" && data.audioPCM) {
            try {
              const audioCtx = headRef.current.audioCtx;
              if (audioCtx.state !== "running") await audioCtx.resume();
              const audioBuffer = decodePCMtoAudioBuffer(data.audioPCM, audioCtx);
              audioQueue.current.push({ text: data.sentence, audioBuffer, mode: "gemini" });
            } catch (e) { console.error(e); }
          } else {
            audioQueue.current.push({ text: data.sentence, audioBuffer: null, mode: "browser" });
          }
          if (!isPlaying.current) drainAudioQueue();
        }
      }
      if (data.done) {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.streaming) return [...prev.slice(0, -1), { ...last, streaming: false }];
          return prev;
        });
        setIsSending(false); isStreaming.current = false; setAvatarStatus("Luna ready 🌟");
      }
    };
  }, []);

  useEffect(() => { connectWS(); return () => { wsRef.current?.close(); }; }, [connectWS]);

  const drainAudioQueue = useCallback(async () => {
    if (isPlaying.current) return;
    const chunk = audioQueue.current.shift();
    if (!chunk) return;
    isPlaying.current = true;
    const head = headRef.current;
    if (!head) { isPlaying.current = false; return; }
    try {
      if (chunk.mode === "gemini" && chunk.audioBuffer) {
        const durationMs = (chunk.audioBuffer.length / 24000) * 1000;
        await new Promise((resolve) => {
          head.speakAudio({ audio: chunk.audioBuffer, words: [chunk.text], wtimes: [0], wdurations: [durationMs] }, null, null);
          setTimeout(resolve, durationMs + 50);
        });
      } else {
        // FIXED: Properly await the browser voice promise so mouth animation
        // stays in sync. Previously this wasn't awaited, causing desync.
        await speakBrowserVoice(head, chunk.text, selectedVoiceRef.current);
      }
    } catch (e) { console.error(e); }
    // Always drain next chunk after current finishes
    isPlaying.current = false;
    if (audioQueue.current.length > 0) drainAudioQueue();
  }, []);

  const sendMessage = useCallback((rawText) => {
    const text = rawText.trim();
    if (!text || isSending) return;
    if (headRef.current?.audioCtx) headRef.current.audioCtx.resume();
    window.speechSynthesis.cancel();
    audioQueue.current = [];
    isPlaying.current = false;
    try { headRef.current?.stopSpeaking?.(); } catch {}
    setIsSending(true); isStreaming.current = true;
    setMessages(prev => [...prev, { role: "user", text }]);
    setChatInput(""); setAvatarStatus("Luna is thinking… 💭");
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) { connectWS(); return; }
    ws.send(text);
  }, [isSending, connectWS]);

  const applySettings = useCallback((newVoiceMode, newTextModel) => {
    if (newVoiceMode) { setVoiceMode(newVoiceMode); voiceModeRef.current = newVoiceMode; }
    if (newTextModel) { setTextModel(newTextModel); textModelRef.current = newTextModel; }
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null; }
    setTimeout(connectWS, 200); 
  }, [connectWS]);

  const stopEverything = useCallback(() => {
    // 1. Kill all audio immediately
    window.speechSynthesis.cancel();
    audioQueue.current = [];
    isPlaying.current = false;
    isStreaming.current = false;
    try { headRef.current?.stopSpeaking?.(); } catch {}
    // 2. Close WebSocket to kill the backend stream, then reconnect
    if (wsRef.current) {
      wsRef.current.onclose = null; // prevent the auto-reconnect handler from firing
      wsRef.current.close();
      wsRef.current = null;
    }
    // 3. Mark the last streaming message as cancelled
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last && last.streaming) {
        return [...prev.slice(0, -1), { ...last, streaming: false, cancelled: true }];
      }
      return prev;
    });
    // 4. Reset UI
    setIsSending(false);
    setAvatarStatus("Luna ready 🌟");
    // 5. Reconnect WebSocket after short pause
    setTimeout(connectWS, 300);
  }, [connectWS]);

  const startListening = useCallback(async () => {
    // ── AUTO MODE: record audio → Gemini transcribes (handles Urdu+English) ──
    if (sttLangRef.current === "auto") {
      // If already recording, stop and transcribe
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        audioChunksRef.current = [];
        recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
        recorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          setIsListening(false);
          setAvatarStatus("Transcribing… 🧠");
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("file", blob, "recording.webm");
          formData.append("model", sttModelRef.current);
          try {
            const res = await fetch("http://127.0.0.1:8000/transcribe", { method: "POST", body: formData });
            const data = await res.json();
            if (data.transcript && data.transcript.trim()) {
              sendMessage(data.transcript.trim());
            } else {
              setAvatarStatus("Couldn't hear that — try again");
              setTimeout(() => setAvatarStatus("Iris ready"), 2000);
            }
          } catch (err) {
            console.error("Transcription failed:", err);
            setAvatarStatus("Transcription error — try again");
            setTimeout(() => setAvatarStatus("Iris ready"), 2000);
          }
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsListening(true);
        if (headRef.current?.audioCtx) headRef.current.audioCtx.resume();
        window.speechSynthesis.cancel();
        setAvatarStatus("🎤 Recording… tap mic again to send");
      } catch (e) {
        console.error("Microphone access denied:", e);
        setAvatarStatus("Mic access denied");
      }
      return;
    }

    // ── STANDARD MODE: browser Web Speech API (fixed language) ──
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (headRef.current?.audioCtx) headRef.current.audioCtx.resume();
    window.speechSynthesis.cancel();
    const recognition = new SR();
    recognition.lang = sttLangRef.current;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setIsListening(true);
    recognition.onresult = e => { setIsListening(false); sendMessage(e.results[0][0].transcript); };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }, [sendMessage]);

  const theme = {
    bg: themeMode === 'dark' ? "#050508" : "#f8fafc",
    sidebar: themeMode === 'dark' ? "rgba(12, 12, 22, 0.6)" : "rgba(255, 255, 255, 0.7)",
    border: themeMode === 'dark' ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
    accent: themeMode === 'dark' ? "#f97316" : "#ea580c",
    sub: themeMode === 'dark' ? "rgba(30, 30, 46, 0.6)" : "rgba(241, 245, 249, 0.8)",
    text: themeMode === 'dark' ? "#f1f5f9" : "#0f172a",
    muted: themeMode === 'dark' ? "#94a3b8" : "#64748b"
  };

  return (
    <div style={{ 
      display: 'flex', 
      width: '100%',
      height: '100%',
      maxWidth: '100vw',
      maxHeight: '100vh',
      background: themeMode === 'dark' 
        ? `radial-gradient(circle at 70% 30%, #1a1a2e 0%, ${theme.bg} 100%)`
        : `radial-gradient(circle at 70% 30%, #e2e8f0 0%, ${theme.bg} 100%)`, 
      color: theme.text, 
      fontFamily: "'Inter', sans-serif", 
      overflow: "hidden",
      position: "relative",
      transition: "background 0.5s ease"
    }}>
      
      {/* AMBIENT BACKGROUND LAYERS */}
      <AmbientBlobs theme={theme} mode={themeMode} />
      
      {/* GRID OVERLAY BACKGROUND */}
      <div style={{ 
        position: "absolute", 
        inset: 0, 
        backgroundImage: themeMode === 'dark'
          ? `linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)`
          : `linear-gradient(rgba(0, 0, 0, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.06) 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
        pointerEvents: "none",
        zIndex: 1
      }} />

      {/* LEFT SIDEBAR: CHAT */}
      <AnimatePresence>
        {isChatVisible && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 420, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            style={{ 
              background: theme.sidebar, 
              backdropFilter: "blur(32px) saturate(180%)", 
              borderRight: `1px solid ${theme.border}`,
              display: "flex",
              flexDirection: "column",
              height: "100%",
              position: "relative",
              zIndex: 10,
              boxShadow: themeMode === 'dark' 
                ? "10px 0 30px rgba(0,0,0,0.6)" 
                : "10px 0 40px rgba(0,0,0,0.08)",
              // Added inner glow for glass depth
              insetShadow: themeMode === 'dark'
                ? "inset 0 0 40px rgba(255,255,255,0.02)"
                : "inset 0 0 40px rgba(255,255,255,0.8)"
            }}
          >
            {/* Sidebar Header */}
            <div style={{ padding: "24px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: theme.accent, letterSpacing: "1px" }}>IRIS</h2>
                <div style={{ fontSize: "10px", color: theme.muted, display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: wsStatus === 'connected' ? "#22c55e" : "#ef4444", boxShadow: wsStatus === 'connected' ? "0 0 8px #22c55e" : "none" }} />
                  {wsStatus.toUpperCase()} SYSTEM
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setShowSettings(true)} style={{ background: theme.sub, border: `1px solid ${theme.border}`, borderRadius: "8px", padding: "8px", color: theme.text, cursor: "pointer", transition: "all 0.2s" }}>
                  <Settings size={18} />
                </button>
                <button onClick={() => setIsChatVisible(false)} style={{ background: theme.sub, border: `1px solid ${theme.border}`, borderRadius: "8px", padding: "8px", color: theme.text, cursor: "pointer", transition: "all 0.2s" }}>
                  <ChevronLeft size={18} />
                </button>
              </div>
            </div>

            {/* Message Feed */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", marginTop: "40px", color: theme.muted }}>
                  <MessageSquare size={40} style={{ opacity: 0.1, marginBottom: "16px" }} />
                  <p style={{ fontSize: "12px", opacity: 0.6 }}>INITIALIZING NEURAL INTERFACE...</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={{ 
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: "90%",
                  padding: "14px 18px",
                  borderRadius: msg.role === 'user' ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: msg.role === 'user' ? theme.accent : theme.sub,
                  border: `1px solid ${theme.border}`,
                  fontSize: "14px",
                  lineHeight: 1.6,
                  boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
                }}>
                  {msg.text}
                  {msg.streaming && <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }}> ▌</motion.span>}
                  {msg.cancelled && <span style={{ fontSize: "10px", color: "#ef4444", display: "block", marginTop: "6px", opacity: 0.7, letterSpacing: "1px" }}>⬛ STOPPED</span>}
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div style={{ padding: "20px", borderTop: `1px solid ${theme.border}`, background: themeMode === 'dark' ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.3)" }}>
              <div style={{ display: "flex", gap: "12px", background: themeMode === 'dark' ? "#060610" : "#ffffff", padding: "10px 14px", borderRadius: "14px", border: `2px solid ${theme.border}`, boxShadow: themeMode === 'dark' ? "none" : "0 4px 12px rgba(0,0,0,0.04)", transition: "all 0.3s" }}>
                <input 
                  type="text" 
                  value={chatInput} 
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage(chatInput)}
                  placeholder="COMMAND INPUT..."
                  style={{ flex: 1, background: "none", border: "none", color: theme.text, outline: "none", fontSize: "13px", letterSpacing: "1px" }}
                />
                {isSending ? (
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={stopEverything}
                    title="Stop Luna"
                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center" }}
                  >
                    <Square size={18} fill="#ef4444" />
                  </motion.button>
                ) : (
                  <button onClick={() => sendMessage(chatInput)} disabled={!chatInput.trim()} style={{ background: "none", border: "none", color: theme.accent, cursor: "pointer", display: "flex", alignItems: "center" }}>
                    <Send size={18} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RIGHT STAGE: AVATAR */}
      <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", zIndex: 1 }}>
        
        {/* Toggle to show chat */}
        {!isChatVisible && (
          <button 
            onClick={() => setIsChatVisible(true)}
            style={{ 
              position: "absolute", 
              top: "32px", 
              left: "32px", 
              background: theme.sidebar, 
              backdropFilter: "blur(20px)", 
              padding: "12px 20px", 
              borderRadius: "12px", 
              border: `1px solid ${theme.border}`, 
              color: theme.text, 
              cursor: "pointer", 
              display: "flex", 
              alignItems: "center", 
              gap: "10px", 
              zIndex: 20, 
              boxShadow: themeMode === 'dark' ? "0 10px 20px rgba(0,0,0,0.3)" : "0 10px 20px rgba(0,0,0,0.06)",
              fontWeight: 700,
              fontSize: "12px",
              letterSpacing: "1px",
              transition: "all 0.2s"
            }}
          >
            <ChevronRight size={20} color={theme.accent} />
            <span>LINK CHAT</span>
          </button>
        )}

        {/* 3D Engine Container */}
        <div style={{ 
          position: "relative", 
          width: isChatVisible ? "calc(100% - 40px)" : "100%", 
          height: "100%", 
          transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
          {loading && (
            <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10 }}>
              <div style={{ width: "40px", height: "40px", border: `4px solid ${theme.border}`, borderTopColor: theme.accent, borderRadius: "50%" }} className="animate-spin" />
            </div>
          )}
          
          {/* PREDICTIVE TECH BACKGROUND */}
          <div style={{ 
            position: "absolute", 
            inset: 0, 
            backgroundImage: "url('/stage_bg.png')", 
            backgroundSize: "cover", 
            backgroundPosition: "center", 
            opacity: themeMode === 'dark' ? 0.4 : 0.7, 
            filter: "grayscale(20%) contrast(110%)",
            transition: "opacity 0.5s ease" 
          }} />
          
          {/* VIGNETTE OVERLAY */}
          <div style={{ 
            position: "absolute", 
            inset: 0, 
            background: themeMode === 'dark' 
              ? "radial-gradient(circle, transparent 20%, rgba(0,0,0,0.4) 100%)" 
              : "radial-gradient(circle, transparent 20%, rgba(255,255,255,0.3) 100%)",
            pointerEvents: "none"
          }} />

          <div ref={avatarRef} style={{ width: "100%", height: "100%", borderRadius: isChatVisible ? "32px" : "0", overflow: "hidden", position: "relative", zIndex: 2 }} />
          
          {/* Floating Status HUD Overlay (Centered below character) */}
          <div style={{ position: "absolute", bottom: "15%", width: "100%", display: "flex", justifyContent: "center", pointerEvents: "none" }}>
            <motion.div 
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{ repeat: Infinity, duration: 3 }}
              style={{ 
                padding: "10px 20px", 
                borderRadius: "30px", 
                background: themeMode === 'dark' ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.9)", 
                backdropFilter: "blur(12px)", 
                border: `1px solid ${theme.border}`, 
                fontSize: "10px", 
                fontWeight: 700,
                color: theme.muted,
                letterSpacing: "2px",
                textTransform: "uppercase"
              }}
            >
              {avatarStatus}
            </motion.div>
          </div>
        </div>

        {/* FLOATING STOP BUTTON — appears above mic when Luna is responding */}
        <AnimatePresence>
          {isSending && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: 10 }}
              transition={{ duration: 0.2 }}
              style={{ position: "absolute", bottom: "140px", right: "48px", zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              <motion.button
                whileHover={{ scale: 1.12, boxShadow: "0 0 30px rgba(239,68,68,0.6)" }}
                whileTap={{ scale: 0.88 }}
                onClick={stopEverything}
                title="Stop Luna"
                style={{
                  width: "58px",
                  height: "58px",
                  borderRadius: "50%",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "2px solid #ef4444",
                  color: "#ef4444",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  boxShadow: "0 0 18px rgba(239, 68, 68, 0.25)",
                  backdropFilter: "blur(10px)"
                }}
              >
                <Square size={22} fill="#ef4444" />
              </motion.button>
              <span style={{ color: "#ef4444", fontSize: "9px", fontWeight: 800, letterSpacing: "2px", marginTop: "7px", textTransform: "uppercase" }}>STOP</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FLOATING MIC BUTTON WITH PULSE EFFECT */}
        <div style={{ position: "absolute", bottom: "48px", right: "48px", zIndex: 50 }}>
          <AnimatePresence>
            {isListening && (
              <motion.div 
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 2.2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                style={{ 
                  position: "absolute", 
                  inset: 0, 
                  background: theme.accent, 
                  borderRadius: "50%", 
                  zIndex: -1 
                }}
              />
            )}
          </AnimatePresence>
          <motion.button 
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={startListening} 
            disabled={(isListening && sttLangRef.current !== "auto") || isSending || loading}
            style={{ 
              width: "58px", 
              height: "58px", 
              borderRadius: "50%", 
              background: isListening 
                ? (sttLang === "auto" ? "#f97316" : "#ef4444")  
                : theme.accent, 
              border: `2px solid rgba(255,255,255,0.12)`, 
              color: "white", 
              cursor: (isListening && sttLang !== "auto") || isSending || loading ? "not-allowed" : "pointer", 
              display: "flex", 
              justifyContent: "center", 
              alignItems: "center",
              boxShadow: isListening 
                ? (sttLang === "auto" ? "0 0 25px rgba(249, 115, 22, 0.5)" : "0 0 25px rgba(239, 68, 68, 0.45)")
                : "0 8px 24px rgba(0,0,0,0.3)",
              transition: "background 0.3s, box-shadow 0.3s"
            }}
          >
            {isListening && sttLang === "auto"
              ? <Square size={20} fill="white" />  
              : <Mic size={24} />}
          </motion.button>
        </div>
      </div>

      {/* SETTINGS OVERLAY */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", justifyContent: "center", alignItems: "center", background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              style={{ width: "420px", background: themeMode === 'dark' ? "#0a0a14" : "#ffffff", borderRadius: "32px", border: `1px solid ${theme.border}`, padding: "40px", position: "relative", boxShadow: "0 25px 50px rgba(0,0,0,0.5)", transition: "background 0.3s" }}
            >
              <button onClick={() => setShowSettings(false)} style={{ position: "absolute", top: "24px", right: "24px", background: themeMode === 'dark' ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", border: "none", borderRadius: "50%", width: "32px", height: "32px", color: theme.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={18} />
              </button>
              
              <h3 style={{ margin: "0 0 4px", fontSize: "1.4rem", fontWeight: 700, color: theme.accent, letterSpacing: "1px" }}>Iris</h3>
              <p style={{ margin: "0 0 28px", fontSize: "11px", color: theme.muted, letterSpacing: "1.5px", textTransform: "uppercase" }}>System Settings</p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
                <div>
                  <p style={{ margin: "0 0 12px", fontSize: "11px", color: theme.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.5px" }}>Voice Output</p>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={() => applySettings('browser', null)}
                      style={{ flex: 1, padding: "12px", borderRadius: "12px", background: voiceMode === 'browser' ? theme.accent : theme.sub, border: `1px solid ${voiceMode === 'browser' ? theme.accent : theme.border}`, color: voiceMode === 'browser' ? "white" : theme.text, fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                    >
                      Native Voice
                    </button>
                    <button
                      onClick={() => applySettings('gemini', null)}
                      style={{ flex: 1, padding: "12px", borderRadius: "12px", background: voiceMode === 'gemini' ? theme.accent : theme.sub, border: `1px solid ${voiceMode === 'gemini' ? theme.accent : theme.border}`, color: voiceMode === 'gemini' ? "white" : theme.text, fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                    >
                      TTS Model
                    </button>
                  </div>
                </div>

                {/* Theme Mode Toggle */}
                <div>
                  <p style={{ margin: "0 0 12px", fontSize: "11px", color: theme.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.5px" }}>Visual Interface Mode</p>
                  <div style={{ display: "flex", gap: "10px" }}>
                    {[
                      { id: 'dark', icon: '🌙', label: 'DARK' },
                      { id: 'light', icon: '☀️', label: 'LIGHT' }
                    ].map(m => (
                      <button 
                        key={m.id}
                        onClick={() => setThemeMode(m.id)}
                        style={{ flex: 1, padding: "12px", borderRadius: "12px", background: themeMode === m.id ? theme.accent : theme.sub, border: `1px solid ${themeMode === m.id ? theme.accent : theme.border}`, color: themeMode === m.id ? "white" : theme.text, fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                      >
                        <span style={{ fontSize: "16px" }}>{m.icon}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p style={{ margin: "0 0 6px", fontSize: "11px", color: theme.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.5px" }}>Neural Processing Unit</p>
                  <p style={{ margin: "0 0 12px", fontSize: "10px", color: theme.muted, opacity: 0.6 }}>Select the Gemini model for text generation</p>
                  <select
                    value={textModel}
                    onChange={e => applySettings(null, e.target.value)}
                    style={{ width: "100%", padding: "14px", borderRadius: "12px", background: theme.sub, color: theme.text, border: `2px solid ${theme.accent}`, fontSize: "13px", outline: "none", cursor: "pointer", fontFamily: "'Inter', monospace" }}
                  >
                    {/* ── Gemini 3 family ── */}
                    <optgroup label="── Gemini 3 (Latest)">
                      <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
                      <option value="gemini-flash-lite-latest">gemini-flash-lite-latest</option>
                    </optgroup>
                    {/* ── Gemini 2.5 family ── */}
                    <optgroup label="── Gemini 2.5">
                      <option value="gemini-2.5-pro-preview-05-06">gemini-2.5-pro-preview-05-06</option>
                      <option value="gemini-2.5-flash-preview-04-17">gemini-2.5-flash-preview-04-17</option>
                    </optgroup>
                    {/* ── Gemini 2.0 family ── */}
                    <optgroup label="── Gemini 2.0">
                      <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                      <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite</option>
                      <option value="gemini-2.0-flash-thinking-exp">gemini-2.0-flash-thinking-exp</option>
                    </optgroup>
                    {/* ── Gemini 1.5 family ── */}
                    <optgroup label="── Gemini 1.5">
                      <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                      <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                      <option value="gemini-1.5-flash-8b">gemini-1.5-flash-8b</option>
                    </optgroup>
                  </select>
                  <p style={{ margin: "8px 0 0", fontSize: "10px", color: theme.muted, opacity: 0.55, fontFamily: "monospace" }}>Active: {textModel}</p>
                </div>

                <div>
                  <p style={{ margin: "0 0 6px", fontSize: "11px", color: theme.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.5px" }}>Transcription Engine</p>
                  <p style={{ margin: "0 0 12px", fontSize: "10px", color: theme.muted, opacity: 0.6 }}>Gemini model used for multilingual voice-to-text</p>
                  <select
                    value={sttModel}
                    onChange={e => setSttModel(e.target.value)}
                    style={{ width: "100%", padding: "14px", borderRadius: "12px", background: theme.sub, color: theme.text, border: `2px solid ${theme.border}`, fontSize: "13px", outline: "none", cursor: "pointer" }}
                  >
                    <option value="gemini-2.0-flash">gemini-2.0-flash (Fastest)</option>
                    <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite</option>
                    <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                    <option value="gemini-flash-lite-latest">gemini-flash-lite-latest</option>
                  </select>
                </div>

                {voiceMode === 'browser' && (
                  <div>
                    <p style={{ margin: "0 0 12px", fontSize: "11px", color: theme.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.5px" }}>Timbre Selection</p>
                    <select
                      value={selectedVoiceURI}
                      onChange={(e) => setSelectedVoiceURI(e.target.value)}
                      style={{ width: "100%", padding: "14px", borderRadius: "12px", background: theme.sub, color: theme.text, border: `2px solid ${theme.border}`, fontSize: "13px", outline: "none" }}
                    >
                      {availableVoices.map(v => (
                        <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* STT Language Selector */}
                <div>
                  <p style={{ margin: "0 0 12px", fontSize: "11px", color: theme.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.5px" }}>Voice Input Language</p>
                  <select
                    value={sttLang}
                    onChange={e => setSttLang(e.target.value)}
                    style={{ width: "100%", padding: "14px", borderRadius: "12px", background: theme.sub, color: theme.text, border: `2px solid ${theme.border}`, fontSize: "13px", outline: "none", cursor: "pointer" }}
                  >
                    <option value="auto">🤖 Auto — Urdu + English (Recommended)</option>
                    <option value="en-US">🇺🇸 English (US)</option>
                    <option value="en-GB">🇬🇧 English (UK)</option>
                    <option value="en-PK">🇵🇰 English (Pakistan)</option>
                    <option value="ur-PK">🇵🇰 اردو — Urdu (Pakistan)</option>
                    <option value="hi-IN">🇮🇳 हिन्दी — Hindi</option>
                    <option value="ar-SA">🇸🇦 عربي — Arabic</option>
                  </select>
                  <p style={{ margin: "8px 0 0", fontSize: "10px", color: theme.muted, opacity: 0.65 }}>Mic language for speech recognition</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
