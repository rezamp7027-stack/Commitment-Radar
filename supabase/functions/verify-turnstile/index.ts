import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGIN = "https://rezamp7027-stack.github.io";
const ALLOWED_HOSTNAME = "rezamp7027-stack.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed." }, 405);
  if (req.headers.get("origin") !== ALLOWED_ORIGIN) return json({ success: false, error: "Origin not allowed." }, 403);

  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return json({ success: false, error: "CAPTCHA verification is not configured on the server yet." }, 503);

  let token = "";
  try {
    const body = await req.json();
    token = typeof body?.token === "string" ? body.token.trim() : "";
  } catch {
    return json({ success: false, error: "Invalid request body." }, 400);
  }
  if (!token || token.length > 2048) return json({ success: false, error: "A valid CAPTCHA token is required." }, 400);

  try {
    const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    if (!verification.ok) return json({ success: false, error: "CAPTCHA verification service is unavailable." }, 502);
    const result = await verification.json();
    if (result.success !== true || result.hostname !== ALLOWED_HOSTNAME) {
      return json({ success: false, error: "CAPTCHA verification failed. Please complete the challenge again." }, 400);
    }
    return json({ success: true });
  } catch {
    return json({ success: false, error: "CAPTCHA verification service is unavailable." }, 502);
  }
});
