export async function POST(req) {
  try {
    const { prompt, email, imageSpeed, wantImagePrompts } = await req.json();
    if (!prompt || !email) return Response.json({ error: "missing_fields" }, { status: 400 });

    const SYSTEM_PROMPT = `You are an aggressive, high-retention video marketing director for faceless YouTube and TikTok channels.
You are forbidden from writing conversational paragraphs, introductions, or explanations.
Respond ONLY in this exact format, nothing else:

===VISUAL_FRAME===
<framing choices, lighting notes, b-roll cuts, performance directions>
===AUDIO_SCRIPT===
<raw script, dynamic hooks, word-for-word dialogue, punchy sentences>`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        max_tokens: 2000,
        temperature: 0.8,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return Response.json({ error: "upstream_error", message: errText }, { status: 502 });
    }

    const groqData = await groqRes.json();
    const rawText = groqData?.choices?.[0]?.message?.content ?? "";
    const visualFrame = rawText.split("===AUDIO_SCRIPT===")[0].replace("===VISUAL_FRAME===", "").trim();
    const audioScript = rawText.split("===AUDIO_SCRIPT===")[1]?.trim() ?? "";

    let imagePrompts = null;
    if (wantImagePrompts && audioScript) {
      const speed = imageSpeed || 3;
      const words = audioScript.split(/\s+/).filter(Boolean);
      const wordsPerImage = Math.round(2.5 * speed);
      const chunks = [];
      for (let i = 0; i < words.length; i += wordsPerImage) {
        chunks.push(words.slice(i, i + wordsPerImage).join(" "));
      }
      const imgRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "You write short concrete image-generation prompts for a faceless video editor. Respond with ONLY a numbered list, one image prompt per chunk, same count and order as given, no extra text." },
            { role: "user", content: chunks.map((c, i) => `${i + 1}. ${c}`).join("\n") },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });
      if (imgRes.ok) {
        const imgData = await imgRes.json();
        const imgText = imgData?.choices?.[0]?.message?.content ?? "";
        imagePrompts = imgText.split("\n").map((l) => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
      }
    }

    return Response.json({ visualFrame, audioScript, imagePrompts });
  } catch (err) {
    return Response.json({ error: "server_error", message: err.message }, { status: 500 });
  }
}
