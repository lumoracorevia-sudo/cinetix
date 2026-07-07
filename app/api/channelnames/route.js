import { supabase } from "../../../lib/supabase";

export async function POST(req) {
  try {
    const { description, refine } = await req.json();

    if (!description) {
      return Response.json({ error: "missing_fields", message: "description is required" }, { status: 400 });
    }

    const prompt = refine
      ? `You previously suggested channel names for this niche: "${description}". The user wants you to: "${refine}". Give 8 completely new channel name suggestions following the same rules.`
      : `Generate 8 unique YouTube/TikTok channel name ideas for someone who wants to: "${description}". For each name provide: the channel name, the handle (e.g. @channelname), and one short sentence explaining why it works. Format each one exactly like this and nothing else:
NAME: [channel name]
HANDLE: @[handle]
WHY: [one sentence explanation]
---`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: "You are an expert YouTube and TikTok channel branding specialist. You create short, memorable, brandable channel names for faceless content creators. Names must be unique, easy to remember, and work as social media handles. Never use generic words like 'official' or 'TV'. Never add explanations outside the requested format." }],
          },
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

    const blocks = rawText.split("---").map((b) => b.trim()).filter(Boolean);
    const names = blocks.map((block) => {
      const nameMatch = block.match(/NAME:\s*(.+)/);
      const handleMatch = block.match(/HANDLE:\s*(.+)/);
      const whyMatch = block.match(/WHY:\s*(.+)/);
      return {
        name: nameMatch?.[1]?.trim() ?? "",
        handle: handleMatch?.[1]?.trim() ?? "",
        why: whyMatch?.[1]?.trim() ?? "",
      };
    }).filter((n) => n.name);

    return Response.json({ names });
  } catch (err) {
    return Response.json({ error: "server_error", message: err.message }, { status: 500 });
  }
        }
