import { supabase } from "../../../lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const { email, password, name, niche } = await req.json();

    if (!email || !password || password.length < 6) {
      return Response.json(
        { error: "invalid_input", message: "Email and a 6+ character password are required" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("user_access")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return Response.json({ error: "already_exists" }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { error } = await supabase.from("user_access").insert({
      email,
      password_hash,
      name: name || null,
      niche: niche || null,
    });

    if (error) {
      return Response.json({ error: "db_error", message: error.message }, { status: 500 });
    }

    return Response.json({ success: true, email });
  } catch (err) {
    return Response.json({ error: "server_error", message: err.message }, { status: 500 });
  }
}
