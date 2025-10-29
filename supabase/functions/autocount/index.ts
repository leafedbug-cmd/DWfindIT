// supabase/functions/autocount/index.ts
// Edge Function that proxies AutoCount requests to OpenAI gpt-4.1 for high-accuracy vision counting.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

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
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY");
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers,
    });
  }

  const prompt = [
    "You are AutoCount, an expert at identifying and counting individual hardware parts such as bolts, screws, washers and similar objects in small tabletop photos.",
    "You are given a cropped image that focuses on the parts of interest.",
    "Return a strict JSON object with the total count and each item annotated with a numeric label and its position.",
    "Positions should represent the item's center point as fractional coordinates between 0 and 1 relative to the provided image width and height.",
    "Always order labels from left-to-right and then top-to-bottom.",
    "Ignore shadows, marks, or non-part objects. Only count tangible, distinct parts.",
    userNotes ? `Operator notes: ${userNotes}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const responseFormat = {
    type: "json_schema",
    json_schema: {
      name: "autocount_response",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          count: { type: "integer", minimum: 0 },
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["label", "center_x", "center_y"],
              properties: {
                label: { type: "string" },
                center_x: { type: "number", minimum: 0, maximum: 1 },
                center_y: { type: "number", minimum: 0, maximum: 1 },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                notes: { type: "string" },
              },
            },
          },
        },
        required: ["count", "items"],
      },
      strict: true,
    },
  };

  try {
    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: "Only respond with valid JSON that matches the provided schema.",
              },
            ],
          },
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              { type: "input_image", image_url: imageDataUrl },
            ],
          },
        ],
        response_format: responseFormat,
      }),
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      console.error("OpenAI API error", openAiResponse.status, errorText);
      return new Response(JSON.stringify({ error: "OpenAI request failed" }), {
        status: 502,
        headers,
      });
    }

    const openAiPayload = await openAiResponse.json();
    const raw =
      openAiPayload?.output_text ??
      openAiPayload?.output?.[0]?.content?.[0]?.text ??
      openAiPayload?.choices?.[0]?.message?.content;

    if (typeof raw !== "string") {
      console.error("Unexpected OpenAI payload shape", openAiPayload);
      return new Response(JSON.stringify({ error: "Invalid OpenAI response format" }), {
        status: 502,
        headers,
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseError) {
      console.error("Failed to parse OpenAI JSON", parseError, raw);
      return new Response(JSON.stringify({ error: "OpenAI response parse error" }), {
        status: 502,
        headers,
      });
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("AutoCount function failed", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers,
    });
  }
});
