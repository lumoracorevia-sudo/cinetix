"use client";
import { useState, useRef, useEffect } from "react";

const WHOP_LINK = "https://whop.com/checkout/plan_6DI7c8zrq2Kj1";

const ONBOARDING = [
  {
    question: "What type of content are you making?",
    key: "contentType",
    options: ["Faceless YouTube", "Faceless TikTok", "Both"],
  },
  {
    question: "What niche are you in?",
    key: "niche",
    options: ["Motivation / Mindset", "Finance / Business", "Facts / History", "Reddit Stories", "Product Reviews", "Other"],
  },
  {
    question: "How often do you post?",
    key: "frequency",
    options: ["Just starting out", "1-3 times a week", "Daily"],
  },
];

export default function Home() {
  const [stage, setStage] = useState("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [onboardStep, setOnboardStep] = useState(0);
  const [onboardAnswers, setOnboardAnswers] = useState({});
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageSpeed, setImageSpeed] = useState(3);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSignup() {
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) {
      setError("Enter a valid email and password (6+ characters)");
      return;
    }
    setStage("loading");
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok && data.error !== "already_exists") {
        setError(data.message || "Something went wrong");
        setStage("signup");
        return;
      }
      setStage("onboarding");
    } catch (e) {
      setError("Could not reach the server");
      setStage("signup");
    }
  }

  function handleOnboardAnswer(key, value) {
    const updated = { ...onboardAnswers, [key]: value };
    setOnboardAnswers(updated);
    if (onboardStep < ONBOARDING.length - 1) {
      setOnboardStep(onboardStep + 1);
    } else {
      setStage("app");
      setMessages([{
        role: "assistant",
        content: `Hey${name ? " " + name : ""}! 👋 I'm Cinetix — your AI video director.\n\nDescribe your video idea and I'll write you:\n• The full script\n• Camera & visual directions\n• The exact image prompts you need (based on your image switch speed)\n\nWhat's your video idea?`,
      }]);
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: input.trim(),
          email,
          imageSpeed,
          wantImagePrompts: true,
        }),
      });
      const data = await res.json();

      if (res.status === 429) {
        setMessages((prev) => [...prev, {
          role: "paywall",
          content: "",
        }]);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        }]);
        setLoading(false);
        return;
      }

      const reply = `🎬 CAMERA & VISUAL DIRECTIONS\n${data.visualFrame}\n\n🎙️ SCRIPT\n${data.audioScript}${data.imagePrompts && data.imagePrompts.length > 0 ? `\n\n🖼️ IMAGE PROMPTS (${data.imagePrompts.length} images — 1 every ${imageSpeed} seconds)\n${data.imagePrompts.map((p, i) => `${i + 1}. ${p}`).join("\n")}` : ""}`;

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Could not reach the server. Please try again.",
      }]);
    }
    setLoading(false);
  }

  const s = {
    wrap: { background: "#000", minHeight: "100vh", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", display: "flex", flexDirection: "column" },
    card: { background: "#1C1C1E", border: "1px solid #2C2C2E", borderRadius: 16, padding: 24 },
    input: { width: "100%", boxSizing: "border-box", background: "#000", border: "1px solid #2C2C2E", borderRadius: 12, color: "#fff", padding: 12, fontSize: 15, marginBottom: 10, outline: "none" },
    btn: { width: "100%", background: "#5E5CE6", color: "#fff", border: "none", borderRadius: 12, padding: 13, fontSize: 15, fontWeight: 600, cursor: "pointer" },
    optionBtn: { width: "100%", background: "#1C1C1E", border: "1px solid #2C2C2E", borderRadius: 12, color: "#fff", padding: 14, fontSize: 15, cursor: "pointer", marginBottom: 10, textAlign: "left" },
  };

  if (stage === "signup") return (
    <div style={{ ...s.wrap, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <p style={{ fontWeight: 700, fontSize: 24, textAlign: "center", margin: "0 0 4px" }}>Cinetix</p>
        <p style={{ color: "#8E8E93", fontSize: 14, textAlign: "center", margin: "0 0 24px" }}>AI video director for faceless creators</p>
        <div style={s.card}>
          <p style={{ fontWeight: 600, fontSize: 16, margin: "0 0 16px" }}>Create your account</p>
          <input style={s.input} type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          <input style={s.input} type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input style={{ ...s.input, marginBottom: 16 }} type="password" placeholder="Password (6+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button style={s.btn} onClick={handleSignup}>Create account</button>
          {error && <p style={{ color: "#E24B4A", fontSize: 13, marginTop: 10, textAlign: "center" }}>{error}</p>}
        </div>
      </div>
    </div>
  );

  if (stage === "loading") return (
    <div style={{ ...s.wrap, alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "90%", maxWidth: 400, ...s.card, position: "relative", overflow: "hidden", minHeight: 120 }}>
        <div style={{ position: "absolute", top: 0, left: 0, height: 2, width: "35%", background: "#5E5CE6", borderRadius: 2, animation: "sweep 1.4s ease-in-out infinite" }} />
        <p style={{ color: "#8E8E93", fontSize: 14, textAlign: "center", marginTop: 40 }}>Setting up your account...</p>
      </div>
      <style>{`@keyframes sweep{0%{left:0%}50%{left:65%}100%{left:0%}}`}</style>
    </div>
  );

  if (stage === "onboarding") {
    const step = ONBOARDING[onboardStep];
    return (
      <div style={{ ...s.wrap, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <p style={{ color: "#8E8E93", fontSize: 13, marginBottom: 8 }}>Step {onboardStep + 1} of {ONBOARDING.length}</p>
          <div style={{ height: 3, background: "#1C1C1E", borderRadius: 4, marginBottom: 24 }}>
            <div style={{ height: 3, width: `${((onboardStep + 1) / ONBOARDING.length) * 100}%`, background: "#5E5CE6", borderRadius: 4, transition: "width 0.3s" }} />
          </div>
          <p style={{ fontWeight: 600, fontSize: 18, margin: "0 0 20px" }}>{step.question}</p>
          {step.options.map((opt) => (
            <button key={opt} style={s.optionBtn} onClick={() => handleOnboardAnswer(step.key, opt)}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #1C1C1E", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 17 }}>Cinetix</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#8E8E93", fontSize: 12 }}>Image every</span>
          {[2, 3, 5].map((s2) => (
            <button key={s2} onClick={() => setImageSpeed(s2)} style={{ background: imageSpeed === s2 ? "#5E5CE6" : "#1C1C1E", border: "1px solid #2C2C2E", color: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>{s2}s</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 20, display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.role === "paywall" ? (
              <div style={{ background: "#1C1C1E", border: "1px solid #2C2C2E", borderRadius: 16, padding: 20, maxWidth: 320, textAlign: "center" }}>
                <p style={{ fontWeight: 600, fontSize: 16, margin: "0 0 6px" }}>Uncap your video creation</p>
                <p style={{ color: "#8E8E93", fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>You've used your 2 free generations today. Get 10 days of unlimited access.</p>
                <div style={{ background: "#000", borderRadius: 12, padding: 12, marginBottom: 14 }}>
                  <p style={{ fontSize: 13, margin: "0 0 4px" }}>10-day premium pass</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: "#0A84FF", margin: 0 }}>$2.00 <span style={{ fontSize: 12, color: "#8E8E93", fontWeight: 400 }}>one-time</span></p>
                </div>
                <a href={WHOP_LINK} target="_blank" rel="noreferrer" style={{ display: "block", background: "#0A84FF", color: "#fff", borderRadius: 12, padding: 12, fontSize: 14, fontWeight: 600, textDecoration: "none", marginBottom: 10 }}>Get premium pass</a>
                <button onClick={() => setMessages((prev) => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#8E8E93", fontSize: 12, cursor: "pointer" }}>Dismiss</button>
              </div>
            ) : (
              <div style={{ maxWidth: "85%", background: msg.role === "user" ? "#5E5CE6" : "#1C1C1E", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "12px 16px" }}>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", color: "#fff" }}>{msg.content}</p>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 6, padding: "12px 16px", background: "#1C1C1E", borderRadius: "18px 18px 18px 4px", width: "fit-content", marginBottom: 20 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#8E8E93", animation: "bounce 1.2s ease-in-out infinite" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#8E8E93", animation: "bounce 1.2s ease-in-out 0.2s infinite" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#8E8E93", animation: "bounce 1.2s ease-in-out 0.4s infinite" }} />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "12px 16px", borderTop: "1px solid #1C1C1E" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "#1C1C1E", borderRadius: 20, padding: "8px 8px 8px 16px", border: "1px solid #2C2C2E" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Describe your video idea..."
            rows={1}
            style={{ flex: 1, background: "none", border: "none", color: "#fff", fontSize: 15, outline: "none", resize: "none", fontFamily: "inherit", padding: 0, lineHeight: 1.5 }}
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()} style={{ background: input.trim() ? "#5E5CE6" : "#2C2C2E", border: "none", borderRadius: "50%", width: 34, height: 34, cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        <p style={{ color: "#3A3A3C", fontSize: 11, textAlign: "center", margin: "8px 0 0" }}>Cinetix · AI video director</p>
      </div>
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}} @keyframes sweep{0%{left:0%}50%{left:65%}100%{left:0%}}`}</style>
    </div>
  );
  }
