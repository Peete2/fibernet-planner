import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the Econet Telecom Lesotho (ETL) virtual assistant. You help customers with questions about ETL's internet, WiFi, and mobile data services. Be friendly, concise, and helpful. Use Maloti (M) for prices.

Here is the full product catalog you must reference:

## WiFi PLUS (Shared Home & Mobile)
- **Gold Package**: M899/mo — Up to 90Mbps down / 30Mbps up
- **Silver Package**: M649/mo — Up to 70Mbps down / 25Mbps up
- **Bronze Package**: M499/mo — Up to 30Mbps down / 20Mbps up
- **Family Add-on**: +M50/mo — 5 SIMs with 5GB data and 180 minutes each

## Unlimited WiFi (Fibre, 5G & Fixed LTE)
- **Unlimited Home**: M649/mo — Standard high-speed unlimited
- **5G Unlimited**: M749/mo — Ultra-fast wireless
- **Prepaid WiFi**: M499/mo — No contract, pay-as-you-go
- **Business Unlimited**: M1599+/mo — Tailored for SMEs

## School & Education Packages
- **Limited WiFi For School**: M129/mo for 40GB
- **Student SIM Contract (12 months)**: M99/mo for 20GB
- **Teacher SIM Contract (24 months)**: M249/mo for 45GB
- **Laptop Combo**: M908/mo (24 months) — Lenovo laptop + unlimited WiFi

## Limited & Mobile Data Bundles
### Fixed Internet (Limited):
- 10GB — M99
- 20GB — M149
- 60GB — M399
- 200GB — M999

### Social Media Bundles:
- Daily: 500MB + 500MB Sasai — M6
- Weekly: 3.5GB + 3.5GB Sasai — M30
- Monthly: 15GB + 15GB Sasai — M100

### Premium Data Bundles:
- 3GB (1GB/day for 3 days) — M70
- 7GB (1GB/day for 7 days) — M150

## How to Apply
- Through the ETL Subscription Portal (this website)
- By dialing *100# for mobile bundles

## Important Rules:
1. If the user asks something you don't know or that's outside ETL services, politely say you're not sure and refer them to WhatsApp support at +266 61000000.
2. Always suggest the user can apply through the portal by visiting the "Apply" page.
3. Keep responses short and helpful. Use bullet points when listing plans.
4. If asked about coverage, direct them to the Coverage page on this portal.
5. If asked about tracking applications, tell them to use the Track page.`;

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
