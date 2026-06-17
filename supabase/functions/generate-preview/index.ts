import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type GeneratePreviewBody = {
  requestId: string;
  photoPaths: string[];
  sizeCm?: number;
  notes?: string;
  providerTaskId?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildPreviewPrompt(sizeCm?: number, notes?: string) {
  const requestedSize = sizeCm ? `${sizeCm} cm` : "small collectible size";
  const customerNotes = notes?.trim()
    ? `Customer notes: ${notes.trim()}`
    : "No extra customer notes.";

  return [
    "Create a polished preview image of a custom 3D printed Mini-Me figurine based on the reference photo.",
    `The final physical product should be around ${requestedSize}.`,
    "Show the person as a clean stylized collectible figure, suitable for 3D printing.",
    "Use a solid printable design language: simplified hair, clothes and facial features, rounded edges, no fragile thin details.",
    "The figurine must look manufacturable with FDM or resin printing: stable standing pose, subtle integrated base, clean volumes, no floating parts.",
    "Render as a product preview on a neutral studio background, front 3/4 view, soft lighting, high detail, premium handmade 3D print aesthetic.",
    "Do not include text, logos, watermark, UI, extra people, complex scenery, transparent effects, or unprintable loose accessories.",
    customerNotes,
  ].join(" ");
}

function firstHttpUrl(value: any): string | null {
  if (typeof value === "string") return /^https?:\/\//i.test(value) ? value : null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = firstHttpUrl(item);
      if (url) return url;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;

  const preferredKeys = [
    "preview_image_url",
    "image_url",
    "imageUrl",
    "image_urls",
    "imageUrls",
    "url",
    "urls",
    "output",
    "result",
    "images",
    "data",
  ];

  for (const key of preferredKeys) {
    const url = firstHttpUrl(value[key]);
    if (url) return url;
  }

  for (const item of Object.values(value)) {
    const url = firstHttpUrl(item);
    if (url) return url;
  }

  return null;
}

function pickImageUrl(data: any) {
  return firstHttpUrl(data);
}

function pickTaskId(data: any) {
  if (typeof data?.result === "string") return data.result;
  return data?.id ?? data?.task_id ?? data?.taskId ?? data?.result?.id ?? data?.result?.task_id ?? null;
}

function pickStatus(data: any) {
  return String(data?.status ?? data?.result?.status ?? "").toUpperCase();
}

async function getPreviewTask(apiUrl: string, apiKey: string, taskId: string) {
  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Preview task fetch failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function uploadPreviewImage(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  userId: string,
  requestId: string,
  imageUrl: string,
) {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Could not download generated preview: ${imageResponse.status}`);
  }

  const contentType = imageResponse.headers.get("Content-Type") ?? "image/png";
  const bytes = await imageResponse.arrayBuffer();
  const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
  const path = `${userId}/${requestId}/preview-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType, upsert: true });

  if (uploadError) throw uploadError;

  const { data: signed, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 30);

  if (signedError || !signed?.signedUrl) {
    throw signedError ?? new Error("Could not create preview signed URL");
  }

  return signed.signedUrl;
}

function detectImageFormat(bytes: Uint8Array) {
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

  if (isPng) return "png";
  if (isJpeg) return "jpg";
  return null;
}

async function assertPublicImageUrl(publicUrl: string) {
  const response = await fetch(publicUrl);
  const contentType = response.headers.get("Content-Type") ?? "unknown";
  const bytes = new Uint8Array(await response.arrayBuffer());
  const format = detectImageFormat(bytes);

  if (!response.ok || !format) {
    const sample = new TextDecoder().decode(bytes.slice(0, 120));
    throw new Error(
      `Reference image URL is not returning a valid PNG/JPG. status=${response.status}; contentType=${contentType}; sample=${sample}`,
    );
  }

  console.info("generate-preview reference image validated", {
    host: new URL(publicUrl).host,
    contentType,
    format,
    bytes: bytes.length,
  });
}

async function createReferenceImageUrl(
  supabase: ReturnType<typeof createClient>,
  sourcePath: string,
) {
  const { data } = supabase.storage.from("mini-me-photos").getPublicUrl(sourcePath);
  if (!data?.publicUrl) throw new Error(`Could not create public reference URL for ${sourcePath}`);

  await assertPublicImageUrl(data.publicUrl);

  return data.publicUrl;
}

async function callPreviewProvider(referenceImageUrl: string, prompt: string) {
  const apiUrl =
    Deno.env.get("MESHY_PREVIEW_API_URL") ??
    Deno.env.get("MESHY_IMAGE_API_URL") ??
    Deno.env.get("MESHY_API_URL") ??
    Deno.env.get("MESHY_PREVIEW_ENDPOINT") ??
    Deno.env.get("MESHY_ENDPOINT_URL") ??
    "https://api.meshy.ai/openapi/v1/image-to-image";
  const apiKey = Deno.env.get("MESHY_API_KEY");
  const aiModel = Deno.env.get("MESHY_PREVIEW_MODEL") ?? "nano-banana";

  if (!apiUrl || !apiKey) {
    if (apiUrl && !apiKey) {
      throw new Error("Missing MESHY_API_KEY secret.");
    }

    console.info("generate-preview using fallback: Meshy secrets were not configured");
    return {
      imageUrl: "https://placehold.co/600x600/png",
      source: "fallback",
      raw: null,
    };
  }

  console.info("generate-preview calling preview provider", {
    host: new URL(apiUrl).host,
    hasReferenceImage: Boolean(referenceImageUrl),
    promptLength: prompt.length,
  });

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ai_model: aiModel,
      prompt,
      reference_image_urls: [referenceImageUrl],
    }),
  });

  if (!response.ok) {
    throw new Error(`Preview provider failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const imageUrl = pickImageUrl(data);
  const taskId = pickTaskId(data);

  if (!imageUrl && !taskId) {
    const keys = Object.keys(data ?? {}).join(", ") || "no keys";
    throw new Error(`Preview provider did not return an image URL or task id. Response keys: ${keys}`);
  }

  return {
    imageUrl,
    taskId,
    pending: Boolean(!imageUrl && taskId),
    source: "preview_provider",
    raw: data,
  };
}

async function fetchPreviewProviderTask(taskId: string) {
  const apiUrl =
    Deno.env.get("MESHY_PREVIEW_API_URL") ??
    Deno.env.get("MESHY_IMAGE_API_URL") ??
    Deno.env.get("MESHY_API_URL") ??
    Deno.env.get("MESHY_PREVIEW_ENDPOINT") ??
    Deno.env.get("MESHY_ENDPOINT_URL") ??
    "https://api.meshy.ai/openapi/v1/image-to-image";
  const apiKey = Deno.env.get("MESHY_API_KEY");

  if (!apiKey) throw new Error("Missing MESHY_API_KEY secret.");

  const data = await getPreviewTask(apiUrl, apiKey, taskId);
  const imageUrl = pickImageUrl(data);
  const status = pickStatus(data);

  if (["FAILED", "ERROR"].includes(status)) {
    throw new Error(data?.task_error?.message ?? data?.error ?? "Preview generation failed");
  }

  return {
    imageUrl,
    taskId,
    pending: !imageUrl,
    status: status || "PENDING",
    source: "preview_provider",
    raw: data,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ success: false, error: "Unauthorized" }, 401);

    const { requestId, photoPaths, sizeCm, notes, providerTaskId } = (await req.json()) as GeneratePreviewBody;
    if (!requestId || !Array.isArray(photoPaths) || photoPaths.length === 0) {
      return json({ success: false, error: "Invalid input" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const previewBucket = Deno.env.get("PREVIEW_BUCKET") ?? "mini-me-photos";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: auth } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return json({ success: false, error: "Unauthorized" }, 401);

    if (!photoPaths[0].startsWith(`${userData.user.id}/`)) {
      return json({ success: false, error: "Photo path does not belong to the authenticated user" }, 403);
    }

    const { data: requestRow, error: requestError } = await supabase
      .from("mini_me_requests")
      .select("id,user_id,preview_image_url")
      .eq("id", requestId)
      .maybeSingle();

    if (requestError) {
      console.warn("generate-preview request lookup failed", {
        requestId,
        userId: userData.user.id,
        code: requestError.code,
        message: requestError.message,
      });
    }

    if (requestRow && requestRow.user_id !== userData.user.id) {
      return json({ success: false, error: "Mini-Me request does not belong to the authenticated user" }, 403);
    }

    const prompt = buildPreviewPrompt(sizeCm, notes);
    const existingTaskId = providerTaskId ?? null;

    let generated;
    if (existingTaskId) {
      generated = await fetchPreviewProviderTask(existingTaskId);
    } else {
      const referenceUrl = await createReferenceImageUrl(supabase, photoPaths[0]);

      generated = await callPreviewProvider(referenceUrl, prompt);
    }

    if (generated.pending || !generated.imageUrl) {
      const taskId = generated.taskId ?? existingTaskId;

      const { error: pendingUpdateError } = await supabase
        .from("mini_me_requests")
        .update({
          status: "processing",
        })
        .eq("id", requestId);

      if (pendingUpdateError) throw pendingUpdateError;

      return json({
        success: true,
        pending: true,
        status: "processing",
        provider_task_id: taskId ?? null,
        message: "Preview generation is still processing. Try refreshing the preview in a moment.",
      });
    }

    let previewImageUrl = generated.imageUrl;
    if (generated.source !== "fallback") {
      previewImageUrl = await uploadPreviewImage(
        supabase,
        previewBucket,
        userData.user.id,
        requestId,
        generated.imageUrl,
      );
    }

    const { error: updateError } = await supabase
      .from("mini_me_requests")
      .update({
        status: "preview_ready",
        preview_image_url: previewImageUrl,
      })
      .eq("id", requestId);

    if (updateError) throw updateError;

    return json({
      success: true,
      preview_image_url: previewImageUrl,
      provider_image_url: generated.imageUrl,
      provider_task_id: generated.taskId ?? null,
      storage_bucket: generated.source === "fallback" ? null : previewBucket,
      prompt,
      source: generated.source,
      message: "ok",
    });
  } catch (e) {
    console.error("generate-preview failed", e);
    return json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      500,
    );
  }
});
