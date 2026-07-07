import { supabase } from "../../../lib/supabase";

const FREE_DAILY_LIMIT = 100;

const SYSTEM_PROMPT = `You are an aggressive, high-retention video marketing director for faceless YouTube and TikTok channels.
You are forbidden from writing conversational paragraphs, introductions, or explanations.
Respond ONLY in this exact format, nothing else:

===VISUAL_FRAME===
<framing choices, lighting notes, b-roll cuts, performance directions>
===AUDIO_SCRIPT===
<raw script, dynamic hooks, word-for-word dialogue, punchy sentences>`;

export async function POST(req) {
  try {
    const { prompt, email, imageSpeed, wantImagePrompts } = await req.json();

    await supabase.from("prompt_logs").insert({ email, prompt }).catch(() => {});
      return Response.json({ error: "missing_fields", message: "prompt and email are required" }, { status: 400 });
    }

    const { data: userRow } = await supabase
      .from("user_access")
      .select("has_premium_pass, pass_expires_at")
      .eq("email", email)
      .maybeSingle();

    const hasPremium = userRow?.has_premium_pass && userRow.pass_expires_at && new Date(userRow.pass_expires_at) > new Date();

    if (!hasPremium) {
      const today = new Date().toISOString().slice(0, 10);

      const { data: trackerRow } = await supabase
        .from("free_daily_tracker")
        .select("id, hit_counter")
        .eq("email", email)
        .eq("log_date", today)
        .maybeSingle();

      const currentCount = trackerRow?.hit_counter ?? 0;

      if (currentCount >= FREE_DAILY_LIMIT) {
        return Response.json({ error: "limit_reached", message: "Daily free allowance used" }, { status: 429 });
      }

      if (trackerRow) {
        await supabase.from("free_daily_tracker").update({ hit_counter: currentCount + 1 }).eq("id", trackerRow.id);
      } else {
        await supabase.from("free_daily_tracker").insert({ email, log_date: today, hit_counter: 1 });
      }
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return Response.json({ error: "upstream_error", message: errText }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const visualFrame = rawText.split("===AUDIO_SCRIPT===")[0].replace("===VISUAL_FRAME===", "").trim();
    const audioScript = rawText.split("===AUDIO_SCRIPT===")[1]?.trim() ?? "";

    let imagePrompts = null;

    if (wantImagePrompts && audioScript) {
      const speed = imageSpeed || 3;
      const wordsPerSecond = 2.5;
      const words = audioScript.split(/\s+/).filter(Boolean);
      const wordsPerImage = Math.round(wordsPerSecond * speed);
      const chunks = [];

      for (let i = 0; i < words.length; i += wordsPerImage) {
        chunks.push(words.slice(i, i + wordsPerImage).join(" "));
      }

      const imagePromptRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: `You write short, concrete image-generation prompts for a faceless video editor. You receive a numbered list of script chunks, one per scene. Respond with ONLY a numbered list, one image prompt per chunk, same count and same order as given, no extra text, no introduction. Each prompt must describe exactly one visual scene that matches its chunk.` }],
            },
            contents: [{ role: "user", parts: [{ text: chunks.map((c, i) => `${i + 1}. ${c}`).join("\n") }] }],
          }),
        }
      );

      if (imagePromptRes.ok) {
        const imgData = await imagePromptRes.json();
        const imgText = imgData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        imagePrompts = imgText.split("\n").map((l) => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
      }
    }

    return Response.json({ visualFrame, audioScript, imagePrompts });
  } catch (err) {
    return Response.json({ error: "server_error", message: err.message }, { status: 500 });
  }
      }
