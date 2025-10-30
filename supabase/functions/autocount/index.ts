// supabase/functions/autocount/index.ts
// Edge Function that proxies AutoCount requests to a YOLOv8n detector hosted on Hugging Face.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...headers,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers,
    });
  }

  const imageDataUrl = body?.imageDataUrl;
  const userNotes = body?.notes;
  if (typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
    return new Response(JSON.stringify({ error: "imageDataUrl must be a base64 data URL string" }), {
      status: 400,
      headers,
    });
  }

  const hfApiKey = Deno.env.get("HUGGING_FACE_API_KEY");
  if (!hfApiKey) {
    console.error("Missing HUGGING_FACE_API_KEY");
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers,
    });
  }

  const modelRepo = Deno.env.get("YOLO_MODEL_REPO") ?? "ultralytics/yolov8n";
  const confidenceThreshold = Number(Deno.env.get("YOLO_CONFIDENCE_THRESHOLD") ?? "0.25");

  try {
    const base64Data = imageDataUrl.substring(imageDataUrl.indexOf(",") + 1);
    const binary = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    let width = 1;
    let height = 1;
    try {
      const decodedImage = await Image.decode(binary);
      width = decodedImage.width;
      height = decodedImage.height;
    } catch (decodeError) {
      console.warn("Unable to decode image for dimensions; defaulting to 1x1", decodeError);
    }

    const maxAttempts = 3;
    let inferenceResponse: Response | null = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`https://api-inference.huggingface.co/models/${modelRepo}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfApiKey}`,
          "Content-Type": "application/octet-stream",
          "x-wait-for-model": "true",
        },
        body: binary,
      });

      if (response.status === 503 && attempt < maxAttempts - 1) {
        const delayMs = 1000 * (attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      inferenceResponse = response;
      break;
    }

    if (!inferenceResponse || !inferenceResponse.ok) {
      const errorText = inferenceResponse ? await inferenceResponse.text() : "No response";
      console.error("YOLO inference error", inferenceResponse?.status, errorText);
      return new Response(JSON.stringify({ error: "YOLO inference failed" }), {
        status: 502,
        headers,
      });
    }

    const detections = await inferenceResponse.json();
    if (!Array.isArray(detections)) {
      console.error("Unexpected YOLO payload", detections);
      return new Response(JSON.stringify({ error: "Invalid YOLO response format" }), {
        status: 502,
        headers,
      });
    }

    const items = detections
      .filter((det: any) => typeof det?.score === "number" && det.score >= confidenceThreshold && det?.box)
      .map((det: any, index: number) => {
        const box = det.box ?? {};
        const xmin = typeof box.xmin === "number" ? box.xmin : 0;
        const ymin = typeof box.ymin === "number" ? box.ymin : 0;
        const xmax = typeof box.xmax === "number" ? box.xmax : xmin;
        const ymax = typeof box.ymax === "number" ? box.ymax : ymin;
        const centerX = ((xmin + xmax) / 2) / width;
        const centerY = ((ymin + ymax) / 2) / height;

        return {
          label: String(det?.label ?? index + 1),
          center_x: Math.min(Math.max(centerX, 0), 1),
          center_y: Math.min(Math.max(centerY, 0), 1),
          confidence: Math.min(Math.max(det.score, 0), 1),
          notes: userNotes ?? undefined,
        };
      })
      .map((item, idx) => ({
        ...item,
        label: String(idx + 1),
      }));

    const payload = {
      count: items.length,
      items,
    };

    return new Response(JSON.stringify(payload), { status: 200, headers });
  } catch (err) {
    console.error("AutoCount function failed", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers,
    });
  }
});
