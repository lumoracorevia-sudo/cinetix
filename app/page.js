"use client";
import { useState } from "react";

const WHOP_LINK = "https://whop.com/checkout/plan_6DI7c8zrq2Kj1";

export default function Home() {
  const [stage, setStage] = useState("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [niche, setNiche] = useState("");
  const [error, setError] = useState("");
  const [idea, setIdea] = useState("");
  const [genState, setGenState] = useState("idle");
  const [result, setResult] = useState(null);
  const [copyLabel, setCopyLabel] = useState("Copy complete script bundle");

  async function handleSignup() {
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) {
      setError("Enter a valid email and a password (6+ characters)");
      return;
    }
    setStage("loading");
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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

  async function finishOnboarding() {
    await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, niche }),
    }).catch(() => {});
    setStage("app");
  }

  async function generate() {
    if (!idea.trim()) return;
    setGenState("loading");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: idea, email, wantImagePrompts: true }),
      });
      const data = await res.json();
      if (res.status === 429) { setGenState("paywall"); return; }
      if (!res.ok) { setError(data.message || "Generation failed"); setGenState("idle"); return; }
      setResult(data);
      setGenState("result");
    } catch (e) {
      setError("Could not reach the server");
      setGenState("idle");
    }
  }

  function copyAll() {
    if (!result) return;
    const text = `VISUAL FRAME:\n${result.visualFrame}\n\nAUDIO SCRIPT:\n${result.audioScript}\n\nIMAGE PROMPTS:\n${(result.imagePrompts || []).map((p, i) => `${i + 1}. ${p}`).join("\n")}`;
    navigator.clipboard?.writeText(text);
    setCopyLabel("Copied to clipboard");
    setTimeout(() => setCopyLabel("Copy complete script bundle"), 2000);
  }

  const wrap = { background: "#000", minHeight: "100vh", color: "#FFFFFF", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", padding: "24px", maxWidth: 680, margin: "0 auto" };
  const card = { background: "#1C1C1E", border: "1px solid #2C2C2E", borderRadius: 16, padding: 24 };
  const input = { width: "100%", boxSizing: "border-box", background: "#000", border: "1px solid #2C2C2E", borderRadius: 12, color: "#FFFFFF", padding: 12, fontSize: 14, marginBottom: 10 };
  const button = { width: "100%", background: "#5E5CE6", color: "#FFFFFF", border: "none", borderRadius: 12, padding: 12, fontSize: 14, fontWeight: 600, cursor: "pointer" };

  if (stage === "signup") return (
    <div style={wrap}>
      <div style={{ ...card, textAlign: "center", padding: 32 }}>
        <p style={{ fontWeight: 600, fontSize: 22, margin: "0 0 6px" }}>Cinetix</p>
        <p style={{ fontWeight: 600, fontSize: 16, margin: "0 0 6px" }}>Create your account</p>
        <p style={{ fontSize: 13, color: "#8E8E93", margin: "0 0 20px" }}>Sign up to start generating video ideas</p>
        <input style={input} type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={{ ...input, marginBottom: 14 }} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button style={button} onClick={handleSignup}>Sign up</button>
        {error && <p style={{ color: "#E24B4A", fontSize: 12, marginTop: 10 }}>{error}</p>}
      </div>
    </div>
  );

  if (stage === "loading") return (
    <div style={wrap}>
      <div style={{ ...card, position: "relative", overflow: "hidden", minHeight: 140 }}>
        <div style={{ position: "absolute", top: 0, left: 0, height: 2, width: "35%", background: "#0A84FF", borderRadius: 2, animation: "sweep 1.4s ease-in-out infinite" }} />
        <p style={{ color: "#8E8E93", fontSize: 13, textAlign: "center", marginTop: 50 }}>Setting up your account...</p>
      </div>
      <style>{`@keyframes sweep { 0%{left:0%} 50%{left:65%} 100%{left:0%} }`}</style>
    </div>
  );

  if (stage === "onboarding") return (
    <div style={wrap}>
      <div style={{ ...card, padding: 32 }}>
        <p style={{ fontWeight: 600, fontSize: 18, margin: "0 0 4px" }}>A couple quick things</p>
        <p style={{ fontSize: 13, color: "#8E8E93", margin: "0 0 20px" }}>This helps us tailor your ideas</p>
        <label style={{ fontSize: 13, color: "#8E8E93", display: "block", marginBottom: 6 }}>What should we call you?</label>
        <input style={{ ...input, marginBottom: 16 }} type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <label style={{ fontSize: 13, color: "#8E8E93", display: "block", marginBottom: 6 }}>What kind of content are you posting?</label>
        <input style={{ ...input, marginBottom: 20 }} type="text" placeholder="e.g. faceless motivation, product reviews" value={niche} onChange={(e) => setNiche(e.target.value)} />
        <button style={button} onClick={finishOnboarding}>Continue to Cinetix</button>
      </div>
    </div>
  );

  return (
    <div style={wrap}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{name ? `Hey ${name}` : "Cinetix"}</span>
      </div>
      {genState === "idle" && (
        <div style={card}>
          <textarea placeholder="Describe your social video idea in plain english..." value={idea} onChange={(e) => setIdea(e.target.value)} style={{ width: "100%", minHeight: 90, background: "#000", border: "1px solid #2C2C2E", borderRadius: 12, color: "#FFFFFF", padding: 12, fontSize: 14, boxSizing: "border-box", resize: "none" }} />
          <button style={{ ...button, marginTop: 14 }} onClick={generate}>Generate video concept</button>
          {error && <p style={{ color: "#E24B4A", fontSize: 12, marginTop: 10 }}>{error}</p>}
        </div>
      )}
      {genState === "loading" && (
        <div style={{ ...card, position: "relative", overflow: "hidden", minHeight: 140 }}>
          <div style={{ position: "absolute", top: 0, left: 0, height: 2, width: "35%", background: "#0A84FF", borderRadius: 2, animation: "sweep 1.4s ease-in-out infinite" }} />
          <p style={{ color: "#8E8E93", fontSize: 13, textAlign: "center", marginTop: 50 }}>Directing your concept...</p>
          <style>{`@keyframes sweep { 0%{left:0%} 50%{left:65%} 100%{left:0%} }`}</style>
        </div>
      )}
      {genState === "result" && result && (
        <div>
          <button style={{ ...card, width: "100%", padding: 10, fontSize: 13, marginBottom: 12, cursor: "pointer", color: "#FFFFFF" }} onClick={copyAll}>{copyLabel}</button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div style={card}>
              <p style={{ fontFamily: "monospace", textTransform: "uppercase", fontSize: 11, color: "#8E8E93", margin: "0 0 10px" }}>Camera & Visual Actions</p>
              <p style={{ color: "#8E8E93", fontSize: 13, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{result.visualFrame}</p>
            </div>
            <div style={card}>
              <p style={{ fontFamily: "monospace", textTransform: "uppercase", fontSize: 11, color: "#8E8E93", margin: "0 0 10px" }}>Spoken Word Script</p>
              <p style={{ color: "#FFFFFF", fontSize: 13, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{result.audioScript}</p>
            </div>
          </div>
          {result.imagePrompts && result.imagePrompts.length > 0 && (
            <div style={card}>
              <p style={{ fontFamily: "monospace", textTransform: "uppercase", fontSize: 11, color: "#8E8E93", margin: "0 0 10px" }}>Image Prompts ({result.imagePrompts.length})</p>
              <ol style={{ margin: 0, paddingLeft: 18, color: "#FFFFFF", fontSize: 13, lineHeight: 1.8 }}>
                {result.imagePrompts.map((p, i) => <li key={i}>{p}</li>)}
              </ol>
            </div>
          )}
          <button style={{ ...button, marginTop: 12 }} onClick={() => { setGenState("idle"); setIdea(""); setResult(null); }}>Generate another</button>
        </div>
      )}
      {genState === "paywall" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)", borderRadius: 16, padding: 24, minHeight: 300 }}>
          <div style={{ ...card, maxWidth: 340, textAlign: "center" }}>
            <p style={{ fontSize: 18, fontWeight: 600, margin: "14px 0 6px" }}>Uncap your video creation</p>
            <p style={{ fontSize: 13, color: "#8E8E93", lineHeight: 1.5, margin: "0 0 18px" }}>You've reached today's free allowance. Get premium access to unlock unlimited generations.</p>
            <div style={{ background: "#000", border: "1px solid #2C2C2E", borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <p style={{ fontSize: 13, color: "#FFFFFF", margin: "0 0 4px" }}>10-day kinetic premium pass</p>
              <p style={{ fontSize: 20, fontWeight: 600, color: "#0A84FF", margin: 0 }}>$2.00 <span style={{ fontSize: 12, color: "#8E8E93", fontWeight: 400 }}>one-time</span></p>
            </div>
            <a href={WHOP_LINK} target="_blank" rel="noreferrer"><button style={{ ...button, background: "#0A84FF", marginBottom: 10 }}>Get premium pass</button></a>
            <button style={{ background: "none", border: "none", color: "#8E8E93", fontSize: 12, cursor: "pointer" }} onClick={() => setGenState("idle")}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}
