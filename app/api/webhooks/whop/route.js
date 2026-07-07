import { supabase } from "../../../../lib/supabase";
import crypto from "crypto";

const PASS_DURATION_MS = 10 * 24 * 60 * 60 * 1000;

function verifySignature(rawBody, signatureHeader) {
  if (!signatureHeader || !process.env.WHOP_WEBHOOK_SECRET) return false;
  const expected = crypto.createHmac("sha256", process.env.WHOP_WEBHOOK_SECRET).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

export async function POST(req) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-whop-signature");

  if (!verifySignature(rawBody, signature)) {
    return Response.json({ error: "invalid_signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const eventType = payload?.type;

  if (eventType !== "membership.created" && eventType !== "payment.succeeded") {
    return Response.json({ received: true });
  }

  const email = payload?.data?.email ?? payload?.data?.user?.email;

  if (!email) {
    return Response.json({ error: "no_email_in_payload" }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + PASS_DURATION_MS).toISOString();

  const { error } = await supabase
    .from("user_access")
    .update({ has_premium_pass: true, pass_expires_at: expiresAt })
    .eq("email", email);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ received: true, upgraded: email });
}
