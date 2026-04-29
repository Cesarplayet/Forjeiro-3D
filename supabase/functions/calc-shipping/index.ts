import { corsHeaders } from "@supabase/supabase-js/cors";

// Lovable Cloud edge function: shipping fee calculator.
// Currently returns a simple fallback by region prefix of CEP.
// To use real Melhor Envio / Correios, add MELHOR_ENVIO_TOKEN secret and replace the fallback block.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { cep, weight_g = 200 } = await req.json();
    const clean = String(cep || "").replace(/\D/g, "");
    if (clean.length !== 8) {
      return new Response(JSON.stringify({ error: "Invalid CEP" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = Deno.env.get("MELHOR_ENVIO_TOKEN");
    if (token) {
      // TODO: real API call. For now still fallback.
    }

    // Fallback by region (first digit of CEP)
    const region = parseInt(clean[0], 10);
    const baseByRegion: Record<number, number> = { 0: 18, 1: 18, 2: 22, 3: 22, 4: 28, 5: 32, 6: 38, 7: 35, 8: 30, 9: 30 };
    const fee = (baseByRegion[region] ?? 25) + Math.ceil(weight_g / 500) * 4;
    const estimate = region <= 1 ? "3-5 dias úteis" : "5-9 dias úteis";

    return new Response(JSON.stringify({ fee, estimate, source: "fallback" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});