import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the Econet Telecom Lesotho (ETL) virtual assistant. You help customers with questions about ETL's internet, WiFi, and mobile data services. Be friendly, concise, and helpful. Use Maloti (M) for prices.

Here is the full product catalog you must reference:

## 1. FMC (Fixed-Mobile Convergence) — "Wi-Fi PLUS"
- **Bronze**: M499/mo — 30Mbps down / 20Mbps up, integrated mobile data & voice
- **Silver**: M649/mo — 70Mbps down / 25Mbps up, integrated mobile data & voice
- **Gold**: M899/mo — 90Mbps down / 30Mbps up, up to 300GB FUP, integrated mobile data & voice

## 2. Fixed LTE & LTE Unlimited
- **Always On Combo**: M748/mo — Unlimited LTE + 10GB Mobile Data
- **Unlimited 15Mbps**: M649/mo — 100GB Fair Usage Policy
- **Unlimited 20Mbps**: M899/mo — 200GB Fair Usage Policy
- **Unlimited 40Mbps**: M1,599/mo — 300GB Fair Usage Policy

## 3. Fibre (GPON)
- **Fibre Silver**: M1,599/mo — 90Mbps down / 30Mbps up (requires fibre coverage)
- **Top-Up Bundles**: 75GB (M870), 100GB (M1,080), 150GB (M1,240)
- Note: Fibre is only available in areas with ETL fibre nodes. Check the Coverage page.

## 4. FWA (Fixed Wireless Access) / Limited Wi-Fi
- **Limited Wi-Fi for School**: M129/mo for 40GB
- **LTE Hybrid 10GB**: M50/mo (Student/Teacher)
- **LTE Hybrid 25GB**: M99/mo (Student/Teacher)
- **LTE Hybrid 40GB**: M129/mo (Student/Teacher)
- **LTE Hybrid 80GB**: M249/mo (Student/Teacher)

## School & Education Packages
- **Student SIM Contract (12 months)**: M99/mo for 20GB
- **Teacher SIM Contract (24 months)**: M249/mo for 45GB
- **Laptop Combo**: M908/mo (24 months) — Lenovo laptop + unlimited WiFi

## Mobile Data Bundles (dial *100#)
- Fixed: 10GB M99, 20GB M149, 60GB M399, 200GB M999
- Social Media: Daily M6, Weekly M30, Monthly M100
- Premium: 3GB M70, 7GB M150

## How to Apply
- Through the ETL Subscription Portal (this website) — "Apply" page
- By dialing *100# for mobile bundles

## Important Rules:
1. If the user asks something you don't know or outside ETL services, refer them to WhatsApp support at +266 61000000.
2. Suggest applying through the portal's "Apply" page.
3. Keep responses short. Use bullet points when listing plans.
4. For coverage queries, direct to the Coverage page.
5. For tracking, direct to the Track page.
6. For fibre, explain it requires coverage — check the Coverage page.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please contact support on WhatsApp: +266 61000000" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
