// import { corsHeaders } from "@supabase/supabase-js/cors";
// import { createClient } from "jsr:@supabase/supabase-js@2";

// // Generates a Mini-Me 3D model preview from uploaded photos.
// // Currently: returns the first photo as the preview (no real 3D generation).
// // To enable real photo->3D, add MESHY_API_KEY (or TRIPO_API_KEY) and call their API here.

// Deno.serve(async (req) => {
//   if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

//   try {
//     const auth = req.headers.get("Authorization");
//     if (!auth) {
//       return new Response(JSON.stringify({ error: "Unauthorized" }), {
//         status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
//       });
//     }

//     const { requestId, photoPaths } = await req.json();
//     if (!requestId || !Array.isArray(photoPaths) || photoPaths.length === 0) {
//       return new Response(JSON.stringify({ error: "Invalid input" }), {
//         status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
//       });
//     }

//     const supabase = createClient(
//       Deno.env.get("SUPABASE_URL")!,
//       Deno.env.get("SUPABASE_ANON_KEY")!,
//       { global: { headers: { Authorization: auth } } }
//     );

//     // Sign a URL for the first uploaded photo so the client can preview it
//     const { data: signed } = await supabase.storage
//       .from("mini-me-photos")
//       .createSignedUrl(photoPaths[0], 60 * 60 * 24 * 30);

//     const meshyKey = Deno.env.get("MESHY_API_KEY");
//     if (meshyKey) {
//       // TODO: integrate Meshy/Tripo photo-to-3D pipeline.
//     }

//     return new Response(JSON.stringify({
//       preview_image_url: signed?.signedUrl ?? null,
//       model_url: null,
//       source: "fallback",
//     }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
//   } catch (e) {
//     return new Response(JSON.stringify({ error: String(e) }), {
//       status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
//     });
//   }
// });