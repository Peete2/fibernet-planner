import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { to, customerName, refCode, oldStatus, newStatus, service } = await req.json();
    if (!to || !refCode || !newStatus) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured — email not sent");
      return new Response(JSON.stringify({ ok: false, skipped: "no_api_key" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = `ETL Application ${refCode} — ${newStatus}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
        <h2 style="color:#1f2c5e;margin:0 0 8px">Econet Telecom Lesotho</h2>
        <p>Hi ${customerName || "there"},</p>
        <p>Your application <strong>${refCode}</strong>${service ? ` for <strong>${service}</strong>` : ""} status has been updated:</p>
        <p style="font-size:16px"><span style="color:#888">${oldStatus || "—"}</span> → <strong style="color:#1f2c5e">${newStatus}</strong></p>
        <p>Track your application anytime on the ETL portal using your reference code.</p>
        <p style="color:#888;font-size:12px;margin-top:32px">If you have questions, reach us on WhatsApp: +266 61000000</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ETL Portal <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("Resend error:", res.status, t);
      return new Response(JSON.stringify({ ok: false, error: t }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-status-email error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});