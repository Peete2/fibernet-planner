import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { nodes, applications } = await req.json();

    const systemPrompt = `You are a telecom network planning AI for Econet Telecom Lesotho (ETL). 
You analyze fiber network Access Points (APs) and customer demand data to suggest optimal locations for new APs.

Rules:
- Lesotho coordinates: latitude ~-29 to -30.5, longitude ~27 to 30
- Consider existing AP locations and their capacity utilization
- Focus on areas with high application density but no nearby AP
- Suggest locations at least 2km apart from existing APs
- Provide practical reasoning for each suggestion
- Return exactly 3 suggestions

Return JSON using the tool provided.`;

    const userPrompt = `Here are the current Access Points:
${JSON.stringify(nodes.map((n: any) => ({
  name: n.name, lat: n.latitude, lng: n.longitude, 
  capacity: n.capacity, connected: n.connected_customers, status: n.status
})), null, 2)}

Here are recent applications (showing demand):
${JSON.stringify(applications.filter((a: any) => a.latitude && a.longitude).map((a: any) => ({
  district: a.district, lat: a.latitude, lng: a.longitude, location: a.location
})), null, 2)}

Analyze the demand patterns and existing AP coverage. Suggest 3 optimal locations for new Access Points.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_ap_locations",
              description: "Return 3 suggested Access Point locations",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Suggested AP name" },
                        latitude: { type: "number" },
                        longitude: { type: "number" },
                        recommended_capacity: { type: "number", description: "Suggested capacity" },
                        reason: { type: "string", description: "Why this location" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                      },
                      required: ["name", "latitude", "longitude", "recommended_capacity", "reason", "priority"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_ap_locations" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("No tool call response from AI");
  } catch (e) {
    console.error("suggest-ap error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
